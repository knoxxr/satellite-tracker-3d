import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_DIR = path.join(__dirname, 'fallback');
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours (respecting CelesTrak usage policy)

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';

export const GROUP_CONFIG = {
  stations: {
    label: '우주정거장',
    urls: [`${CELESTRAK_BASE}?GROUP=stations&FORMAT=json`],
    fallback: 'stations.json',
    limit: 60,
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
    label: '기상·관측',
    urls: [`${CELESTRAK_BASE}?GROUP=weather&FORMAT=json`],
    fallback: 'weather.json',
    limit: 120,
  },
  gps: {
    label: 'GPS/항법',
    urls: [`${CELESTRAK_BASE}?GROUP=gps-ops&FORMAT=json`],
    fallback: 'gps.json',
    limit: 60,
  },
  science: {
    label: '과학·천문',
    urls: [`${CELESTRAK_BASE}?GROUP=science&FORMAT=json`],
    fallback: 'science.json',
    limit: 80,
  },
  starlink: {
    label: '스타링크',
    urls: [`${CELESTRAK_BASE}?GROUP=starlink&FORMAT=json`],
    fallback: 'starlink.json',
    limit: 250,
  },
};

const memoryCache = new Map();

async function fetchJsonArray(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OrbitPulse-3D-Satellite-Tracker/1.0',
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
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

function dedupeAndTag(records, groupName, filterFn, limit) {
  const seen = new Set();
  const output = [];
  for (const rec of records) {
    if (!rec || !rec.NORAD_CAT_ID) continue;
    if (filterFn && !filterFn(rec)) continue;
    const id = Number(rec.NORAD_CAT_ID);
    if (seen.has(id)) continue;
    seen.add(id);
    output.push({
      ...rec,
      _group: groupName,
    });
    if (limit && output.length >= limit) break;
  }
  return output;
}

export async function getGroupSatellites(groupName, { forceRefresh = false, limitOverride = null } = {}) {
  if (groupName === 'featured') {
    const groups = ['stations', 'korea', 'weather', 'gps', 'science'];
    const results = await Promise.all(
      groups.map((g) => getGroupSatellites(g, { forceRefresh }))
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

  const config = GROUP_CONFIG[groupName];
  if (!config) {
    throw new Error(`Unknown satellite group: ${groupName}`);
  }

  const cached = memoryCache.get(groupName);
  const now = Date.now();
  const limit = limitOverride ? Math.min(Number(limitOverride) || config.limit, 1000) : config.limit;

  if (!forceRefresh && cached && now - cached.updatedAt < CACHE_TTL_MS) {
    return {
      group: groupName,
      source: cached.source,
      updatedAt: cached.updatedAt,
      count: Math.min(cached.satellites.length, limit),
      totalAvailable: cached.totalAvailable,
      satellites: cached.satellites.slice(0, limit),
    };
  }

  try {
    const settled = await Promise.allSettled(config.urls.map((u) => fetchJsonArray(u, 6500)));
    const merged = settled
      .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
      .flatMap((r) => r.value);
    if (merged.length === 0) {
      throw new Error('Empty dataset received from CelesTrak');
    }
    const maxStore = Math.max(config.limit, 500);
    const cleaned = dedupeAndTag(merged, groupName, config.filter, maxStore);
    const entry = {
      source: 'celestrak-live',
      updatedAt: now,
      totalAvailable: merged.length,
      satellites: cleaned,
    };
    memoryCache.set(groupName, entry);
    return {
      group: groupName,
      source: entry.source,
      updatedAt: entry.updatedAt,
      count: Math.min(cleaned.length, limit),
      totalAvailable: entry.totalAvailable,
      satellites: cleaned.slice(0, limit),
    };
  } catch (err) {
    // Graceful fallback to bundled live snapshot
    try {
      const fallbackRaw = await readFallback(config.fallback);
      const cleaned = dedupeAndTag(fallbackRaw, groupName, config.filter, Math.max(config.limit, 500));
      const entry = {
        source: 'fallback-snapshot',
        updatedAt: now,
        totalAvailable: fallbackRaw.length,
        satellites: cleaned,
        error: err.message,
      };
      memoryCache.set(groupName, entry);
      return {
        group: groupName,
        source: entry.source,
        updatedAt: entry.updatedAt,
        count: Math.min(cleaned.length, limit),
        totalAvailable: entry.totalAvailable,
        satellites: cleaned.slice(0, limit),
      };
    } catch (fallbackErr) {
      throw new Error(`CelesTrak & fallback failed for ${groupName}: ${err.message}`);
    }
  }
}

export async function getSatelliteByNoradId(catnr) {
  const cleanId = String(catnr).replace(/\D/g, '');
  if (!cleanId) {
    throw new Error('Invalid NORAD Catalog ID');
  }
  const url = `${CELESTRAK_BASE}?CATNR=${cleanId}&FORMAT=json`;
  const list = await fetchJsonArray(url, 8000);
  if (!list.length) {
    return null;
  }
  return {
    ...list[0],
    _group: 'custom',
  };
}

export function getCacheHealth() {
  const groups = {};
  for (const [k, v] of memoryCache.entries()) {
    groups[k] = {
      source: v.source,
      count: v.satellites.length,
      updatedAt: v.updatedAt,
    };
  }
  return {
    ok: true,
    timestamp: Date.now(),
    cachedGroups: groups,
  };
}
