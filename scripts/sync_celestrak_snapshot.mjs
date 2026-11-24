#!/usr/bin/env node
/**
 * Build-time / scheduled CDN snapshot generator for OrbitPulse 3D.
 * Fetches CelesTrak GROUP=active, GROUP=last-30-days, GROUP=visual (100 brightest),
 * and static /pub/satcat.csv ONCE during CI, compacts OMM + SATCAT metadata,
 * and writes public/data/active.json + public/data/meta.json
 * so unlimited concurrent visitors load from GitHub Pages CDN with ZERO CelesTrak API calls.
 */
import dns from 'node:dns';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { classifySatelliteGroup, compactOmmRecord } from '../src/orbital/catalog.js';

dns.setDefaultResultOrder('ipv4first');

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const FALLBACK_DIR = path.join(ROOT_DIR, 'public', 'fallback');
const ACTIVE_PATH = path.join(DATA_DIR, 'active.json');
const META_PATH = path.join(DATA_DIR, 'meta.json');

const CELESTRAK_BASE = 'https://celestrak.org/NORAD/elements/gp.php';
const SATCAT_CSV_URL = 'https://celestrak.org/pub/satcat.csv';
const USER_AGENT = 'OrbitPulse-3D-CDN-Snapshot-Sync/2.1 (+https://github.com/knoxxr/satellite-tracker-3d)';
const MIN_AGE_MS = 2 * 60 * 60 * 1000; // Respect CelesTrak 2-hour update cadence
const SCHEMA_VERSION = 2; // v2 includes SATCAT metadata + brightIds
const FORCE = process.argv.includes('--force');

async function fetchTextViaCurl(url, timeoutSec = 60, accept = 'application/json') {
  const { stdout } = await execFileAsync(
    'curl',
    [
      '-4',
      '--compressed',
      '--http2',
      '--location',
      '--silent',
      '--show-error',
      '--fail-with-body',
      '--connect-timeout',
      '15',
      '--max-time',
      String(timeoutSec),
      '-H',
      `User-Agent: ${USER_AGENT}`,
      '-H',
      `Accept: ${accept}`,
      url,
    ],
    { maxBuffer: 48 * 1024 * 1024 }
  );
  return stdout;
}

async function fetchTextViaNode(url, timeoutMs = 45000, accept = 'application/json') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: accept,
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, timeoutSec = 60, accept = 'application/json') {
  try {
    return await fetchTextViaCurl(url, timeoutSec, accept);
  } catch (curlErr) {
    const msg = String(curlErr?.stderr || curlErr?.message || '');
    if (msg.includes('403') || msg.includes('429')) {
      throw new Error(msg.trim());
    }
    console.warn(`[sync] curl fallback to Node fetch (${msg.slice(0, 120)})`);
    return await fetchTextViaNode(url, timeoutSec * 1000, accept);
  }
}

async function fetchJsonArray(url, timeoutSec = 60) {
  const raw = (await fetchText(url, timeoutSec, 'application/json')).trim();
  if (!raw.startsWith('[')) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Parse CelesTrak official SATCAT CSV into a fast Map<noradId, { _ow, _ld, _ls, _st, _rcs }>.
 * Columns: OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE,LAUNCH_SITE,DECAY_DATE,PERIOD,INCLINATION,APOGEE,PERIGEE,RCS,...
 */
function parseSatcatCsv(csvText) {
  const map = new Map();
  if (!csvText) return map;
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return map;

  const header = lines[0].split(',').map((h) => h.trim());
  const idxId = header.indexOf('NORAD_CAT_ID');
  const idxOps = header.indexOf('OPS_STATUS_CODE');
  const idxOwner = header.indexOf('OWNER');
  const idxLaunchDate = header.indexOf('LAUNCH_DATE');
  const idxLaunchSite = header.indexOf('LAUNCH_SITE');
  const idxRcs = header.indexOf('RCS');
  if (idxId < 0) return map;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // Fast split (CelesTrak SATCAT values do not contain quoted commas)
    const cols = line.split(',');
    const id = Number(cols[idxId]);
    if (!Number.isFinite(id)) continue;
    const entry = {};
    const ow = cols[idxOwner]?.trim();
    const ld = cols[idxLaunchDate]?.trim();
    const ls = cols[idxLaunchSite]?.trim();
    const st = cols[idxOps]?.trim();
    const rcsRaw = cols[idxRcs]?.trim();
    if (ow) entry._ow = ow;
    if (ld) entry._ld = ld;
    if (ls) entry._ls = ls;
    if (st) entry._st = st;
    if (rcsRaw) {
      const rcs = Number(rcsRaw);
      if (Number.isFinite(rcs) && rcs > 0) entry._rcs = Math.round(rcs * 10000) / 10000;
    }
    map.set(id, entry);
  }
  return map;
}

async function readExistingMeta() {
  try {
    const [metaRaw, activeStat] = await Promise.all([
      fs.readFile(META_PATH, 'utf8'),
      fs.stat(ACTIVE_PATH),
    ]);
    if (activeStat.size < 10000) return null;
    const meta = JSON.parse(metaRaw);
    if (meta && Number.isFinite(meta.updatedAt) && Number(meta.count) >= 1000) {
      return meta;
    }
  } catch {
    // No existing snapshot
  }
  return null;
}

async function readBundledKoreaFallback() {
  try {
    const raw = await fs.readFile(path.join(FALLBACK_DIR, 'korea.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function atomicWriteJson(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data));
  await fs.rename(tmpPath, filePath);
}

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  const existing = await readExistingMeta();
  if (
    !FORCE &&
    existing &&
    existing.schemaVersion === SCHEMA_VERSION &&
    Date.now() - existing.updatedAt < MIN_AGE_MS &&
    existing.count >= 5000
  ) {
    const ageMin = Math.round((Date.now() - existing.updatedAt) / 60000);
    console.log(
      `[sync] Existing CDN snapshot v${SCHEMA_VERSION} is fresh (${ageMin}m old, ${existing.count} sats). Skipping upstream CelesTrak call.`
    );
    return;
  }

  // 1. Download static SATCAT CSV first (no gp.php cooldown!)
  const tSatcat = Date.now();
  let satcatMap = new Map();
  try {
    const csvText = await fetchText(SATCAT_CSV_URL, 45, 'text/csv');
    satcatMap = parseSatcatCsv(csvText);
    console.log(
      `[sync] SATCAT CSV parsed: ${satcatMap.size.toLocaleString()} catalog entries in ${((Date.now() - tSatcat) / 1000).toFixed(1)}s`
    );
  } catch (err) {
    console.warn(`[sync] SATCAT CSV fetch failed (continuing without enrichment): ${err.message}`);
  }

  // 2. Download GROUP=active
  const t0 = Date.now();
  console.log('[sync] Fetching CelesTrak GROUP=active (IPv4 + HTTP/2 + gzip)...');
  let activeRes = null;
  try {
    activeRes = await fetchJsonArray(`${CELESTRAK_BASE}?GROUP=active&FORMAT=json`, 60);
    console.log(
      `[sync] GROUP=active downloaded: ${activeRes.length} satellites in ${((Date.now() - t0) / 1000).toFixed(1)}s`
    );
  } catch (err) {
    console.warn(`[sync] GROUP=active fetch failed: ${err.message}`);
  }

  if (!Array.isArray(activeRes) || activeRes.length < 1000) {
    if (existing) {
      console.warn(
        `[sync] Upstream unavailable; preserving cached CDN snapshot (${existing.count} sats from ${new Date(existing.updatedAt).toISOString()}).`
      );
      return;
    }
    console.warn('[sync] Upstream unavailable and no prior snapshot cached; build will proceed with bundled fallbacks.');
    return;
  }

  // 3. Download GROUP=last-30-days & GROUP=visual (100 Brightest) sequentially
  let recentRes = [];
  try {
    recentRes = await fetchJsonArray(`${CELESTRAK_BASE}?GROUP=last-30-days&FORMAT=json`, 30);
    console.log(`[sync] GROUP=last-30-days downloaded: ${recentRes.length} satellites`);
  } catch (err) {
    console.warn(`[sync] GROUP=last-30-days fetch skipped: ${err.message}`);
  }

  let visualRes = [];
  try {
    visualRes = await fetchJsonArray(`${CELESTRAK_BASE}?GROUP=visual&FORMAT=json`, 30);
    console.log(`[sync] GROUP=visual (100 brightest) downloaded: ${visualRes.length} satellites`);
  } catch (err) {
    console.warn(`[sync] GROUP=visual fetch skipped: ${err.message}`);
  }

  const koreaFallback = await readBundledKoreaFallback();

  const seen = new Set();
  const compacted = [];
  const groupCounts = {};
  let satcatMatched = 0;

  const pushRecord = (raw) => {
    if (!raw || !raw.NORAD_CAT_ID) return;
    const id = Number(raw.NORAD_CAT_ID);
    if (!Number.isFinite(id) || seen.has(id)) return;
    seen.add(id);
    const sc = satcatMap.get(id);
    if (sc) satcatMatched += 1;
    const merged = sc ? { ...raw, ...sc } : raw;
    const group = classifySatelliteGroup(merged);
    groupCounts[group] = (groupCounts[group] || 0) + 1;
    compacted.push(compactOmmRecord(merged, group));
  };

  for (const item of activeRes) pushRecord(item);
  // Ensure historical Korean satellites (KITSAT 1-3, COMS-1, KOREASAT 1, ARIRANG-1, etc.) are always included
  for (const item of koreaFallback) pushRecord(item);
  // Ensure any visual brightest spacecraft (e.g., bright rocket bodies/stations) are included if missing
  for (const item of visualRes) pushRecord(item);

  const recentIds = Array.isArray(recentRes)
    ? [...new Set(recentRes.map((r) => Number(r?.NORAD_CAT_ID)).filter((id) => Number.isFinite(id) && seen.has(id)))]
    : [];

  const brightIds = Array.isArray(visualRes)
    ? [...new Set(visualRes.map((r) => Number(r?.NORAD_CAT_ID)).filter((id) => Number.isFinite(id) && seen.has(id)))]
    : [];

  const meta = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: Date.now(),
    source: 'cdn-snapshot',
    count: compacted.length,
    satcatMatched,
    recentIds,
    brightIds,
    groupCounts,
  };

  await Promise.all([
    atomicWriteJson(ACTIVE_PATH, compacted),
    atomicWriteJson(META_PATH, meta),
  ]);

  const stat = await fs.stat(ACTIVE_PATH);
  const mb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(
    `[sync] Wrote CDN snapshot v${SCHEMA_VERSION}: ${compacted.length} satellites (${mb} MB raw), SATCAT matched ${satcatMatched}, ${brightIds.length} bright visual, ${recentIds.length} recent launches.`
  );
}

main().catch((err) => {
  console.error('[sync] Non-fatal snapshot sync error:', err.message);
  process.exit(0);
});
