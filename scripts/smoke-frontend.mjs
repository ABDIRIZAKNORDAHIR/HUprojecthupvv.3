import { chromium } from 'playwright';

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:5180';
const routes = ['/', '/privacy', '/terms', '/ai-notice'];
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  const page = await browser.newPage();
  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    if (!response?.ok()) failures.push(`${route}: HTTP ${response?.status() ?? 'no response'}`);
    const body = (await page.locator('body').innerText()).trim();
    if (!body) failures.push(`${route}: empty page`);
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Browser smoke test passed (${routes.length} routes)`);
