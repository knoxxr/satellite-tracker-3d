import {
  classifySatelliteGroup,
  compactOmmRecord,
  filterSatellitesByCategory,
  isKoreanSatellite,
} from './catalog.js';
import { t } from '../ui/i18n.js';

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours (respecting CelesTrak usage policy)
const CDN_FRESH_MAX_AGE_MS = 12 * 60 * 60 * 1000; // Shared GitHub Actions CDN snapshot (refreshed every 3h)
const COOLDOWN_403_MS = 30 * 60 * 1000; // 30m backoff on HTTP 403
const COOLDOWN_429_MS = 5 * 60 * 1000; // 5m backoff on HTTP 429
const COOLDOWN_STORAGE_KEY = 'orbitpulse_celestrak_cooldown_until_v1';
const IDB_NAME = 'orbitpulse_celestrak_idb_v2';
const IDB_STORE = 'groups';

const GROUP_CONFIG = {
  all: {
    urls: [`${CELESTRAK_BASE}?GROUP=active&FORMAT=json`],
    fallbackList: [
      'stations.json',
      'korea.json',
      'weather.json',
      'gnss.json',
      'science.json',
      'geo.json',
      'comms.json',
      'cubesat.json',
      'starlink.json',
    ],
    autoClassify: true,
    timeoutMs: 18000,
  },
  stations: {
    urls: [`${CELESTRAK_BASE}?GROUP=stations&FORMAT=json`],
    fallback: 'stations.json',
  },
  korea: {
    urls: [
      `${CELESTRAK_BASE}?NAME=KOMPSAT&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=KOREASAT&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=CAS500&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=NEXTSAT&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=NEONSAT&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=STSAT-&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=KITSAT&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=SNUGLITE&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=MIMAN&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=RANDEV&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=GYEONGGI&FORMAT=json`,
      `${CELESTRAK_BASE}?CATNR=36744&FORMAT=json`,
      `${CELESTRAK_BASE}?CATNR=43823&FORMAT=json`,
      `${CELESTRAK_BASE}?CATNR=45246&FORMAT=json`,
    ],
    fallback: 'korea.json',
    filter: isKoreanSatellite,
  },
  weather: {
    urls: [
      `${CELESTRAK_BASE}?GROUP=weather&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=resource&FORMAT=json`,
    ],
    fallback: 'weather.json',
  },
  gnss: {
    urls: [
      `${CELESTRAK_BASE}?GROUP=gps-ops&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=galileo&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=glo-ops&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=beidou&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=sbas&FORMAT=json`,
    ],
    fallback: 'gnss.json',
  },
  gps: {
    urls: [`${CELESTRAK_BASE}?GROUP=gps-ops&FORMAT=json`],
    fallback: 'gps.json',
  },
  science: {
    urls: [`${CELESTRAK_BASE}?GROUP=science&FORMAT=json`],
    fallback: 'science.json',
  },
  geo: {
    urls: [`${CELESTRAK_BASE}?GROUP=geo&FORMAT=json`],
    fallback: 'geo.json',
  },
  starlink: {
    urls: [`${CELESTRAK_BASE}?GROUP=starlink&FORMAT=json`],
    fallback: 'starlink.json',
    timeoutMs: 18000,
  },
  comms: {
    urls: [
      `${CELESTRAK_BASE}?GROUP=oneweb&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=iridium-NEXT&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=globalstar&FORMAT=json`,
    ],
    fallback: 'comms.json',
    timeoutMs: 14000,
  },
  cubesat: {
    urls: [
      `${CELESTRAK_BASE}?GROUP=cubesat&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=amateur&FORMAT=json`,
    ],
    fallback: 'cubesat.json',
  },
  recent: {
    urls: [`${CELESTRAK_BASE}?GROUP=last-30-days&FORMAT=json`],
    fallback: 'stations.json',
  },
};

const memCache = new Map();
const inFlightClient = new Map(); // Singleflight coalescing inside browser tab
const lookupCache = new Map(); // Local cache for individual NORAD / name queries
let masterIndexMap = new Map(); // NORAD ID -> OMM record for O(1) lookups

// Cross-tab BroadcastChannel so multiple open tabs share updates & cooldown without duplicate calls
const syncChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('orbitpulse_data_sync_v1') : null;

if (syncChannel) {
  syncChannel.onmessage = (ev) => {
    const msg = ev.data;
    if (!msg) return;
    if (msg.type === 'cache-updated' && msg.group) {
      // Clear stale in-memory entry so next read pulls fresh IndexedDB entry written by sibling tab
      memCache.delete(msg.group);
    }
  };
}

function getBaseUrl() {
  return import.meta.env.BASE_URL || '/';
}

function getUpstreamCooldownUntil() {
  try {
    return Number(localStorage.getItem(COOLDOWN_STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function setUpstreamCooldown(durationMs) {
  const until = Date.now() + durationMs;
  try {
    const prev = getUpstreamCooldownUntil();
    if (until > prev) {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, String(until));
    }
  } catch {
    // Ignore storage errors
  }
}

function isUpstreamCoolingDown() {
  return Date.now() < getUpstreamCooldownUntil();
}

function indexMasterSatellites(satellites) {
  const map = new Map();
  for (const s of satellites || []) {
    const id = Number(s.NORAD_CAT_ID);
    if (Number.isFinite(id)) map.set(id, s);
  }
  masterIndexMap = map;
}

function openIdb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readCache(groupName, allowStale = false) {
  const inMem = memCache.get(groupName);
  if (inMem && (allowStale || Date.now() - inMem.updatedAt < CACHE_TTL_MS)) {
    return inMem;
  }
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(groupName);
      req.onsuccess = () => {
        const parsed = req.result;
        if (
          parsed &&
          Array.isArray(parsed.satellites) &&
          parsed.satellites.length > 0 &&
          (allowStale || Date.now() - parsed.updatedAt < CACHE_TTL_MS)
        ) {
          memCache.set(groupName, parsed);
          if (groupName === 'all') indexMasterSatellites(parsed.satellites);
          resolve(parsed);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeCache(groupName, entry) {
  memCache.set(groupName, entry);
  if (groupName === 'all') indexMasterSatellites(entry.satellites);
  const db = await openIdb();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(entry, groupName);
    syncChannel?.postMessage({ type: 'cache-updated', group: groupName, updatedAt: entry.updatedAt });
  } catch {
    // Ignore IndexedDB quota errors
  }
}

async function fetchJson(url, timeoutMs = 10000, trackCooldown = false) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      if (trackCooldown) {
        if (res.status === 403) setUpstreamCooldown(COOLDOWN_403_MS);
        else if (res.status === 429) setUpstreamCooldown(COOLDOWN_429_MS);
      }
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const text = (await res.text()).trim();
    if (!text) return null;
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonArray(url, timeoutMs = 10000, trackCooldown = false) {
  const parsed = await fetchJson(url, timeoutMs, trackCooldown);
  return Array.isArray(parsed) ? parsed : [];
}

function dedupeAndTag(records, groupName, filterFn, autoClassify = false) {
  const seen = new Set();
  const output = [];
  for (const rec of records) {
    if (!rec || !rec.NORAD_CAT_ID) continue;
    if (filterFn && !filterFn(rec)) continue;
    const id = Number(rec.NORAD_CAT_ID);
    if (seen.has(id)) continue;
    seen.add(id);
    const taggedGroup = autoClassify ? classifySatelliteGroup(rec) : groupName;
    output.push(compactOmmRecord(rec, taggedGroup));
  }
  return output;
}

async function tryBackendApi(path, timeoutMs = 18000) {
  // Only attempt backend /api/* when running on localhost/custom server (not github.io static host)
  if (window.location.hostname.endsWith('github.io')) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Load the shared CDN snapshot generated by GitHub Actions (public/data/meta.json + active.json).
 * Allows unlimited concurrent visitors on GitHub Pages with ZERO direct CelesTrak API calls.
 */
async function tryCdnSharedSnapshot(existingCached = null, allowStale = false) {
  try {
    const base = getBaseUrl();
    const meta = await fetchJson(`${base}data/meta.json`, 6000, false);
    if (!meta || !Number.isFinite(meta.updatedAt) || Number(meta.count) < 1000) {
      return null;
    }
    const ageMs = Date.now() - meta.updatedAt;
    if (!allowStale && ageMs > CDN_FRESH_MAX_AGE_MS) {
      return null;
    }

    // If our IndexedDB cache already holds this exact (or newer) CDN snapshot, skip downloading active.json!
    if (
      existingCached &&
      existingCached.satellites.length >= 1000 &&
      existingCached.updatedAt >= meta.updatedAt
    ) {
      return existingCached;
    }

    const activeList = await fetchJsonArray(`${base}data/active.json`, 15000, false);
    if (activeList.length < 1000) return null;

    const entry = {
      group: 'all',
      source: 'cdn-snapshot',
      updatedAt: meta.updatedAt,
      count: activeList.length,
      satellites: activeList,
      recentIds: Array.isArray(meta.recentIds) ? meta.recentIds : [],
      brightIds: Array.isArray(meta.brightIds) ? meta.brightIds : [],
    };
    writeCache('all', entry);
    return entry;
  } catch {
    return null;
  }
}

function sliceMasterForGroup(masterEntry, groupName) {
  if (!masterEntry || !Array.isArray(masterEntry.satellites) || masterEntry.satellites.length < 1000) {
    return null;
  }
  const recentIdSet =
    Array.isArray(masterEntry.recentIds) && masterEntry.recentIds.length > 0
      ? new Set(masterEntry.recentIds)
      : null;
  const brightIdSet =
    Array.isArray(masterEntry.brightIds) && masterEntry.brightIds.length > 0
      ? new Set(masterEntry.brightIds)
      : null;
  const sliced = filterSatellitesByCategory(masterEntry.satellites, groupName, {
    recentIdSet,
    brightIdSet,
  });
  if (sliced.length === 0 && !['recent', 'naro', 'heo', 'other'].includes(groupName)) return null;
  return {
    group: groupName,
    source: masterEntry.source,
    updatedAt: masterEntry.updatedAt,
    count: sliced.length,
    satellites: sliced,
  };
}

async function loadBundledFallback(groupName) {
  const config = GROUP_CONFIG[groupName];
  const fallbackFiles = config.fallbackList || [config.fallback];
  const batches = await Promise.allSettled(
    fallbackFiles.map((f) => fetchJsonArray(`${getBaseUrl()}fallback/${f}`, 6000, false))
  );
  const raw = batches
    .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
    .flatMap((r) => r.value);
  const cleaned = dedupeAndTag(raw, groupName, config.filter, Boolean(config.autoClassify));
  const entry = {
    group: groupName,
    source: 'fallback-snapshot',
    updatedAt: Date.now(),
    count: cleaned.length,
    satellites: cleaned,
  };
  if (groupName === 'all') {
    memCache.set('all', entry);
    indexMasterSatellites(cleaned);
  }
  return entry;
}

async function fetchSingleGroupClient(groupName, forceRefresh = false) {
  const config = GROUP_CONFIG[groupName];
  if (!config) {
    // Derived category (visual, naro, earth, heo, other, featured) -> slice from master 'all'
    const master = await fetchSingleGroupClient('all', forceRefresh);
    return sliceMasterForGroup(master, groupName) || master;
  }

  // 1. If master 'all' is already cached, slice sub-groups instantaneously (ZERO API calls!)
  if (groupName !== 'all' && !forceRefresh) {
    const master = await readCache('all', true);
    const sliced = sliceMasterForGroup(master, groupName);
    if (sliced) return sliced;
  }

  // 2. Singleflight coalescing inside the browser tab
  const flightKey = `${groupName}:${forceRefresh ? '1' : '0'}`;
  if (inFlightClient.has(flightKey)) {
    return inFlightClient.get(flightKey);
  }

  const promise = (async () => {
    const existing = await readCache(groupName, true);

    // 3. For 'all' (master catalog), prefer shared CDN snapshot first so concurrent visitors never hit CelesTrak
    if (groupName === 'all') {
      if (!forceRefresh && existing && Date.now() - existing.updatedAt < CACHE_TTL_MS && existing.satellites.length >= 1000) {
        return existing;
      }

      const cdnEntry = await tryCdnSharedSnapshot(existing, false);
      if (cdnEntry) return cdnEntry;

      // Respect CelesTrak 2-hour cooldown: never hammer CelesTrak on forceRefresh or after a 403/429
      const withinLocalFresh =
        existing && existing.satellites.length >= 1000 && Date.now() - existing.updatedAt < CACHE_TTL_MS;
      if (withinLocalFresh || isUpstreamCoolingDown()) {
        if (existing && existing.satellites.length >= 1000) return existing;
        const staleCdn = await tryCdnSharedSnapshot(null, true);
        if (staleCdn) return staleCdn;
        return loadBundledFallback('all');
      }
    } else if (!forceRefresh && existing && Date.now() - existing.updatedAt < CACHE_TTL_MS) {
      return existing;
    }

    // If upstream is cooling down, skip direct CelesTrak call completely
    if (isUpstreamCoolingDown()) {
      if (existing) return existing;
      return loadBundledFallback(groupName);
    }

    try {
      const settled = await Promise.allSettled(
        config.urls.map((u) => fetchJsonArray(u, config.timeoutMs || 9000, true))
      );
      if (groupName === 'all' && (settled[0]?.status !== 'fulfilled' || settled[0].value.length < 1000)) {
        throw new Error('Primary GROUP=active unavailable or rate-limited');
      }
      const merged = settled
        .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
        .flatMap((r) => r.value);
      if (!merged.length) throw new Error('Empty response from CelesTrak');

      // Merge bundled historical Korean sats (KITSAT 1-3, COMS-1) into master catalog
      if (groupName === 'all') {
        const koreaBundled = await fetchJsonArray(`${getBaseUrl()}fallback/korea.json`, 4000, false).catch(() => []);
        if (koreaBundled.length) merged.push(...koreaBundled);
      }

      const cleaned = dedupeAndTag(merged, groupName, config.filter, Boolean(config.autoClassify));
      const entry = {
        group: groupName,
        source: 'celestrak-live',
        updatedAt: Date.now(),
        count: cleaned.length,
        satellites: cleaned,
      };
      writeCache(groupName, entry);
      return entry;
    } catch {
      // Never cascade into 26 parallel CelesTrak sub-requests on 403!
      if (existing && existing.satellites.length >= (groupName === 'all' ? 1000 : 1)) {
        return existing;
      }
      if (groupName === 'all') {
        const staleCdn = await tryCdnSharedSnapshot(null, true);
        if (staleCdn) return staleCdn;
      }
      return loadBundledFallback(groupName);
    }
  })().finally(() => {
    inFlightClient.delete(flightKey);
  });

  inFlightClient.set(flightKey, promise);
  return promise;
}

/**
 * Fetch satellites for a category.
 * Order: (1) Backend shared server cache (/api/*) if present,
 * (2) Master catalog local slicing (0 API calls),
 * (3) Shared CDN snapshot (/data/active.json — 0 CelesTrak calls for unlimited concurrent users),
 * (4) Singleflight CelesTrak live fetch with 403/429 cooldown protection & bundled fallback.
 */
export async function fetchSatelliteGroup(groupName, forceRefresh = false) {
  // Fast path: if master 'all' is already in memory (from backend or CDN), slice sub-groups locally!
  if (groupName !== 'all' && !forceRefresh) {
    const inMemMaster = memCache.get('all');
    const sliced = sliceMasterForGroup(inMemMaster, groupName);
    if (sliced) return sliced;
  }

  const apiPayload = await tryBackendApi(
    `/api/satellites?group=${encodeURIComponent(groupName)}${forceRefresh ? '&refresh=1' : ''}`
  );
  if (apiPayload && Array.isArray(apiPayload.satellites)) {
    if (groupName === 'all' && apiPayload.satellites.length >= 1000) {
      memCache.set('all', apiPayload);
      indexMasterSatellites(apiPayload.satellites);
    }
    return apiPayload;
  }

  const MASTER_DERIVED_GROUPS = new Set(['featured', 'visual', 'naro', 'earth', 'heo', 'other']);
  if (MASTER_DERIVED_GROUPS.has(groupName)) {
    const master = await fetchSingleGroupClient('all', forceRefresh);
    const sliced = sliceMasterForGroup(master, groupName);
    if (sliced) return sliced;
  }

  return fetchSingleGroupClient(groupName, forceRefresh);
}

/**
 * Lookup a single satellite by NORAD Catalog Number.
 * Checks master catalog & local cache first (0 API calls for any active satellite).
 */
export async function fetchSatelliteByNoradId(noradId) {
  const clean = String(noradId).replace(/\D/g, '');
  if (!clean) throw new Error(t('errInvalidNorad'));
  const numId = Number(clean);

  // 1. O(1) master catalog hit (0 API calls)
  if (masterIndexMap.has(numId)) {
    return masterIndexMap.get(numId);
  }
  const cacheKey = `norad:${clean}`;
  if (lookupCache.has(cacheKey)) {
    return lookupCache.get(cacheKey);
  }

  // 2. Backend shared API (has Singleflight + server cache)
  const apiPayload = await tryBackendApi(`/api/satellite/${clean}`, 9000);
  if (apiPayload && apiPayload.satellite) {
    lookupCache.set(cacheKey, apiPayload.satellite);
    return apiPayload.satellite;
  }

  if (isUpstreamCoolingDown()) {
    throw new Error(t('errCooldown'));
  }

  const list = await fetchJsonArray(`${CELESTRAK_BASE}?CATNR=${clean}&FORMAT=json`, 9000, true);
  if (!list.length) {
    throw new Error(t('errNoradNotFound', { id: clean }));
  }
  const sat = compactOmmRecord(list[0], classifySatelliteGroup(list[0]));
  lookupCache.set(cacheKey, sat);
  return sat;
}

/**
 * Search any free public satellite by name substring.
 * Searches the local 16,900+ master catalog FIRST (0 API calls), falling back to backend/CelesTrak only on miss.
 */
export async function searchSatellitesByName(query) {
  const clean = String(query || '').trim();
  if (clean.length < 2) return [];
  const norm = clean.toUpperCase();

  // 1. Local master catalog search (0 API calls)
  const master = memCache.get('all');
  if (master && master.satellites.length >= 1000) {
    const matches = [];
    for (const s of master.satellites) {
      if (String(s.OBJECT_NAME || '').toUpperCase().includes(norm)) {
        matches.push(s);
        if (matches.length >= 40) break;
      }
    }
    if (matches.length > 0) return matches;
  }

  const cacheKey = `search:${norm}`;
  if (lookupCache.has(cacheKey)) {
    return lookupCache.get(cacheKey);
  }

  // 2. Backend shared API
  const apiPayload = await tryBackendApi(`/api/search?q=${encodeURIComponent(clean)}`, 9000);
  if (apiPayload && Array.isArray(apiPayload.satellites)) {
    lookupCache.set(cacheKey, apiPayload.satellites);
    return apiPayload.satellites;
  }

  if (isUpstreamCoolingDown()) {
    return [];
  }

  const list = await fetchJsonArray(
    `${CELESTRAK_BASE}?NAME=${encodeURIComponent(clean)}&FORMAT=json`,
    9000,
    true
  );
  const res = dedupeAndTag(list.slice(0, 40), 'custom', null, true);
  lookupCache.set(cacheKey, res);
  return res;
}
