import { classifySatelliteGroup } from './catalog.js';

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours (respecting CelesTrak usage policy)
const IDB_NAME = 'orbitpulse_celestrak_idb_v2';
const IDB_STORE = 'groups';

const KOREA_FILTER = (item) => {
  const id = Number(item.NORAD_CAT_ID);
  if (id === 36744 || id === 43823 || id === 45246) return true;
  const name = String(item.OBJECT_NAME || '').toUpperCase();
  if (name.includes('DEB') || name.includes('R/B')) return false;
  return (
    name.includes('KOMPSAT') ||
    name.includes('ARIRANG') ||
    name.includes('KOREASAT') ||
    name.includes('CAS500') ||
    name.includes('NEXTSAT') ||
    name.includes('NEONSAT') ||
    name.includes('KITSAT') ||
    name.includes('SNUGLITE') ||
    name.includes('MIMAN') ||
    name.includes('RANDEV') ||
    name.includes('GYEONGGI') ||
    name.includes('GK-2') ||
    name.startsWith('STSAT')
  );
};

const GROUP_CONFIG = {
  all: {
    urls: [`${CELESTRAK_BASE}?GROUP=active&FORMAT=json`],
    fallbackList: ['stations.json', 'korea.json', 'weather.json', 'gnss.json', 'science.json', 'geo.json', 'comms.json', 'cubesat.json', 'starlink.json'],
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
    filter: KOREA_FILTER,
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

function getBaseUrl() {
  return import.meta.env.BASE_URL || '/';
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
  const db = await openIdb();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(entry, groupName);
  } catch {
    // Ignore IndexedDB quota errors
  }
}

async function fetchJsonArray(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    if (!text.startsWith('[')) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } finally {
    clearTimeout(timer);
  }
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
    output.push({ ...rec, _group: taggedGroup });
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

async function mergeLiveGroupsClient(groupIds, autoClassify = true) {
  const results = await Promise.allSettled(
    groupIds.map((g) => fetchSingleGroupClient(g, false))
  );
  const seen = new Set();
  const combined = [];
  let liveCount = 0;
  let latestUpdatedAt = 0;

  for (const r of results) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const res = r.value;
    if (res.source === 'celestrak-live') liveCount++;
    if (res.updatedAt > latestUpdatedAt) latestUpdatedAt = res.updatedAt;
    for (const sat of res.satellites || []) {
      const id = Number(sat.NORAD_CAT_ID);
      if (seen.has(id)) continue;
      seen.add(id);
      combined.push(autoClassify ? { ...sat, _group: classifySatelliteGroup(sat) } : sat);
    }
  }
  return { combined, liveCount, latestUpdatedAt };
}

async function fetchSingleGroupClient(groupName, forceRefresh = false) {
  const config = GROUP_CONFIG[groupName];
  if (!config) throw new Error(`Unknown group: ${groupName}`);

  if (!forceRefresh) {
    const cached = await readCache(groupName, false);
    if (cached) return cached;
  }

  try {
    const settled = await Promise.allSettled(
      config.urls.map((u) => fetchJsonArray(u, config.timeoutMs || 9000))
    );
    // For 'all', primary URL (GROUP=active) must succeed; otherwise fall back to stale cache or merged live groups
    if (groupName === 'all' && (settled[0]?.status !== 'fulfilled' || settled[0].value.length < 1000)) {
      throw new Error('Primary GROUP=active unavailable or rate-limited');
    }
    const merged = settled
      .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
      .flatMap((r) => r.value);
    if (!merged.length) throw new Error('Empty response from CelesTrak');
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
    // 1. Reuse stale IndexedDB cache (CelesTrak 403 means data hasn't changed within 2h)
    const stale = await readCache(groupName, true);
    if (stale && stale.satellites.length >= (groupName === 'all' ? 1000 : 1)) {
      return stale;
    }

    // 2. For 'all', assemble all 10 live public subgroups when GROUP=active hits 2h IP cooldown
    if (groupName === 'all') {
      const { combined, liveCount, latestUpdatedAt } = await mergeLiveGroupsClient(
        ['stations', 'korea', 'weather', 'gnss', 'science', 'geo', 'starlink', 'comms', 'cubesat', 'recent'],
        true
      );
      if (combined.length > 0) {
        const entry = {
          group: 'all',
          source: liveCount > 0 ? 'celestrak-live' : 'fallback-snapshot',
          updatedAt: latestUpdatedAt || Date.now(),
          count: combined.length,
          satellites: combined,
        };
        writeCache('all', entry);
        return entry;
      }
    }

    // 3. Static fallback snapshot bundled with the app
    const fallbackFiles = config.fallbackList || [config.fallback];
    const batches = await Promise.allSettled(
      fallbackFiles.map((f) => fetchJsonArray(`${getBaseUrl()}fallback/${f}`, 6000))
    );
    const raw = batches
      .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
      .flatMap((r) => r.value);
    const cleaned = dedupeAndTag(raw, groupName, config.filter, Boolean(config.autoClassify));
    return {
      group: groupName,
      source: 'fallback-snapshot',
      updatedAt: Date.now(),
      count: cleaned.length,
      satellites: cleaned,
    };
  }
}

/**
 * Fetch satellites for a category. Automatically uses backend /api/* if present,
 * or fetches live CelesTrak OMM JSON directly from browser (CORS-enabled) with IndexedDB cache & fallback.
 */
export async function fetchSatelliteGroup(groupName, forceRefresh = false) {
  const apiPayload = await tryBackendApi(
    `/api/satellites?group=${encodeURIComponent(groupName)}${forceRefresh ? '&refresh=1' : ''}`
  );
  if (apiPayload && Array.isArray(apiPayload.satellites)) {
    return apiPayload;
  }

  if (groupName === 'featured') {
    const groups = ['stations', 'korea', 'weather', 'gnss', 'science'];
    const results = await Promise.all(
      groups.map((g) => fetchSingleGroupClient(g, forceRefresh))
    );
    const seen = new Set();
    const combined = [];
    let liveCount = 0;
    let latestUpdatedAt = 0;

    for (const res of results) {
      if (res.source === 'celestrak-live') liveCount++;
      if (res.updatedAt > latestUpdatedAt) latestUpdatedAt = res.updatedAt;
      for (const sat of res.satellites) {
        if (seen.has(sat.NORAD_CAT_ID)) continue;
        seen.add(sat.NORAD_CAT_ID);
        combined.push(sat);
      }
    }

    return {
      group: 'featured',
      source: liveCount > 0 ? 'celestrak-live' : 'fallback-snapshot',
      updatedAt: latestUpdatedAt || Date.now(),
      count: combined.length,
      satellites: combined,
    };
  }

  return fetchSingleGroupClient(groupName, forceRefresh);
}

/**
 * Lookup a single satellite by NORAD Catalog Number (works both via backend proxy and static GitHub Pages).
 */
export async function fetchSatelliteByNoradId(noradId) {
  const clean = String(noradId).replace(/\D/g, '');
  if (!clean) throw new Error('올바른 숫자 NORAD ID를 입력해 주세요.');

  const apiPayload = await tryBackendApi(`/api/satellite/${clean}`, 9000);
  if (apiPayload && apiPayload.satellite) {
    return apiPayload.satellite;
  }

  const list = await fetchJsonArray(`${CELESTRAK_BASE}?CATNR=${clean}&FORMAT=json`, 9000);
  if (!list.length) {
    throw new Error(`NORAD #${clean} 위성을 찾을 수 없습니다.`);
  }
  return { ...list[0], _group: classifySatelliteGroup(list[0]) };
}

/**
 * Live search any free public satellite in CelesTrak by name substring (returns up to 30 matches).
 */
export async function searchSatellitesByName(query) {
  const clean = String(query || '').trim();
  if (clean.length < 2) return [];

  const apiPayload = await tryBackendApi(`/api/search?q=${encodeURIComponent(clean)}`, 9000);
  if (apiPayload && Array.isArray(apiPayload.satellites)) {
    return apiPayload.satellites;
  }

  const list = await fetchJsonArray(
    `${CELESTRAK_BASE}?NAME=${encodeURIComponent(clean)}&FORMAT=json`,
    9000
  );
  return dedupeAndTag(list.slice(0, 40), 'custom', null, true);
}
