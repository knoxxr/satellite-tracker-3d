import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  getCacheHealth,
  getGroupSatellites,
  getSatelliteByNoradId,
  searchSatellitesByName,
  startBackgroundSync,
} from './celestrak.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');
const PORT = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.glsl': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.czml': 'application/json',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

// Pre-serialized + pre-gzipped HTTP response cache keyed by `${group}:${limit}:${updatedAt}:${count}`
const encodedResponseCache = new Map();
const MAX_ENCODED_CACHE_ENTRIES = 32;

// Sliding-window per-IP rate limiter for upstream-capable lookup/search endpoints
const ipWindowMap = new Map(); // ip -> number[] timestamps
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_LOOKUPS_PER_MIN = 30;

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkLookupRateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const list = (ipWindowMap.get(ip) || []).filter((ts) => ts > cutoff);
  if (list.length >= RATE_MAX_LOOKUPS_PER_MIN) {
    ipWindowMap.set(ip, list);
    const retryAfterSec = Math.max(1, Math.ceil((list[0] + RATE_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSec };
  }
  list.push(now);
  ipWindowMap.set(ip, list);
  if (ipWindowMap.size > 2000) {
    const oldest = ipWindowMap.keys().next().value;
    ipWindowMap.delete(oldest);
  }
  return { allowed: true, retryAfterSec: 0 };
}

function acceptsGzip(req) {
  const ae = String(req.headers['accept-encoding'] || '');
  return ae.includes('gzip');
}

function sendJson(req, res, status, payload, { cacheControl = 'no-cache', etag = null } = {}) {
  if (etag && req.headers['if-none-match'] === etag) {
    res.writeHead(304, {
      ETag: etag,
      'Cache-Control': cacheControl,
      Vary: 'Accept-Encoding',
    });
    res.end();
    return;
  }

  const rawBuf = Buffer.from(JSON.stringify(payload));
  const useGzip = acceptsGzip(req) && rawBuf.length > 1024;
  const body = useGzip ? zlib.gzipSync(rawBuf, { level: 6 }) : rawBuf;

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    Vary: 'Accept-Encoding',
    'Content-Length': String(body.length),
  };
  if (etag) headers.ETag = etag;
  if (useGzip) headers['Content-Encoding'] = 'gzip';

  res.writeHead(status, headers);
  res.end(body);
}

function sendPreEncodedGroup(req, res, group, limit, data) {
  const etag = `W/"${group}-${data.updatedAt || 0}-${data.count || 0}"`;
  const cacheControl = 'public, max-age=300, stale-while-revalidate=7200';

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, {
      ETag: etag,
      'Cache-Control': cacheControl,
      Vary: 'Accept-Encoding',
    });
    res.end();
    return;
  }

  const cacheKey = `${group}:${limit || ''}:${data.updatedAt || 0}:${data.count || 0}`;
  let entry = encodedResponseCache.get(cacheKey);
  if (!entry) {
    const rawBuf = Buffer.from(JSON.stringify(data));
    const gzipBuf = zlib.gzipSync(rawBuf, { level: 6 });
    entry = { rawBuf, gzipBuf, etag };
    encodedResponseCache.set(cacheKey, entry);
    if (encodedResponseCache.size > MAX_ENCODED_CACHE_ENTRIES) {
      const oldestKey = encodedResponseCache.keys().next().value;
      encodedResponseCache.delete(oldestKey);
    }
  }

  const useGzip = acceptsGzip(req);
  const body = useGzip ? entry.gzipBuf : entry.rawBuf;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    ETag: entry.etag,
    Vary: 'Accept-Encoding',
    'Content-Length': String(body.length),
  };
  if (useGzip) headers['Content-Encoding'] = 'gzip';

  res.writeHead(200, headers);
  res.end(body);
}

export async function handleApiRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/health') {
    sendJson(req, res, 200, getCacheHealth(), { cacheControl: 'no-store' });
    return true;
  }

  if (pathname === '/api/satellites') {
    const group = parsedUrl.searchParams.get('group') || 'all';
    const forceRefresh = parsedUrl.searchParams.get('refresh') === '1';
    const limit = parsedUrl.searchParams.get('limit');
    try {
      const data = await getGroupSatellites(group, {
        forceRefresh,
        limitOverride: limit,
      });
      sendPreEncodedGroup(req, res, group, limit, data);
    } catch (err) {
      sendJson(req, res, 400, { error: err.message });
    }
    return true;
  }

  const singleMatch = pathname.match(/^\/api\/satellite\/(\d+)$/);
  if (singleMatch) {
    const rl = checkLookupRateLimit(req);
    if (!rl.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(rl.retryAfterSec),
      });
      res.end(JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }));
      return true;
    }
    try {
      const { satellite, fromCache } = await getSatelliteByNoradId(singleMatch[1]);
      if (!satellite) {
        sendJson(req, res, 404, { error: `NORAD ID ${singleMatch[1]} 위성을 찾을 수 없습니다.` });
      } else {
        sendJson(
          req,
          res,
          200,
          { satellite, source: fromCache ? 'server-cache' : 'celestrak-live' },
          { cacheControl: 'public, max-age=600' }
        );
      }
    } catch (err) {
      sendJson(req, res, 502, { error: err.message });
    }
    return true;
  }

  if (pathname === '/api/search') {
    const rl = checkLookupRateLimit(req);
    if (!rl.allowed) {
      res.writeHead(429, {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(rl.retryAfterSec),
      });
      res.end(JSON.stringify({ error: '검색 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }));
      return true;
    }
    const q = parsedUrl.searchParams.get('q') || '';
    try {
      const { satellites, fromCache } = await searchSatellitesByName(q);
      sendJson(
        req,
        res,
        200,
        { satellites, count: satellites.length, source: fromCache ? 'server-cache' : 'celestrak-live' },
        { cacheControl: 'public, max-age=300' }
      );
    } catch (err) {
      sendJson(req, res, 502, { error: err.message });
    }
    return true;
  }

  return false;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startBackgroundSync();

  const server = http.createServer(async (req, res) => {
    try {
      const handled = await handleApiRequest(req, res);
      if (handled) return;

      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      let reqPath = decodeURIComponent(parsedUrl.pathname);
      if (reqPath === '/') reqPath = '/index.html';

      const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(DIST_DIR, safePath);

      try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        }
      } catch {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const content = await fs.readFile(filePath);
      const isCompressible =
        ext === '.json' || ext === '.js' || ext === '.css' || ext === '.html' || ext === '.svg';
      const useGzip = isCompressible && acceptsGzip(req) && content.length > 1024;
      const body = useGzip ? zlib.gzipSync(content, { level: 6 }) : content;

      const headers = {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': String(body.length),
      };
      if (useGzip) {
        headers['Content-Encoding'] = 'gzip';
        headers.Vary = 'Accept-Encoding';
      }
      if (safePath.startsWith('/assets/')) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      } else if (safePath.startsWith('/data/')) {
        headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=7200';
      }

      res.writeHead(200, headers);
      res.end(body);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Server error: ${err.message}`);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`OrbitPulse 3D Satellite Tracker running at http://localhost:${PORT}`);
  });
}
