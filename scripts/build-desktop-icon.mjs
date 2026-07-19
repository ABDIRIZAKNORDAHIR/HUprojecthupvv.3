/**
 * Generate desktop/icon.png from public/pwa-icon.svg for Electron.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svg = path.join(root, 'public', 'pwa-icon.svg');
const out = path.join(root, 'desktop', 'icon.png');

if (!fs.existsSync(svg)) {
  console.warn('No pwa-icon.svg — skip icon');
  process.exit(0);
}

await sharp(svg).resize(256, 256).png().toFile(out);
console.log('Created', out);
