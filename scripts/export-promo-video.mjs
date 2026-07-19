/**
 * Record Hormuud ProjectHub promo animation → video file.
 * Run: npm run export:promo-video
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROMO_HTML = path.join(ROOT, 'design', 'animation', 'promo.html');
const OUT_DIR = path.join(ROOT, 'design', 'animation', 'output');

async function main() {
  if (!fs.existsSync(PROMO_HTML)) {
    console.error('Missing design/animation/promo.html');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('\nInstall Playwright:\n  npm install -D playwright\n  npx playwright install chromium\n');
    process.exit(1);
  }

  console.log('\n=== Hormuud ProjectHub — Promo Video Export ===\n');
  console.log('Recording 1920×1080 animation (~45 seconds)...\n');

  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  const fileUrl = `file:///${PROMO_HTML.replace(/\\/g, '/')}`;

  await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
  // Animation is exactly 45s — wait for completion flag or fixed duration
  await Promise.race([
    page.waitForFunction(() => window.__PROMO_COMPLETE__ === true, { timeout: 90000 }),
    page.waitForTimeout(47000),
  ]);
  await page.waitForTimeout(1000);

  const video = page.video();
  await context.close();
  await browser.close();

  if (!video) {
    console.error('Video recording failed');
    process.exit(1);
  }

  const rawPath = await video.path();
  const webmPath = path.join(OUT_DIR, 'Hormuud-ProjectHub-Promo.webm');
  if (rawPath !== webmPath && fs.existsSync(rawPath)) {
    if (fs.existsSync(webmPath)) fs.unlinkSync(webmPath);
    fs.renameSync(rawPath, webmPath);
  }

  let mp4Path = null;
  try {
    const ffmpegMod = await import('@ffmpeg-installer/ffmpeg');
    const { spawnSync } = await import('child_process');
    const ffmpeg = ffmpegMod.default.path;
    mp4Path = path.join(OUT_DIR, 'Hormuud-ProjectHub-Promo.mp4');
    const result = spawnSync(ffmpeg, [
      '-y', '-i', webmPath,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      mp4Path,
    ], { stdio: 'pipe' });
    if (result.status !== 0) mp4Path = null;
  } catch {
    /* webm only */
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    title: 'Hormuud ProjectHub — Promo Animation',
    durationSeconds: 45,
    resolution: '1920×1080',
    webm: 'design/animation/output/Hormuud-ProjectHub-Promo.webm',
    mp4: mp4Path ? 'design/animation/output/Hormuud-ProjectHub-Promo.mp4' : null,
    previewHtml: 'design/animation/promo.html',
    openWith: 'VLC · Windows Media Player · Chrome · Adobe Premiere',
  };

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`✓ Video saved: ${webmPath}`);
  if (mp4Path && fs.existsSync(mp4Path)) {
    console.log(`✓ MP4 saved:  ${mp4Path}`);
  } else {
    console.log('  (MP4: install @ffmpeg-installer/ffmpeg for automatic MP4 — WebM works in VLC/Chrome)');
  }
  console.log(`\nPreview animation in browser: design/animation/promo.html\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
