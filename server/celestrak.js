import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifySatelliteGroup,
  compactOmmRecord,
  filterSatellitesByCategory,
  isKoreanSatellite,
} from '../src/orbital/catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_DIR = path.join(__dirname, 'fallback');
const SHARED_DATA_DIR = path.resolve(__dirname, '../public/data');
const DISK_CACHE_DIR = '/tmp/orbitpulse-celestrak-cache';

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours (respecting CelesTrak usage policy)
const FALLBACK_RETRY_MS = 15 * 60 * 1000; // 15 min before retrying upstream when on fallback
const LOOKUP_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min cache for individual NORAD / name searches
const COOLDOWN_403_MS = 30 * 60 * 1000; // 30 min backoff when CelesTrak returns 403 cooldown
const COOLDOWN_429_MS = 5 * 60 * 1000; // 5 min backoff on HTTP 429
const BACKGROUND_SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000 + 5 * 60 * 1000; // 2h 5m

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';

export const GROUP_CONFIG = {
  all: {
    label: '전체 활성 위성 (ALL)',
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
    timeoutMs: 22000,
  },
  stations: {
    label: '우주정거장',
    urls: [`${CELESTRAK_BASE}?GROUP=stations&FORMAT=json`],
    fallback: 'stations.json',
  },
  korea: {
    label: '한국 위성',
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
    label: '기상·지구관측',
    urls: [
      `${CELESTRAK_BASE}?GROUP=weather&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=resource&FORMAT=json`,
    ],
    fallback: 'weather.json',
  },
  gnss: {
    label: '전세계 GNSS',
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
    label: 'GPS/항법',
    urls: [`${CELESTRAK_BASE}?GROUP=gps-ops&FORMAT=json`],
    fallback: 'gps.json',
  },
  science: {
    label: '과학·천문',
    urls: [`${CELESTRAK_BASE}?GROUP=science&FORMAT=json`],
    fallback: 'science.json',
  },
  geo: {
    label: '정지궤도 GEO',
    urls: [`${CELESTRAK_BASE}?GROUP=geo&FORMAT=json`],
    fallback: 'geo.json',
  },
  starlink: {
    label: '스타링크 전체',
    urls: [`${CELESTRAK_BASE}?GROUP=starlink&FORMAT=json`],
    fallback: 'starlink.json',
    timeoutMs: 20000,
  },
  comms: {
    label: 'OneWeb·Iridium',
    urls: [
      `${CELESTRAK_BASE}?GROUP=oneweb&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=iridium-NEXT&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=globalstar&FORMAT=json`,
    ],
    fallback: 'comms.json',
    timeoutMs: 14000,
  },
  cubesat: {
    label: '큐브·아마추어',
    urls: [
      `${CELESTRAK_BASE}?GROUP=cubesat&FORMAT=json`,
      `${CELESTRAK_BASE}?GROUP=amateur&FORMAT=json`,
    ],
    fallback: 'cubesat.json',
  },
  recent: {
    label: '최근 30일 발사',
    urls: [`${CELESTRAK_BASE}?GROUP=last-30-days&FORMAT=json`],
    fallback: 'stations.json',
  },
};

// Shared caches & Singleflight in-flight registries
const memoryCache = new Map(); // groupName -> { source, updatedAt, totalAvailable, satellites, recentIds? }
const masterById = new Map(); // noradId -> satellite (O(1) lookup from master 'all')
const noradCache = new Map(); // cleanId -> { satellite, updatedAt }
const searchCache = new Map(); // normalizedQuery -> { satellites, updatedAt }

const inFlightGroups = new Map(); // groupName -> Promise<entry>
const inFlightNorad = new Map(); // cleanId -> Promise<sat|null>
const inFlightSearch = new Map(); // normalizedQuery -> Promise<sat[]>
const cooldownUntil = new Map(); // key -> timestampMs

let backgroundSyncTimer = null;

// Concurrency & rate-limit protection telemetry
const metrics = {
  upstreamCallsTotal: 0,
  cacheHitsTotal: 0,
  coalescedWaitersTotal: 0,
  slicedFromMasterTotal: 0,
  cooldownSkipsTotal: 0,
};

function isInCooldown(key) {
  const until = cooldownUntil.get(key) || 0;
  return Date.now() < until;
}

function recordHttpStatusCooldown(key, status) {
  if (status === 403) {
    cooldownUntil.set(key, Date.now() + COOLDOWN_403_MS);
  } else if (status === 429) {
    cooldownUntil.set(key, Date.now() + COOLDOWN_429_MS);
  }
}

function updateMasterIndex(satellites) {
  masterById.clear();
  for (const s of satellites) {
    const id = Number(s.NORAD_CAT_ID);
    if (Number.isFinite(id)) masterById.set(id, s);
  }
}

async function fetchJsonArray(url, timeoutMs = 10000, cooldownKey = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  metrics.upstreamCallsTotal += 1;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OrbitPulse-3D-Satellite-Tracker/2.0',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      if (cooldownKey) recordHttpStatusCooldown(cooldownKey, res.status);
      const err = new Error(`HTTP ${res.status} from ${url}`);
      err.status = res.status;
      throw err;
    }
    const text = (await res.text()).trim();
    if (!text.startsWith('[')) {
      return [];
    }
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } finally {
    clearTimeout(timer);
  }
}

async function readFallback(filename) {
  const filePath = path.join(FALLBACK_DIR, filename);
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function readSharedSnapshot() {
  try {
    const [metaRaw, activeRaw] = await Promise.all([
      fs.readFile(path.join(SHARED_DATA_DIR, 'meta.json'), 'utf8'),
      fs.readFile(path.join(SHARED_DATA_DIR, 'active.json'), 'utf8'),
    ]);
    const meta = JSON.parse(metaRaw);
    const satellites = JSON.parse(activeRaw);
    if (Array.isArray(satellites) && satellites.length >= 1000) {
      return {
        source: meta.source || 'cdn-snapshot',
        updatedAt: meta.updatedAt || Date.now(),
        totalAvailable: satellites.length,
        satellites,
        recentIds: Array.isArray(meta.recentIds) ? meta.recentIds : [],
      };
    }
  } catch {
    // No pre-built shared snapshot on disk
  }
  return null;
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
    const tagged = autoClassify ? classifySatelliteGroup(rec) : groupName;
    output.push(compactOmmRecord(rec, tagged));
  }
  return output;
}

async function readDiskCache(groupName, allowStale = false) {
  try {
    const file = path.join(DISK_CACHE_DIR, `${groupName}.json`);
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.satellites) &&
      parsed.satellites.length > 0 &&
      (allowStale || Date.now() - parsed.updatedAt < CACHE_TTL_MS)
    ) {
      return parsed;
    }
  } catch {
    // No disk cache yet
  }
  return null;
}

async function writeDiskCache(groupName, entry) {
  try {
    await fs.mkdir(DISK_CACHE_DIR, { recursive: true });
    const target = path.join(DISK_CACHE_DIR, `${groupName}.json`);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(entry));
    await fs.rename(tmp, target);
  } catch {
    // Non-fatal
  }
}

function isFreshEntry(entry, now = Date.now()) {
  if (!entry || !Array.isArray(entry.satellites) || entry.satellites.length === 0) return false;
  const ttl = entry.source === 'fallback-snapshot' ? FALLBACK_RETRY_MS : CACHE_TTL_MS;
  return now - entry.updatedAt < ttl;
}

function formatGroupResponse(groupName, entry, limit) {
  const list = limit ? entry.satellites.slice(0, limit) : entry.satellites;
  return {
    group: groupName,
    source: entry.source,
    updatedAt: entry.updatedAt,
    count: list.length,
    totalAvailable: entry.totalAvailable || entry.satellites.length,
    satellites: list,
  };
}

/**
 * Attempt to slice any sub-group directly from the cached master 'all' dataset
 * so sub-group switches make ZERO upstream CelesTrak requests.
 */
function trySliceFromMaster(groupName, limit) {
  const master = memoryCache.get('all');
  if (!master || !Array.isArray(master.satellites) || master.satellites.length < 2000) {
    return null;
  }
  // Only slice 'recent' from master if we actually have recentIds recorded
  const recentSet =
    Array.isArray(master.recentIds) && master.recentIds.length > 0
      ? new Set(master.recentIds)
      : null;
  if (groupName === 'recent' && !recentSet && master.satellites.length < 5000) {
    return null;
  }
  const sliced = filterSatellitesByCategory(master.satellites, groupName, recentSet);
  if (sliced.length === 0 && groupName !== 'recent') {
    return null;
  }
  metrics.slicedFromMasterTotal += 1;
  const list = limit ? sliced.slice(0, limit) : sliced;
  return {
    group: groupName,
    source: master.source === 'celestrak-live' ? 'server-cache' : master.source,
    updatedAt: master.updatedAt,
    count: list.length,
    totalAvailable: sliced.length,
    satellites: list,
  };
}

/**
 * Singleflight upstream fetch for a single group.
 * Guarantees at most 1 upstream fetch per group across unlimited concurrent users.
 */
function runSingleflightGroupFetch(groupName, existingStale = null) {
  if (inFlightGroups.has(groupName)) {
    metrics.coalescedWaitersTotal += 1;
    return inFlightGroups.get(groupName);
  }

  const promise = (async () => {
    const config = GROUP_CONFIG[groupName];
    const now = Date.now();

    // Respect upstream cooldown (403/429 backoff) without touching CelesTrak
    if (isInCooldown(groupName)) {
      metrics.cooldownSkipsTotal += 1;
      if (existingStale) return existingStale;
      const diskStale = await readDiskCache(groupName, true);
      if (diskStale) {
        memoryCache.set(groupName, diskStale);
        if (groupName === 'all') updateMasterIndex(diskStale.satellites);
        return diskStale;
      }
      return loadBundledFallbackEntry(groupName);
    }

    try {
      const settled = await Promise.allSettled(
        config.urls.map((u) => fetchJsonArray(u, config.timeoutMs || 10000, groupName))
      );

      if (
        groupName === 'all' &&
        (settled[0]?.status !== 'fulfilled' || settled[0].value.length < 1000)
      ) {
        throw new Error('Primary GROUP=active unavailable or within 2h CelesTrak cooldown');
      }

      const merged = settled
        .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
        .flatMap((r) => r.value);

      if (merged.length === 0) {
        throw new Error('Empty dataset received from CelesTrak');
      }

      // When building master 'all', merge bundled historical Korean sats (KITSAT 1-3, COMS-1)
      if (groupName === 'all') {
        try {
          const koreaBundled = await readFallback('korea.json');
          if (Array.isArray(koreaBundled)) merged.push(...koreaBundled);
        } catch {
          // Optional
        }
      }

      const cleaned = dedupeAndTag(merged, groupName, config.filter, Boolean(config.autoClassify));
      const entry = {
        source: 'celestrak-live',
        updatedAt: now,
        totalAvailable: cleaned.length,
        satellites: cleaned,
      };
      memoryCache.set(groupName, entry);
      if (groupName === 'all') updateMasterIndex(cleaned);
      writeDiskCache(groupName, entry);
      return entry;
    } catch (err) {
      // 1. Reuse stale memory / disk cache if available
      const stale = existingStale || (await readDiskCache(groupName, true));
      if (stale && stale.satellites.length >= (groupName === 'all' ? 1000 : 1)) {
        memoryCache.set(groupName, stale);
        if (groupName === 'all') updateMasterIndex(stale.satellites);
        return stale;
      }

      // 2. For 'all', check pre-built CDN snapshot on disk before touching fallbacks
      if (groupName === 'all') {
        const shared = await readSharedSnapshot();
        if (shared) {
          memoryCache.set('all', shared);
          updateMasterIndex(shared.satellites);
          return shared;
        }
      }

      // 3. Bundled static fallback snapshots (NEVER launch a 26-request CelesTrak storm on 403!)
      const fb = await loadBundledFallbackEntry(groupName, err.message);
      return fb;
    }
  })().finally(() => {
    inFlightGroups.delete(groupName);
  });

  inFlightGroups.set(groupName, promise);
  return promise;
}

async function loadBundledFallbackEntry(groupName, warning = null) {
  const config = GROUP_CONFIG[groupName];
  const files = config.fallbackList || [config.fallback];
  const settled = await Promise.allSettled(files.map((f) => readFallback(f)));
  const fallbackRaw = settled
    .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
    .flatMap((r) => r.value);
  const cleaned = dedupeAndTag(fallbackRaw, groupName, config.filter, Boolean(config.autoClassify));
  const entry = {
    source: 'fallback-snapshot',
    updatedAt: Date.now(),
    totalAvailable: cleaned.length,
    satellites: cleaned,
    ...(warning ? { warning } : {}),
  };
  memoryCache.set(groupName, entry);
  if (groupName === 'all') updateMasterIndex(cleaned);
  return entry;
}

async function hydrateMasterCacheFromDisk() {
  if (memoryCache.has('all')) return memoryCache.get('all');
  const [disk, shared] = await Promise.all([readDiskCache('all', true), readSharedSnapshot()]);
  let best = null;
  if (disk && shared) {
    best = shared.updatedAt >= disk.updatedAt ? shared : disk;
  } else {
    best = shared || disk;
  }
  if (best) {
    memoryCache.set('all', best);
    updateMasterIndex(best.satellites);
  }
  return best;
}

export async function getGroupSatellites(groupName, { forceRefresh = false, limitOverride = null } = {}) {
  const limit = limitOverride ? Math.max(1, Number(limitOverride) || 0) : null;
  const now = Date.now();

  // Ensure master catalog is hydrated from disk / CDN snapshot once
  await hydrateMasterCacheFromDisk();

  // For sub-groups (including 'featured'), slice directly from master 'all' when available -> 0 upstream calls!
  if (groupName !== 'all') {
    const sliced = trySliceFromMaster(groupName, limit);
    if (sliced && (!forceRefresh || isFreshEntry(memoryCache.get('all'), now))) {
      metrics.cacheHitsTotal += 1;
      return sliced;
    }
  }

  if (groupName === 'featured') {
    // If master wasn't populated yet, load 'all' once (single request) and slice featured
    await getGroupSatellites('all', { forceRefresh: false });
    const sliced = trySliceFromMaster('featured', limit);
    if (sliced) return sliced;
  }

  const config = GROUP_CONFIG[groupName];
  if (!config) {
    throw new Error(`Unknown satellite group: ${groupName}`);
  }

  let cached = memoryCache.get(groupName);
  if (!cached) {
    const disk = await readDiskCache(groupName, true);
    if (disk) {
      cached = disk;
      memoryCache.set(groupName, disk);
      if (groupName === 'all') updateMasterIndex(disk.satellites);
    }
  }

  // Enforce server-side minimum refresh interval so ?refresh=1 spam from concurrent users cannot trigger 403
  const fresh = isFreshEntry(cached, now);
  if (fresh) {
    metrics.cacheHitsTotal += 1;
    const resp = formatGroupResponse(groupName, cached, limit);
    if (resp.source === 'celestrak-live') resp.source = 'server-cache';
    return resp;
  }

  // Stale-While-Revalidate: serve stale immediately (<5ms) while refreshing ONCE in background
  if (cached && cached.satellites.length >= (groupName === 'all' ? 1000 : 1)) {
    metrics.cacheHitsTotal += 1;
    if (!isInCooldown(groupName) && !inFlightGroups.has(groupName)) {
      runSingleflightGroupFetch(groupName, cached).catch(() => {});
    }
    const resp = formatGroupResponse(groupName, cached, limit);
    if (resp.source === 'celestrak-live') resp.source = 'server-cache';
    return resp;
  }

  // Cold cache: coalesce all concurrent callers onto 1 singleflight upstream fetch
  const entry = await runSingleflightGroupFetch(groupName, cached);
  return formatGroupResponse(groupName, entry, limit);
}

export async function getSatelliteByNoradId(noradId) {
  const cleanId = String(noradId).replace(/\D/g, '');
  if (!cleanId) {
    throw new Error('Invalid NORAD Catalog ID');
  }
  const numId = Number(cleanId);

  await hydrateMasterCacheFromDisk();

  // 1. O(1) lookup from master catalog (0 upstream calls)
  if (masterById.has(numId)) {
    metrics.cacheHitsTotal += 1;
    return { satellite: masterById.get(numId), fromCache: true };
  }

  // 2. Scan other cached groups
  for (const cached of memoryCache.values()) {
    const found = cached.satellites.find((s) => Number(s.NORAD_CAT_ID) === numId);
    if (found) {
      metrics.cacheHitsTotal += 1;
      return { satellite: found, fromCache: true };
    }
  }

  // 3. Check 30-min NORAD lookup cache
  const prev = noradCache.get(cleanId);
  if (prev && Date.now() - prev.updatedAt < LOOKUP_CACHE_TTL_MS) {
    metrics.cacheHitsTotal += 1;
    return { satellite: prev.satellite, fromCache: true };
  }

  if (isInCooldown('lookup')) {
    metrics.cooldownSkipsTotal += 1;
    return { satellite: null, fromCache: true };
  }

  // 4. Singleflight upstream lookup
  if (inFlightNorad.has(cleanId)) {
    metrics.coalescedWaitersTotal += 1;
    const sat = await inFlightNorad.get(cleanId);
    return { satellite: sat, fromCache: false };
  }

  const promise = (async () => {
    const url = `${CELESTRAK_BASE}?CATNR=${cleanId}&FORMAT=json`;
    const list = await fetchJsonArray(url, 8000, 'lookup');
    const sat = list.length > 0 ? compactOmmRecord(list[0], classifySatelliteGroup(list[0])) : null;
    noradCache.set(cleanId, { satellite: sat, updatedAt: Date.now() });
    if (noradCache.size > 500) {
      const oldestKey = noradCache.keys().next().value;
      noradCache.delete(oldestKey);
    }
    return sat;
  })().finally(() => {
    inFlightNorad.delete(cleanId);
  });

  inFlightNorad.set(cleanId, promise);
  const sat = await promise;
  return { satellite: sat, fromCache: false };
}

export async function searchSatellitesByName(query) {
  const clean = String(query || '').trim();
  if (clean.length < 2) return { satellites: [], fromCache: true };
  const norm = clean.toUpperCase();

  await hydrateMasterCacheFromDisk();

  // 1. Search cached master catalog first -> 0 upstream calls for any active satellite!
  const master = memoryCache.get('all');
  if (master && master.satellites.length >= 2000) {
    const matches = [];
    for (const s of master.satellites) {
      if (String(s.OBJECT_NAME || '').toUpperCase().includes(norm)) {
        matches.push(s);
        if (matches.length >= 40) break;
      }
    }
    if (matches.length > 0) {
      metrics.cacheHitsTotal += 1;
      metrics.slicedFromMasterTotal += 1;
      return { satellites: matches, fromCache: true };
    }
  }

  // 2. Check 30-min search cache
  const prev = searchCache.get(norm);
  if (prev && Date.now() - prev.updatedAt < LOOKUP_CACHE_TTL_MS) {
    metrics.cacheHitsTotal += 1;
    return { satellites: prev.satellites, fromCache: true };
  }

  if (isInCooldown('lookup')) {
    metrics.cooldownSkipsTotal += 1;
    return { satellites: [], fromCache: true };
  }

  // 3. Singleflight upstream search
  if (inFlightSearch.has(norm)) {
    metrics.coalescedWaitersTotal += 1;
    const satellites = await inFlightSearch.get(norm);
    return { satellites, fromCache: false };
  }

  const promise = (async () => {
    const url = `${CELESTRAK_BASE}?NAME=${encodeURIComponent(clean)}&FORMAT=json`;
    const list = await fetchJsonArray(url, 8000, 'lookup');
    const satellites = dedupeAndTag(list.slice(0, 40), 'custom', null, true);
    searchCache.set(norm, { satellites, updatedAt: Date.now() });
    if (searchCache.size > 300) {
      const oldestKey = searchCache.keys().next().value;
      searchCache.delete(oldestKey);
    }
    return satellites;
  })().finally(() => {
    inFlightSearch.delete(norm);
  });

  inFlightSearch.set(norm, promise);
  const satellites = await promise;
  return { satellites, fromCache: false };
}

/**
 * Start a single background timer that pre-warms and periodically refreshes 'all'
 * so user traffic NEVER causes cold-start upstream spikes.
 */
export function startBackgroundSync() {
  if (backgroundSyncTimer) return;
  // Warm master catalog once asynchronously on server boot
  getGroupSatellites('all', { forceRefresh: false }).catch(() => {});
  backgroundSyncTimer = setInterval(() => {
    const cached = memoryCache.get('all');
    if (!isFreshEntry(cached, Date.now()) && !isInCooldown('all')) {
      runSingleflightGroupFetch('all', cached).catch(() => {});
    }
  }, BACKGROUND_SYNC_INTERVAL_MS);
  backgroundSyncTimer.unref?.();
}

export function getCacheHealth() {
  const groups = {};
  const now = Date.now();
  for (const [k, v] of memoryCache.entries()) {
    groups[k] = {
      source: v.source,
      count: v.satellites.length,
      ageSeconds: Math.round((now - v.updatedAt) / 1000),
      fresh: isFreshEntry(v, now),
    };
  }
  const activeCooldowns = {};
  for (const [k, until] of cooldownUntil.entries()) {
    if (until > now) {
      activeCooldowns[k] = Math.round((until - now) / 1000);
    }
  }
  return {
    status: 'ok',
    metrics: {
      ...metrics,
      inFlightGroups: inFlightGroups.size,
      inFlightLookups: inFlightNorad.size + inFlightSearch.size,
    },
    activeCooldowns,
    groups,
  };
}
