import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCacheHealth, getGroupSatellites, getSatelliteByNoradId, searchSatellitesByName } from './celestrak.js';

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

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(payload));
}

export async function handleApiRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/health') {
    sendJson(res, 200, getCacheHealth());
    return true;
  }

  if (pathname === '/api/satellites') {
    const group = parsedUrl.searchParams.get('group') || 'featured';
    const forceRefresh = parsedUrl.searchParams.get('refresh') === '1';
    const limit = parsedUrl.searchParams.get('limit');
    try {
      const data = await getGroupSatellites(group, {
        forceRefresh,
        limitOverride: limit,
      });
      sendJson(res, 200, data);
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return true;
  }

  const singleMatch = pathname.match(/^\/api\/satellite\/(\d+)$/);
  if (singleMatch) {
    try {
      const sat = await getSatelliteByNoradId(singleMatch[1]);
      if (!sat) {
        sendJson(res, 404, { error: `NORAD ID ${singleMatch[1]} 위성을 찾을 수 없습니다.` });
      } else {
        sendJson(res, 200, { satellite: sat, source: 'celestrak-live' });
      }
    } catch (err) {
      sendJson(res, 502, { error: err.message });
    }
    return true;
  }

  if (pathname === '/api/search') {
    const q = parsedUrl.searchParams.get('q') || '';
    try {
      const satellites = await searchSatellitesByName(q);
      sendJson(res, 200, { satellites, count: satellites.length, source: 'celestrak-live' });
    } catch (err) {
      sendJson(res, 502, { error: err.message });
    }
    return true;
  }

  return false;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
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
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Server error: ${err.message}`);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`OrbitPulse 3D Satellite Tracker running at http://localhost:${PORT}`);
  });
}
