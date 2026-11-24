#!/usr/bin/env node
/**
 * Build-time / scheduled CDN snapshot generator for OrbitPulse 3D.
 * Fetches CelesTrak GROUP=active + GROUP=last-30-days ONCE (max 2 requests total),
 * compacts OMM fields, and writes public/data/active.json + public/data/meta.json
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
const USER_AGENT = 'OrbitPulse-3D-CDN-Snapshot-Sync/2.0 (+https://github.com/knoxxr/satellite-tracker-3d)';
const MIN_AGE_MS = 2 * 60 * 60 * 1000; // Respect CelesTrak 2-hour update cadence
const FORCE = process.argv.includes('--force');

async function fetchJsonViaCurl(url, timeoutSec = 60) {
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
      'Accept: application/json',
      url,
    ],
    { maxBuffer: 32 * 1024 * 1024 }
  );
  const text = stdout.trim();
  if (!text.startsWith('[')) return [];
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [];
}

async function fetchJsonViaNode(url, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }
    const text = (await res.text()).trim();
    if (!text.startsWith('[')) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonArray(url, timeoutSec = 60) {
  try {
    return await fetchJsonViaCurl(url, timeoutSec);
  } catch (curlErr) {
    // If CelesTrak explicitly returned 403/429 via curl, don't retry with fetch
    const msg = String(curlErr?.stderr || curlErr?.message || '');
    if (msg.includes('403') || msg.includes('429')) {
      throw new Error(msg.trim());
    }
    console.warn(`[sync] curl fallback to Node fetch (${msg.slice(0, 120)})`);
    return await fetchJsonViaNode(url, timeoutSec * 1000);
  }
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
  if (!FORCE && existing && Date.now() - existing.updatedAt < MIN_AGE_MS && existing.count >= 5000) {
    const ageMin = Math.round((Date.now() - existing.updatedAt) / 60000);
    console.log(
      `[sync] Existing CDN snapshot is fresh (${ageMin}m old, ${existing.count} sats). Skipping upstream CelesTrak call.`
    );
    return;
  }

  const t0 = Date.now();
  console.log('[sync] Fetching CelesTrak GROUP=active (IPv4 + HTTP/2 + gzip)...');
  let activeRes = null;
  try {
    activeRes = await fetchJsonArray(`${CELESTRAK_BASE}?GROUP=active&FORMAT=json`, 60);
    console.log(`[sync] GROUP=active downloaded: ${activeRes.length} satellites in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
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

  let recentRes = [];
  try {
    recentRes = await fetchJsonArray(`${CELESTRAK_BASE}?GROUP=last-30-days&FORMAT=json`, 30);
    console.log(`[sync] GROUP=last-30-days downloaded: ${recentRes.length} satellites`);
  } catch (err) {
    console.warn(`[sync] GROUP=last-30-days fetch skipped: ${err.message}`);
  }

  const koreaFallback = await readBundledKoreaFallback();

  const seen = new Set();
  const compacted = [];
  const groupCounts = {};

  const pushRecord = (raw) => {
    if (!raw || !raw.NORAD_CAT_ID) return;
    const id = Number(raw.NORAD_CAT_ID);
    if (!Number.isFinite(id) || seen.has(id)) return;
    seen.add(id);
    const group = classifySatelliteGroup(raw);
    groupCounts[group] = (groupCounts[group] || 0) + 1;
    compacted.push(compactOmmRecord(raw, group));
  };

  for (const item of activeRes) pushRecord(item);
  // Ensure historical Korean satellites (e.g. KITSAT 1-3, COMS-1) are always present in master catalog
  for (const item of koreaFallback) pushRecord(item);

  const recentIds = Array.isArray(recentRes)
    ? [...new Set(recentRes.map((r) => Number(r?.NORAD_CAT_ID)).filter((id) => Number.isFinite(id) && seen.has(id)))]
    : [];

  const meta = {
    updatedAt: Date.now(),
    source: 'cdn-snapshot',
    count: compacted.length,
    recentIds,
    groupCounts,
  };

  await Promise.all([
    atomicWriteJson(ACTIVE_PATH, compacted),
    atomicWriteJson(META_PATH, meta),
  ]);

  const stat = await fs.stat(ACTIVE_PATH);
  const mb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(
    `[sync] Wrote CDN snapshot: ${compacted.length} satellites (${mb} MB raw), ${recentIds.length} recent launches.`
  );
}

main().catch((err) => {
  console.error('[sync] Non-fatal snapshot sync error:', err.message);
  process.exit(0);
});
