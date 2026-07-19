import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public', 'pwa-icon.svg'));

for (const size of [192, 512]) {
  const out = join(root, 'public', `pwa-${size}.png`);
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log('Created', out);
}
