const puppeteer = require('puppeteer');
const fs = require('fs');
const http = require('http');

const url = process.env.URL || 'http://localhost:5173';
const outPath = process.env.OUT || 'public/og-image.png';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Use a tall portrait viewport so the game's mobile aspect layout shows correctly
  await page.setViewport({ width: 900, height: 1600, deviceScaleFactor: 1 });

  await page.goto(url, { waitUntil: 'networkidle0' });

  // Wait for the title text to appear
  await page.waitForSelector('h1', { timeout: 5000 });

  // Select the inner game container (the motion div) and take a screenshot of it
  const el = await page.$('div.relative.flex.flex-col');
  if (!el) {
    console.error('Title element not found, taking full-page screenshot instead');
    await page.screenshot({ path: outPath, fullPage: true });
    await browser.close();
    console.log('Saved screenshot to', outPath);
    return;
  }

  const clip = await el.boundingBox();
  if (clip) {
    await page.screenshot({ path: outPath, clip });
    console.log('Saved screenshot to', outPath);
  } else {
    console.error('Could not determine bounding box, taking full-page screenshot');
    await page.screenshot({ path: outPath, fullPage: true });
  }

  await browser.close();
})();
