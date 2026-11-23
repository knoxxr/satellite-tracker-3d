const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const CACHE_PREFIX = 'orbitpulse_celestrak_cache_v1_';

const GROUP_CONFIG = {
  stations: {
    urls: [`${CELESTRAK_BASE}?GROUP=stations&FORMAT=json`],
    fallback: 'stations.json',
    limit: 60,
  },
  korea: {
    urls: [
      `${CELESTRAK_BASE}?NAME=KOMPSAT&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=KOREASAT&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=CAS500&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=NEXTSAT&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=NEONSAT&FORMAT=json`,
      `${CELESTRAK_BASE}?NAME=STSAT-&FORMAT=json`,
      `${CELESTRAK_BASE}?CATNR=43823&FORMAT=json`,
      `${CELESTRAK_BASE}?CATNR=45246&FORMAT=json`,
    ],
    fallback: 'korea.json',
    filter: (item) => {
      const id = Number(item.NORAD_CAT_ID);
      if (id === 43823 || id === 45246) return true;
      const name = String(item.OBJECT_NAME || '').toUpperCase();
      if (name.includes('DEB') || name.includes('R/B')) return false;
      return (
        name.includes('KOMPSAT') ||
        name.includes('ARIRANG') ||
        name.includes('KOREASAT') ||
        name.includes('CAS500') ||
        name.includes('NEXTSAT') ||
        name.includes('NEONSAT') ||
        name.includes('GK-2') ||
        name.startsWith('STSAT')
      );
    },
    limit: 60,
  },
  weather: {
    urls: [`${CELESTRAK_BASE}?GROUP=weather&FORMAT=json`],
    fallback: 'weather.json',
    limit: 120,
  },
  gps: {
    urls: [`${CELESTRAK_BASE}?GROUP=gps-ops&FORMAT=json`],
    fallback: 'gps.json',
    limit: 60,
  },
  science: {
    urls: [`${CELESTRAK_BASE}?GROUP=science&FORMAT=json`],
    fallback: 'science.json',
    limit: 80,
  },
  starlink: {
    urls: [`${CELESTRAK_BASE}?GROUP=starlink&FORMAT=json`],
    fallback: 'starlink.json',
    limit: 250,
  },
};

const memCache = new Map();

function getBaseUrl() {
  return import.meta.env.BASE_URL || '/';
}

async function fetchJsonArray(url, timeoutMs = 9000) {
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

function dedupeAndTag(records, groupName, filterFn, limit) {
  const seen = new Set();
  const output = [];
  for (const rec of records) {
    if (!rec || !rec.NORAD_CAT_ID) continue;
    if (filterFn && !filterFn(rec)) continue;
    const id = Number(rec.NORAD_CAT_ID);
    if (seen.has(id)) continue;
    seen.add(id);
    output.push({ ...rec, _group: groupName });
    if (limit && output.length >= limit) break;
  }
  return output;
}

function readLocalCache(groupName) {
  const inMem = memCache.get(groupName);
  if (inMem && Date.now() - inMem.updatedAt < CACHE_TTL_MS) {
    return inMem;
  }
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + groupName);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Date.now() - parsed.updatedAt < CACHE_TTL_MS && Array.isArray(parsed.satellites)) {
      memCache.set(groupName, parsed);
      return parsed;
    }
  } catch {
    // Ignore storage quota or parse errors
  }
  return null;
}

function writeLocalCache(groupName, entry) {
  memCache.set(groupName, entry);
  try {
    // Avoid exceeding localStorage quota for large starlink sets
    if (entry.satellites.length <= 300) {
      localStorage.setItem(CACHE_PREFIX + groupName, JSON.stringify(entry));
    }
  } catch {
    // Ignore storage quota errors
  }
}

async function tryBackendApi(path) {
  // Only attempt backend /api/* when running on localhost/custom server (not github.io static host)
  if (window.location.hostname.endsWith('github.io')) {
    return null;
  }
  try {
    const res = await fetch(path, { headers: { Accept: 'application/json' } });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchSingleGroupClient(groupName, forceRefresh = false) {
  const config = GROUP_CONFIG[groupName];
  if (!config) throw new Error(`Unknown group: ${groupName}`);

  if (!forceRefresh) {
    const cached = readLocalCache(groupName);
    if (cached) return cached;
  }

  try {
    const settled = await Promise.allSettled(config.urls.map((u) => fetchJsonArray(u, 6500)));
    const merged = settled
      .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
      .flatMap((r) => r.value);
    if (!merged.length) throw new Error('Empty response from CelesTrak');
    const cleaned = dedupeAndTag(merged, groupName, config.filter, config.limit);
    const entry = {
      group: groupName,
      source: 'celestrak-live',
      updatedAt: Date.now(),
      count: cleaned.length,
      satellites: cleaned,
    };
    writeLocalCache(groupName, entry);
    return entry;
  } catch {
    // Static fallback snapshot bundled with the app
    const fallbackUrl = `${getBaseUrl()}fallback/${config.fallback}`;
    const raw = await fetchJsonArray(fallbackUrl, 6000);
    const cleaned = dedupeAndTag(raw, groupName, config.filter, config.limit);
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
 * or fetches live CelesTrak OMM JSON directly from browser (CORS-enabled) with static fallback.
 */
export async function fetchSatelliteGroup(groupName, forceRefresh = false) {
  const apiPayload = await tryBackendApi(
    `/api/satellites?group=${encodeURIComponent(groupName)}${forceRefresh ? '&refresh=1' : ''}`
  );
  if (apiPayload && Array.isArray(apiPayload.satellites)) {
    return apiPayload;
  }

  if (groupName === 'featured') {
    const groups = ['stations', 'korea', 'weather', 'gps', 'science'];
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

  const apiPayload = await tryBackendApi(`/api/satellite/${clean}`);
  if (apiPayload && apiPayload.satellite) {
    return apiPayload.satellite;
  }

  const list = await fetchJsonArray(`${CELESTRAK_BASE}?CATNR=${clean}&FORMAT=json`, 9000);
  if (!list.length) {
    throw new Error(`NORAD #${clean} 위성을 찾을 수 없습니다.`);
  }
  return { ...list[0], _group: 'custom' };
}
