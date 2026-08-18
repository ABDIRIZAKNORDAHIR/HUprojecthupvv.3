/**
 * Opens ProjectHub in a real phone-sized browser window (touch input, mobile
 * user agent) so the mobile layout can be reviewed on a desktop machine.
 *
 * Usage: node scripts/mobile-preview.mjs [url]
 */
import { chromium, devices } from 'playwright';

const url = process.argv[2] || process.env.PREVIEW_URL || 'http://localhost:5199';
const phone = devices['iPhone 14 Pro'];

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=60,40'],
});

const context = await browser.newContext({ ...phone, serviceWorkers: 'block' });
const page = await context.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded' });

console.log(`Mobile preview open at ${url} (${phone.viewport.width}x${phone.viewport.height}).`);
console.log('Close the browser window to end the preview.');

await new Promise(resolve => {
  page.on('close', resolve);
  browser.on('disconnected', resolve);
});

await browser.close().catch(() => {});
