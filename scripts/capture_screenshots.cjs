const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const PORT = 9225;
const OUT_DIR = path.resolve(__dirname, '../screenshots');
const BASE_URL = 'http://localhost:3000/';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
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
      } else if (msg.method) {
        this.events.push(msg);
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

  async screenshot(filename) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(OUT_DIR, filename);
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

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

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
  try {
    const wsUrl = await waitForDebugger(PORT);
    cdp = new CdpClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');

    // === DESKTOP 1920x1080 ===
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: BASE_URL });
    for (let i = 0; i < 20; i++) {
      await sleep(700);
      const ready = await cdp.eval(
        `document.querySelectorAll('#sat-list .sat-item').length > 0 && (document.getElementById('boot-splash')?.hidden === true || document.getElementById('boot-splash')?.classList.contains('is-hidden'))`
      );
      if (ready) break;
    }
    await sleep(3000);

    // Verify boot splash dismissed + multi-pass schedule + favorites + scrubber
    const desktopStats = await cdp.eval(`(() => ({
      splashHidden: document.getElementById('boot-splash')?.hidden === true || document.getElementById('boot-splash')?.classList.contains('is-hidden'),
      satCount: document.querySelectorAll('#sat-list .sat-item').length,
      selectedTitle: document.getElementById('tel-name')?.textContent?.trim(),
      passRows: document.querySelectorAll('#tel-pass-box .pass-row').length,
      hasFavBtn: Boolean(document.getElementById('btn-favorite')),
      hasShareBtn: Boolean(document.getElementById('btn-share-sat')),
      hasScrubberToggle: Boolean(document.getElementById('btn-scrubber-toggle')),
    }))()`);
    console.log('DESKTOP OVERVIEW:', JSON.stringify(desktopStats));
    await cdp.screenshot('01-overview.png');

    // Test favorite toggle & multi-pass jump button presence
    await cdp.eval(`document.getElementById('btn-favorite').click()`);
    await sleep(300);
    const favActive = await cdp.eval(
      `document.getElementById('btn-favorite').classList.contains('is-favorite')`
    );
    console.log('FAVORITE TOGGLED:', favActive);
    // Toggle back so default state stays clean for screenshots
    await cdp.eval(`document.getElementById('btn-favorite').click()`);
    await sleep(200);

    // === 02: ISS NASA 3D Close-Up + Attitude Vectors ===
    await cdp.eval(`document.getElementById('btn-closeup').click()`);
    await sleep(5500);
    const iss3dState = await cdp.eval(`({
      modelType: document.getElementById('tel-model-type')?.textContent?.trim(),
      lodText: document.getElementById('tel-model-lod')?.textContent?.trim(),
    })`);
    console.log('ISS 3D CLOSEUP:', JSON.stringify(iss3dState));
    await cdp.screenshot('02-iss-3d-closeup.png');

    // === 03: Korea Satellites Tab (GK-2A / KOMPSAT) ===
    await cdp.eval(`document.querySelector('[data-category="korea"]').click()`);
    await sleep(4000);
    const koreaInfo = await cdp.eval(`(() => {
      const items = [...document.querySelectorAll('#sat-list .sat-item')];
      const names = items.map((el) => el.querySelector('.sat-item-name')?.textContent?.trim());
      const gk2a = items.find((el) => el.dataset.id === '43823') || items[0];
      if (gk2a) gk2a.click();
      return { count: items.length, sample: names.slice(0, 8), hasGk2a: items.some((el) => el.dataset.id === '43823') };
    })()`);
    console.log('KOREA TAB:', JSON.stringify(koreaInfo));
    await sleep(3500);
    await cdp.screenshot('03-korea-satellites.png');

    // === 04: Hubble Space Telescope NASA 3D Close-Up ===
    await cdp.eval(`document.querySelector('[data-category="science"]').click()`);
    await sleep(3500);
    await cdp.eval(`(() => {
      const hst = document.querySelector('#sat-list .sat-item[data-id="20580"]');
      if (hst) hst.click();
    })()`);
    await sleep(1500);
    await cdp.eval(`document.getElementById('btn-closeup').click()`);
    await sleep(5500);
    const hstState = await cdp.eval(`({
      name: document.getElementById('tel-name')?.textContent?.trim(),
      lodText: document.getElementById('tel-model-lod')?.textContent?.trim(),
    })`);
    console.log('HUBBLE 3D CLOSEUP:', JSON.stringify(hstState));
    await cdp.screenshot('04-hubble-3d-closeup.png');

    // === 05: Layers Popover + ±24h Timeline Scrubber ===
    await cdp.eval(`document.querySelector('[data-category="featured"]').click()`);
    await sleep(2500);
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
    const scrubberState = await cdp.eval(`({
      layersOpen: !document.getElementById('layers-popover').hidden,
      scrubberOpen: !document.getElementById('time-scrubber-bar').hidden,
      offsetLabel: document.getElementById('scrubber-offset-label').textContent.trim(),
    })`);
    console.log('LAYERS & SCRUBBER:', JSON.stringify(scrubberState));
    await cdp.screenshot('05-layers-and-scrubber.png');

    // === 06: Mobile Portrait Main (360x640 @3x => 1080x1920) ===
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 640,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await cdp.send('Page.navigate', { url: BASE_URL });
    for (let i = 0; i < 20; i++) {
      await sleep(700);
      const ready = await cdp.eval(
        `Boolean(document.getElementById('left-drawer')) && document.querySelectorAll('#sat-list .sat-item').length > 0 && (document.getElementById('boot-splash')?.hidden === true || document.getElementById('boot-splash')?.classList.contains('is-hidden'))`
      );
      if (ready) break;
    }
    await sleep(2500);

    const mobileMain = await cdp.eval(`(() => {
      const r = (id) => {
        const b = document.getElementById(id).getBoundingClientRect();
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
      };
      const topR = document.querySelector('.top-controls').getBoundingClientRect();
      return {
        drawerCollapsed: document.getElementById('left-drawer').classList.contains('collapsed'),
        telemetryPeek: document.getElementById('telemetry-panel').classList.contains('mobile-peek'),
        expandBtn: r('btn-expand-drawer'),
        topControls: { x: Math.round(topR.x), y: Math.round(topR.y), w: Math.round(topR.width), h: Math.round(topR.height) },
        bottomBar: r('btn-live-now'),
      };
    })()`);
    console.log('MOBILE MAIN:', JSON.stringify(mobileMain));
    await cdp.screenshot('06-mobile.png');

    // === 07: Mobile Bottom Sheet (Satellite Browser Open) ===
    await cdp.eval(`document.getElementById('btn-expand-drawer').click()`);
    for (let i = 0; i < 15; i++) {
      await sleep(400);
      const y = await cdp.eval(`Math.round(document.getElementById('left-drawer').getBoundingClientRect().y)`);
      if (y < 200) break;
    }
    const mobileSheet = await cdp.eval(`({
      drawerCollapsed: document.getElementById('left-drawer').classList.contains('collapsed'),
      drawerY: Math.round(document.getElementById('left-drawer').getBoundingClientRect().y),
      backdropVisible: !document.getElementById('mobile-backdrop').hidden,
    })`);
    console.log('MOBILE SHEET:', JSON.stringify(mobileSheet));
    await cdp.screenshot('07-mobile-sheet.png');

    // Check runtime/console errors collected by CDP
    const runtimeErrors = cdp.events.filter(
      (e) =>
        e.method === 'Runtime.exceptionThrown' ||
        (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error')
    );
    console.log('RUNTIME ERRORS COUNT:', runtimeErrors.length);
    if (runtimeErrors.length > 0) {
      console.error(JSON.stringify(runtimeErrors, null, 2));
      process.exitCode = 1;
    }
  } finally {
    cdp?.close();
    chrome.kill('SIGKILL');
  }
})();
