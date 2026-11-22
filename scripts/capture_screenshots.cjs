const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
  });

  const errors = [];
  const page = await browser.newPage();
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  // 1. Mobile Portrait (360x640 @3x => 1080x1920)
  await page.setViewport({
    width: 360,
    height: 640,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(6000);

  const initialChecks = await page.evaluate(() => {
    const drawer = document.getElementById('left-drawer');
    const expandBtn = document.getElementById('btn-expand-drawer');
    const topControls = document.querySelector('.top-controls');
    const telemetry = document.getElementById('telemetry-panel');
    const bottomBar = document.querySelector('.bottom-bar');
    const speedCycle = document.getElementById('btn-speed-cycle');
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        x: Math.round(b.x),
        y: Math.round(b.y),
        width: Math.round(b.width),
        height: Math.round(b.height),
      };
    };
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      drawerCollapsed: drawer.classList.contains('collapsed'),
      expandBtnVisible: !expandBtn.hidden,
      telemetryHidden: telemetry.hidden,
      telemetryPeek: telemetry.classList.contains('mobile-peek'),
      expandRect: r(expandBtn),
      topControlsRect: r(topControls),
      telemetryRect: r(telemetry),
      bottomBarRect: r(bottomBar),
      speedCycleVisible: getComputedStyle(speedCycle).display !== 'none',
      speedCycleText: speedCycle.textContent.trim(),
      clockText: document.getElementById('clock-kst').textContent.trim(),
    };
  });

  console.log('MOBILE INITIAL (360x640):', JSON.stringify(initialChecks, null, 2));

  const topOverlap = rectsOverlap(initialChecks.expandRect, initialChecks.topControlsRect);
  const bottomOverflow =
    initialChecks.bottomBarRect.x + initialChecks.bottomBarRect.width > initialChecks.vw + 1;
  const telOverlapBottom = rectsOverlap(initialChecks.telemetryRect, initialChecks.bottomBarRect);
  console.log('OVERLAP CHECKS:', { topOverlap, bottomOverflow, telOverlapBottom });

  // Capture crisp 1080x1920 mobile screenshot
  await page.screenshot({
    path: '/home/antigravity/satellite-tracker-3d/screenshots/06-mobile.png',
  });

  // 2. Test Mobile Interactions
  await page.click('#btn-expand-drawer');
  await page.waitForFunction(
    () => document.getElementById('left-drawer').getBoundingClientRect().y < 200,
    { timeout: 10000 }
  );
  const afterOpenDrawer = await page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    };
    return {
      drawerCollapsed: document.getElementById('left-drawer').classList.contains('collapsed'),
      backdropVisible: !document.getElementById('mobile-backdrop').hidden,
      satCount: document.querySelectorAll('#sat-list .sat-item').length,
      drawerRect: r(document.getElementById('left-drawer')),
      listRect: r(document.getElementById('sat-list')),
      item2Rect: r(document.querySelector('#sat-list .sat-item:nth-child(2)')),
    };
  });
  console.log('AFTER OPEN DRAWER:', JSON.stringify(afterOpenDrawer));

  await page.click('#sat-list .sat-item:nth-child(2)');
  await page.waitForFunction(
    () =>
      document.getElementById('left-drawer').classList.contains('collapsed') &&
      document.getElementById('left-drawer').getBoundingClientRect().y > 500,
    { timeout: 10000 }
  );
  const afterSelectSat = await page.evaluate(() => ({
    drawerCollapsed: document.getElementById('left-drawer').classList.contains('collapsed'),
    backdropHidden: document.getElementById('mobile-backdrop').hidden,
    telemetryPeek: document.getElementById('telemetry-panel').classList.contains('mobile-peek'),
    selectedTitle: document.getElementById('tel-name').textContent.trim(),
  }));

  await page.click('#btn-toggle-telemetry-expand');
  await sleep(400);
  const afterExpandTel = await page.evaluate(() => ({
    telemetryPeek: document.getElementById('telemetry-panel').classList.contains('mobile-peek'),
    telemetryHeight: Math.round(
      document.getElementById('telemetry-panel').getBoundingClientRect().height
    ),
  }));

  await page.click('#btn-closeup');
  await sleep(500);
  const afterCloseup = await page.evaluate(() => ({
    telemetryPeek: document.getElementById('telemetry-panel').classList.contains('mobile-peek'),
  }));

  await page.click('#btn-speed-cycle');
  await sleep(150);
  const speedAfter1 = await page.$eval('#btn-speed-cycle', (el) => el.textContent.trim());
  await page.click('#btn-speed-cycle');
  await sleep(150);
  const speedAfter2 = await page.$eval('#btn-speed-cycle', (el) => el.textContent.trim());

  await page.click('#btn-layers');
  await sleep(300);
  const afterOpenLayers = await page.evaluate(() => ({
    layersVisible: !document.getElementById('layers-popover').hidden,
    mobileEnginesVisible:
      getComputedStyle(document.querySelector('.mobile-only-section')).display !== 'none',
    backdropVisible: !document.getElementById('mobile-backdrop').hidden,
  }));
  await page.click('#btn-close-layers');
  await sleep(250);
  const layersClosed = await page.$eval('#layers-popover', (el) => el.hidden);

  console.log(
    'MOBILE INTERACTIONS:',
    JSON.stringify(
      {
        afterOpenDrawer,
        afterSelectSat,
        afterExpandTel,
        afterCloseup,
        speedCycle: [speedAfter1, speedAfter2],
        afterOpenLayers,
        layersClosed,
      },
      null,
      2
    )
  );

  // 3. Desktop sanity check (1920x1080)
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);
  const desktopCheck = await page.evaluate(() => ({
    drawerCollapsed: document.getElementById('left-drawer').classList.contains('collapsed'),
    telemetryPeek: document.getElementById('telemetry-panel').classList.contains('mobile-peek'),
    speedCycleHidden: getComputedStyle(document.getElementById('btn-speed-cycle')).display === 'none',
    segmentedVisible:
      getComputedStyle(document.querySelector('.hud-segmented')).display !== 'none',
  }));
  console.log('DESKTOP CHECK:', JSON.stringify(desktopCheck, null, 2));
  console.log('ERRORS:', errors);

  await browser.close();

  if (errors.length > 0 || topOverlap || bottomOverflow || telOverlapBottom) {
    process.exit(1);
  }
})();
