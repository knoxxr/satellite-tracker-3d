import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { handleApiRequest } from './server/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CESIUM_BUILD_DIR = path.resolve(__dirname, 'node_modules/cesium/Build/Cesium');
const CESIUM_STATIC_FOLDERS = ['Assets', 'ThirdParty', 'Widgets', 'Workers'];

const MIME_MAP = {
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.xml': 'application/xml',
  '.glsl': 'text/plain; charset=utf-8',
};

/**
 * Lightweight Vite 8 plugin that serves Cesium static assets during dev
 * and copies them into dist/cesium during production builds, plus wires /api/* routes.
 */
function cesiumAndApiPlugin() {
  return {
    name: 'cesium-static-and-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          const handled = await handleApiRequest(req, res);
          if (handled) return;
        }

        if (req.url && req.url.startsWith('/cesium/')) {
          const cleanUrl = decodeURIComponent(req.url.split('?')[0]).replace(/^\/cesium\//, '');
          const filePath = path.join(CESIUM_BUILD_DIR, cleanUrl);
          if (filePath.startsWith(CESIUM_BUILD_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            res.setHeader('Content-Type', MIME_MAP[ext] || 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }

        next();
      });
    },
    async closeBundle() {
      const distCesiumDir = path.resolve(__dirname, 'dist/cesium');
      await fsp.mkdir(distCesiumDir, { recursive: true });
      for (const folder of CESIUM_STATIC_FOLDERS) {
        const src = path.join(CESIUM_BUILD_DIR, folder);
        const dest = path.join(distCesiumDir, folder);
        await fsp.cp(src, dest, { recursive: true });
      }
    },
  };
}

const basePath = process.env.VITE_BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [cesiumAndApiPlugin()],
  define: {
    CESIUM_BASE_URL: JSON.stringify(`${basePath}cesium/`),
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-cesium', test: /node_modules[\\/](@cesium|cesium)[\\/]/ },
            { name: 'vendor-orbital', test: /node_modules[\\/]satellite\.js/ },
          ],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['cesium'],
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
