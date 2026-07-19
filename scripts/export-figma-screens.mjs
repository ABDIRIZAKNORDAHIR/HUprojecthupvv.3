/**
 * Captures every ProjectHub screen as PNG for Figma import.
 * Run while app is live: npm run export:figma-screens
 *
 * Import into Figma:
 * 1. Plugins → "html.to.design" with http://localhost:5180/ (best, editable layers)
 * 2. Or drag PNGs from design/figma-export/screens/ into Figma frames (1440×auto)
 * 3. Or Plugins → "Tokens Studio" → import design/figma-tokens.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'design', 'figma-export', 'screens');
const BASE = process.env.PROJECTHUB_URL || 'http://localhost:5180';
const API = process.env.PROJECTHUB_API || 'http://localhost:3004/api';

const PUBLIC_SCREENS = [
  { name: '01-welcome-home', path: '/', auth: null },
  { name: '02-student-login', path: '/student', auth: null },
  { name: '03-teacher-login', path: '/teacher', auth: null },
  { name: '04-admin-login', path: '/admin', auth: null },
  { name: '05-register', path: '/register', auth: null },
];

const ROLE_SCREENS = {
  student: [
    { name: '10-student-dashboard', path: '/' },
    { name: '11-student-projects', path: '/projects' },
    { name: '12-student-team', path: '/team' },
    { name: '13-student-feedback', path: '/feedback' },
    { name: '14-student-scores', path: '/scores' },
    { name: '15-student-teacher', path: '/my-teacher' },
    { name: '16-student-atlas', path: '/atlas' },
    { name: '17-student-settings', path: '/settings' },
  ],
  teacher: [
    { name: '20-teacher-dashboard', path: '/' },
    { name: '21-teacher-ai-queue', path: '/ai-queue' },
    { name: '22-teacher-submissions', path: '/submissions' },
    { name: '23-teacher-collisions', path: '/collisions' },
    { name: '24-teacher-reports-export', path: '/analytics' },
    { name: '25-teacher-atlas', path: '/atlas' },
    { name: '26-teacher-settings', path: '/settings' },
  ],
  admin: [
    { name: '30-admin-dashboard', path: '/admin/overview' },
    { name: '31-admin-users', path: '/admin/users' },
    { name: '32-admin-health', path: '/admin/health' },
    { name: '33-admin-submissions', path: '/submissions' },
    { name: '34-admin-batch-scanner', path: '/batch-scanner' },
    { name: '35-admin-atlas', path: '/atlas' },
    { name: '36-admin-settings', path: '/settings' },
  ],
};

const LOGINS = {
  admin: { email: 'admin@hu.edu', password: 'ProjectHub123!', portalRole: 'admin' },
  teacher: { universityId: 'HU0005001', email: 'swilliams@hu.edu', password: 'ProjectHub123!' },
  student: { universityId: 'HU0001001', email: 'alex.chen@hu.edu', password: 'ProjectHub123!' },
};

async function healthOk() {
  try {
    const r = await fetch(`${API}/health`);
    const d = await r.json();
    return r.ok && d.status === 'ok';
  } catch {
    return false;
  }
}

async function login(role) {
  const body = LOGINS[role];
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`${role} login failed: ${d.error || r.status}`);
  return d.token;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  if (!(await healthOk())) {
    console.error('\nProjectHub is not running. Start it first:\n  .\\Start-ProjectHub.cmd\n');
    process.exit(1);
  }

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('\nInstall Playwright first:\n  npm install -D playwright\n  npx playwright install chromium\n');
    process.exit(1);
  }

  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('\n=== ProjectHub → Figma screen export ===\n');

  for (const screen of PUBLIC_SCREENS) {
    const url = `${BASE}${screen.path}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1200);
    const file = path.join(OUT, `${screen.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`✓ ${screen.name}`);
  }

  for (const [role, screens] of Object.entries(ROLE_SCREENS)) {
    try {
      const token = await login(role);
      await context.addInitScript(t => {
        localStorage.setItem('projecthub_token', t);
      }, token);
      const authPage = await context.newPage();
      await authPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 60000 });
      await authPage.evaluate(t => {
        localStorage.setItem('projecthub_token', t);
      }, token);
      await authPage.reload({ waitUntil: 'networkidle' });
      await authPage.waitForTimeout(1500);

      for (const screen of screens) {
        const url = `${BASE}${screen.path}`;
        await authPage.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await authPage.waitForTimeout(1500);
        const file = path.join(OUT, `${screen.name}.png`);
        await authPage.screenshot({ path: file, fullPage: true });
        console.log(`✓ ${screen.name}`);
      }
      await authPage.close();
    } catch (e) {
      console.warn(`⚠ Skipped ${role} screens: ${e.message}`);
    }
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    baseUrl: BASE,
    frameWidth: 1440,
    screenCount: fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length,
    figmaImport: [
      'Best: Figma plugin "html.to.design" → paste http://localhost:5180/ while app runs',
      'Fast: Drag PNGs from this folder into Figma (1440px frames)',
      'Tokens: Import design/figma-tokens.json via Tokens Studio plugin',
    ],
  };
  fs.writeFileSync(path.join(ROOT, 'design', 'figma-export', 'manifest.json'), JSON.stringify(manifest, null, 2));

  await browser.close();
  console.log(`\nDone → ${OUT}`);
  console.log(`${manifest.screenCount} screens exported.\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
