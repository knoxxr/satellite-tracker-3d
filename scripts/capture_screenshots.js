const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();

  // Desktop overview
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 0 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: '/home/antigravity/satellite-tracker-3d/screenshots/01-overview.png' });

  // Select first satellite in the list (if any) and capture close‑up view
  try {
    await page.waitForSelector('#sat-list > *', { timeout: 3000 });
    const firstSat = await page.$('#sat-list > *');
    if (firstSat) {
      await firstSat.click();
      await page.waitForTimeout(2000);
      const closeupBtn = await page.$('#btn-closeup');
      if (closeupBtn) {
        await closeupBtn.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '/home/antigravity/satellite-tracker-3d/screenshots/02-closeup.png' });
      }
    }
  } catch (e) {
    console.warn('Could not capture close‑up screenshot:', e.message);
  }

  // Capture layers pop‑over panel
  try {
    const layersBtn = await page.$('#btn-layers');
    if (layersBtn) {
      await layersBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: '/home/antigravity/satellite-tracker-3d/screenshots/05-layers.png' });
    }
  } catch (e) {
    console.warn('Could not capture layers screenshot:', e.message);
  }

  // Mobile portrait screenshot
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true });
  await page.reload({ waitUntil: 'networkidle2', timeout: 0 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: '/home/antigravity/satellite-tracker-3d/screenshots/06-mobile.png' });

  await browser.close();
})();
