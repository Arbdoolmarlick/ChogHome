// scripts/capture_contact_sheet.mjs
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/PC/.agents/skills/web-designer/node_modules/playwright-core');

async function capture() {
  console.log('📸 Launching Chromium for contact sheet snapshot...');
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge', // Fast on Windows
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 1.5,
  });

  const htmlPath = path.resolve('shots', 'contact_sheet.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  console.log(`🌐 Navigating to ${fileUrl}...`);
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Give images up to 4s to paint
  console.log('⏳ Waiting for images to paint...');
  await page.waitForTimeout(4000);

  const outPath = path.resolve('shots', 'contact_sheet.png');
  await page.screenshot({ path: outPath, fullPage: true });

  console.log(`✅ Saved full-page contact sheet screenshot to: ${outPath}`);
  await browser.close();
}

capture().catch(err => {
  console.error('❌ Capture failed:', err.message);
  process.exit(1);
});
