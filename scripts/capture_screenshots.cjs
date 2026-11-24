const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = 9225;
const OUT_DIR = path.resolve(__dirname, '../screenshots');
const GIF_FRAMES_DIR = '/tmp/orbitpulse-gif-frames';
const BASE_URL = 'http://localhost:3000/';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params?.exceptionDetails?.text || JSON.stringify(msg.params));
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  async screenshot(outPath) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    return outPath;
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // Ignore
    }
  }
}

async function waitForDebugger(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {
      // Retry
    }
    await sleep(250);
  }
  throw new Error('Timed out waiting for Chrome DevTools Protocol');
}

const modeArg = process.argv.find((a) => a.startsWith('--only='));
const MODE = modeArg ? modeArg.split('=')[1] : 'all';

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (MODE === 'all' || MODE === 'gif') {
    fs.rmSync(GIF_FRAMES_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(GIF_FRAMES_DIR, { recursive: true });
  fs.rmSync('/tmp/orbitpulse-cdp-profile', { recursive: true, force: true });

  const chrome = spawn(
    '/usr/bin/google-chrome',
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--window-size=1920,1080',
      `--remote-debugging-port=${PORT}`,
      '--user-data-dir=/tmp/orbitpulse-cdp-profile',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let cdp;
  const existingFrames = fs.readdirSync(GIF_FRAMES_DIR).filter((f) => f.startsWith('frame_') && f.endsWith('.png'));
  let gifIdx = MODE === 'part2' ? existingFrames.length : 0;
  const captureGifFrame = async (delayMs = 140) => {
    gifIdx += 1;
    const fname = `frame_${String(gifIdx).padStart(3, '0')}_${delayMs}.png`;
    await cdp.screenshot(path.join(GIF_FRAMES_DIR, fname));
  };

  try {
    const wsUrl = await waitForDebugger(PORT);
    cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const waitAppReady = async (maxTicks = 30, tickMs = 500) => {
      for (let i = 0; i < maxTicks; i++) {
        await sleep(tickMs);
        const ready = await cdp.eval(
          `document.querySelectorAll('#sat-list .sat-item').length > 0 && (document.getElementById('boot-splash')?.hidden === true || document.getElementById('boot-splash')?.classList.contains('is-hidden'))`
        );
        if (ready) break;
      }
    };

    if (MODE === 'all' || MODE === 'desktop') {
    // === DESKTOP 1920x1080 (English Default) ===
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: BASE_URL });
    await waitAppReady(30, 600);
    await sleep(3200);

    // 01: Overview (17,038 satellites + ISS SATCAT + Naked-Eye Visibility, EN default)
    const overviewStats = await cdp.eval(`(() => ({
      lang: document.documentElement.lang,
      listMeta: document.getElementById('list-count-text')?.textContent?.trim(),
      tabsCount: document.querySelectorAll('#category-tabs .cat-tab').length,
      selected: document.getElementById('tel-name')?.textContent?.trim(),
      owner: document.getElementById('tel-owner')?.textContent?.trim(),
      rcs: document.getElementById('tel-rcs')?.textContent?.trim(),
      visual: document.getElementById('tel-visual-badge')?.textContent?.trim(),
    }))()`);
    console.log('01 OVERVIEW:', JSON.stringify(overviewStats));
    await cdp.screenshot(path.join(OUT_DIR, '01-overview.png'));

    // === 02: ISS NASA 3D Close-Up + Attitude Guides ===
    await cdp.eval(`document.getElementById('btn-closeup').click()`);
    await sleep(5500);
    const iss3dState = await cdp.eval(`({
      modelType: document.getElementById('tel-model-type')?.textContent?.trim(),
      lodText: document.getElementById('tel-model-lod')?.textContent?.trim(),
    })`);
    console.log('02 ISS 3D CLOSEUP:', JSON.stringify(iss3dState));
    await cdp.screenshot(path.join(OUT_DIR, '02-iss-3d-closeup.png'));

    // === 03: South Korea 83 Satellites (Korean Mode Showcase) ===
    await cdp.eval(`document.getElementById('btn-lang-toggle').click()`);
    await sleep(400);
    await cdp.eval(`document.querySelector('[data-category="korea"]').click()`);
    await sleep(2200);
    const koreaInfo = await cdp.eval(`(() => {
      const items = [...document.querySelectorAll('#sat-list .sat-item')];
      const target = items.find((el) => el.dataset.id === '66655') || items.find((el) => el.dataset.id === '43823') || items[0];
      if (target) target.click();
      return {
        lang: document.documentElement.lang,
        meta: document.getElementById('list-count-text')?.textContent?.trim(),
        selected: target?.querySelector('.sat-item-name')?.textContent?.trim(),
      };
    })()`);
    await sleep(2800);
    console.log('03 KOREA TAB (KO):', JSON.stringify(koreaInfo));
    await cdp.screenshot(path.join(OUT_DIR, '03-korea-satellites.png'));

    // Switch back to English default for remaining screenshots
    await cdp.eval(`document.getElementById('btn-lang-toggle').click()`);
    await sleep(400);

    // === 04: Hubble Space Telescope NASA 3D Close-Up (EN) ===
    await cdp.eval(`document.querySelector('[data-category="science"]').click()`);
    await sleep(1800);
    await cdp.eval(`(() => {
      const hst = document.querySelector('#sat-list .sat-item[data-id="20580"]');
      if (hst) hst.click();
    })()`);
    await sleep(1500);
    await cdp.eval(`document.getElementById('btn-closeup').click()`);
    await sleep(5500);
    console.log('04 HUBBLE 3D:', await cdp.eval(`document.getElementById('tel-name')?.textContent?.trim()`));
    await cdp.screenshot(path.join(OUT_DIR, '04-hubble-3d-closeup.png'));

    // === 05: Bright/Visual Satellites + Layers Popover + ±24h Scrubber ===
    await cdp.eval(`document.querySelector('[data-category="visual"]').click()`);
    await sleep(2000);
    await cdp.eval(`(() => {
      const iss = document.querySelector('#sat-list .sat-item[data-id="25544"]');
      if (iss) iss.click();
    })()`);
    await sleep(2000);
    await cdp.eval(`(() => {
      document.getElementById('btn-layers').click();
      document.getElementById('btn-scrubber-toggle').click();
      const s = document.getElementById('time-scrubber');
      s.value = '180';
      s.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await sleep(1500);
    console.log('05 LAYERS & SCRUBBER:', await cdp.eval(`({
      meta: document.getElementById('list-count-text')?.textContent?.trim(),
      offset: document.getElementById('scrubber-offset-label')?.textContent?.trim(),
    })`));
    await cdp.screenshot(path.join(OUT_DIR, '05-layers-and-scrubber.png'));
    }

    // ===============================================================
    // ANIMATED GIF SEQUENCE (1280x720 crisp capture -> resized to 960x540)
    // ===============================================================
    if (MODE === 'all' || MODE === 'gif' || MODE === 'part2') {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await cdp.send('Page.navigate', { url: BASE_URL });
      await waitAppReady(30, 500);
      await sleep(2200);
    }

    if (MODE === 'all' || MODE === 'gif') {
      // Scene 1: Global 17,038 Satellites orbiting at 300x speed (EN) — 14 frames
      await cdp.eval(`document.querySelector('#speed-buttons [data-speed="300"]').click()`);
      await sleep(400);
      for (let i = 0; i < 14; i++) {
        await captureGifFrame(i === 0 ? 450 : 150);
        await sleep(260);
      }

      // Scene 2: ISS NASA 3D Close-Up + Attitude Guides at 10x speed — 12 frames
      await cdp.eval(`document.querySelector('#speed-buttons [data-speed="10"]').click()`);
      await cdp.eval(`document.getElementById('btn-closeup').click()`);
      await sleep(4800);
      for (let i = 0; i < 12; i++) {
        await captureGifFrame(i === 0 ? 450 : 160);
        await sleep(280);
      }

      // Scene 3: South Korea (83 sats) -> live EN to KO toggle! — 12 frames
      await cdp.eval(`document.querySelector('#speed-buttons [data-speed="300"]').click()`);
      await cdp.eval(`document.querySelector('[data-category="korea"]').click()`);
      await sleep(1800);
      await cdp.eval(`(() => {
        const target = document.querySelector('#sat-list .sat-item[data-id="66655"]') || document.querySelector('#sat-list .sat-item[data-id="43823"]');
        if (target) target.click();
      })()`);
      await sleep(2000);
      for (let i = 0; i < 5; i++) {
        await captureGifFrame(i === 0 ? 450 : 180);
        await sleep(260);
      }
      // Live click EN -> 한!
      await cdp.eval(`document.getElementById('btn-lang-toggle').click()`);
      await sleep(450);
      for (let i = 0; i < 7; i++) {
        await captureGifFrame(i === 0 ? 500 : 180);
        await sleep(260);
      }
      await cdp.eval(`document.getElementById('btn-lang-toggle').click()`);
      await sleep(300);
    }

    if (MODE === 'all' || MODE === 'gif' || MODE === 'part2') {
      // Scene 4: Hubble Space Telescope NASA 3D Close-Up (EN) — 10 frames
      await cdp.eval(`document.querySelector('[data-category="science"]').click()`);
      await sleep(1200);
      await cdp.eval(`document.querySelector('#sat-list .sat-item[data-id="20580"]')?.click()`);
      await sleep(1200);
      await cdp.eval(`document.querySelector('#speed-buttons [data-speed="10"]').click()`);
      await cdp.eval(`document.getElementById('btn-closeup').click()`);
      await sleep(4800);
      for (let i = 0; i < 10; i++) {
        await captureGifFrame(i === 0 ? 450 : i === 9 ? 550 : 160);
        await sleep(260);
      }
      console.log('GIF FRAMES CAPTURED:', gifIdx);
    }

    if (MODE === 'all' || MODE === 'mobile' || MODE === 'part2') {
      // === 06 & 07: Mobile Portrait (360x640 @3x => 1080x1920, EN default) ===
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 360,
        height: 640,
        deviceScaleFactor: 3,
        mobile: true,
      });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      await cdp.send('Page.navigate', { url: BASE_URL });
      await waitAppReady(30, 500);
      await sleep(2500);
      await cdp.screenshot(path.join(OUT_DIR, '06-mobile.png'));

      // Expand telemetry bottom sheet showing SATCAT + Naked-Eye Visibility
      await cdp.eval(`document.getElementById('btn-toggle-telemetry-expand').click()`);
      await sleep(700);
      await cdp.screenshot(path.join(OUT_DIR, '07-mobile-sheet.png'));
      console.log('06 & 07 MOBILE CAPTURED');
    }
    console.log('RUNTIME ERRORS:', cdp.errors.length, cdp.errors);
  } finally {
    cdp?.close();
    chrome.kill('SIGKILL');
  }
})();
