import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifySatelliteGroup } from '../src/orbital/catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_DIR = path.join(__dirname, 'fallback');
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours (respecting CelesTrak usage policy)

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';

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

export const GROUP_CONFIG = {
  all: {
    label: '전체 활성 위성 (ALL)',
    urls: [`${CELESTRAK_BASE}?GROUP=active&FORMAT=json`],
    fallbackList: ['stations.json', 'korea.json', 'weather.json', 'gnss.json', 'science.json', 'geo.json', 'comms.json', 'cubesat.json', 'starlink.json'],
    autoClassify: true,
    timeoutMs: 18000,
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
    filter: KOREA_FILTER,
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
    timeoutMs: 18000,
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

const memoryCache = new Map();

async function fetchJsonArray(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OrbitPulse-3D-Satellite-Tracker/2.0',
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

function dedupeAndTag(records, groupName, filterFn, autoClassify = false) {
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
      _group: autoClassify ? classifySatelliteGroup(rec) : groupName,
    });
  }
  return output;
}

const DISK_CACHE_DIR = '/tmp/orbitpulse-celestrak-cache';

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
    await fs.writeFile(path.join(DISK_CACHE_DIR, `${groupName}.json`), JSON.stringify(entry));
  } catch {
    // Non-fatal
  }
}

export async function getGroupSatellites(groupName, { forceRefresh = false, limitOverride = null } = {}) {
  if (groupName === 'featured') {
    const groups = ['stations', 'korea', 'weather', 'gnss', 'science'];
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

  let cached = memoryCache.get(groupName);
  const now = Date.now();
  const limit = limitOverride ? Math.max(1, Number(limitOverride) || 0) : null;

  if (!forceRefresh && (!cached || now - cached.updatedAt >= CACHE_TTL_MS)) {
    const disk = await readDiskCache(groupName, false);
    if (disk) {
      cached = disk;
      memoryCache.set(groupName, disk);
    }
  }

  if (!forceRefresh && cached && now - cached.updatedAt < CACHE_TTL_MS) {
    const list = limit ? cached.satellites.slice(0, limit) : cached.satellites;
    return {
      group: groupName,
      source: cached.source,
      updatedAt: cached.updatedAt,
      count: list.length,
      totalAvailable: cached.totalAvailable,
      satellites: list,
    };
  }

  try {
    const settled = await Promise.allSettled(
      config.urls.map((u) => fetchJsonArray(u, config.timeoutMs || 9000))
    );
    if (groupName === 'all' && (settled[0]?.status !== 'fulfilled' || settled[0].value.length < 1000)) {
      throw new Error('Primary GROUP=active unavailable or within 2h CelesTrak cooldown');
    }
    const merged = settled
      .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
      .flatMap((r) => r.value);
    if (merged.length === 0) {
      throw new Error('Empty dataset received from CelesTrak');
    }
    const cleaned = dedupeAndTag(merged, groupName, config.filter, Boolean(config.autoClassify));
    const entry = {
      source: 'celestrak-live',
      updatedAt: now,
      totalAvailable: merged.length,
      satellites: cleaned,
    };
    memoryCache.set(groupName, entry);
    writeDiskCache(groupName, entry);
    const list = limit ? cleaned.slice(0, limit) : cleaned;
    return {
      group: groupName,
      source: entry.source,
      updatedAt: entry.updatedAt,
      count: list.length,
      totalAvailable: entry.totalAvailable,
      satellites: list,
    };
  } catch (err) {
    // 1. Reuse stale disk/memory cache if available (CelesTrak 403 means data unchanged within 2h)
    const stale = cached || (await readDiskCache(groupName, true));
    if (stale && stale.satellites.length >= (groupName === 'all' ? 1000 : 1)) {
      memoryCache.set(groupName, stale);
      const list = limit ? stale.satellites.slice(0, limit) : stale.satellites;
      return {
        group: groupName,
        source: stale.source,
        updatedAt: stale.updatedAt,
        count: list.length,
        totalAvailable: stale.totalAvailable,
        satellites: list,
      };
    }

    // 2. For 'all', merge all 10 live public subgroups if GROUP=active is in 2h cooldown
    if (groupName === 'all') {
      const subGroups = ['stations', 'korea', 'weather', 'gnss', 'science', 'geo', 'starlink', 'comms', 'cubesat', 'recent'];
      const results = await Promise.allSettled(
        subGroups.map((g) => getGroupSatellites(g, { forceRefresh: false }))
      );
      const seen = new Set();
      const combined = [];
      let liveCount = 0;
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        if (r.value.source === 'celestrak-live') liveCount++;
        for (const sat of r.value.satellites || []) {
          const id = Number(sat.NORAD_CAT_ID);
          if (seen.has(id)) continue;
          seen.add(id);
          combined.push({ ...sat, _group: classifySatelliteGroup(sat) });
        }
      }
      if (combined.length > 0) {
        const entry = {
          source: liveCount > 0 ? 'celestrak-live' : 'fallback-snapshot',
          updatedAt: now,
          totalAvailable: combined.length,
          satellites: combined,
        };
        memoryCache.set('all', entry);
        writeDiskCache('all', entry);
        const list = limit ? combined.slice(0, limit) : combined;
        return {
          group: 'all',
          source: entry.source,
          updatedAt: entry.updatedAt,
          count: list.length,
          totalAvailable: entry.totalAvailable,
          satellites: list,
        };
      }
    }

    // 3. Graceful fallback to bundled snapshot(s)
    try {
      const files = config.fallbackList || [config.fallback];
      const settled = await Promise.allSettled(files.map((f) => readFallback(f)));
      const fallbackRaw = settled
        .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value))
        .flatMap((r) => r.value);
      const cleaned = dedupeAndTag(fallbackRaw, groupName, config.filter, Boolean(config.autoClassify));
      const entry = {
        source: 'fallback-snapshot',
        updatedAt: now,
        totalAvailable: cleaned.length,
        satellites: cleaned,
      };
      memoryCache.set(groupName, entry);
      const list = limit ? cleaned.slice(0, limit) : cleaned;
      return {
        group: groupName,
        source: entry.source,
        updatedAt: entry.updatedAt,
        count: list.length,
        totalAvailable: entry.totalAvailable,
        satellites: list,
        warning: err.message,
      };
    } catch {
      throw err;
    }
  }
}

export async function getSatelliteByNoradId(noradId) {
  const cleanId = String(noradId).replace(/\D/g, '');
  if (!cleanId) {
    throw new Error('Invalid NORAD Catalog ID');
  }

  for (const cached of memoryCache.values()) {
    const found = cached.satellites.find((s) => String(s.NORAD_CAT_ID) === cleanId);
    if (found) return found;
  }

  const url = `${CELESTRAK_BASE}?CATNR=${cleanId}&FORMAT=json`;
  const list = await fetchJsonArray(url, 8000);
  if (list.length === 0) {
    return null;
  }
  return {
    ...list[0],
    _group: classifySatelliteGroup(list[0]),
  };
}

export async function searchSatellitesByName(query) {
  const clean = String(query || '').trim();
  if (clean.length < 2) return [];
  const url = `${CELESTRAK_BASE}?NAME=${encodeURIComponent(clean)}&FORMAT=json`;
  const list = await fetchJsonArray(url, 8000);
  return dedupeAndTag(list.slice(0, 40), 'custom', null, true);
}

export function getCacheHealth() {
  const groups = {};
  for (const [k, v] of memoryCache.entries()) {
    groups[k] = {
      source: v.source,
      count: v.satellites.length,
      ageSeconds: Math.round((Date.now() - v.updatedAt) / 1000),
    };
  }
  return { status: 'ok', groups };
}
