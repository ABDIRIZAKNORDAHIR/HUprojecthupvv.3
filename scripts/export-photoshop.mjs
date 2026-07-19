/**
 * Convert ProjectHub screen PNGs → Adobe Photoshop PSD files.
 * Run: npm run export:photoshop
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { writePsdBuffer } from 'ag-psd';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PNG_DIR = path.join(ROOT, 'design', 'figma-export', 'screens');
const PSD_DIR = path.join(ROOT, 'design', 'photoshop-export', 'screens');
const MASTER_PSD = path.join(ROOT, 'design', 'photoshop-export', 'ProjectHub-Full-Design.psd');

const LABELS = {
  '01-welcome-home': '01 Welcome Homepage',
  '02-student-login': '02 Student Login',
  '03-teacher-login': '03 Teacher Login',
  '04-admin-login': '04 Admin Login',
  '05-register': '05 Register',
  '10-student-dashboard': '10 Student Dashboard',
  '11-student-projects': '11 Student Projects',
  '12-student-team': '12 Student Team',
  '13-student-feedback': '13 Student Feedback',
  '14-student-scores': '14 Student Scores',
  '15-student-teacher': '15 My Teacher',
  '16-student-atlas': '16 Project Atlas',
  '17-student-settings': '17 Student Settings',
  '20-teacher-dashboard': '20 Teacher Dashboard',
  '21-teacher-ai-queue': '21 AI Review Queue',
  '22-teacher-submissions': '22 Teacher Submissions',
  '23-teacher-collisions': '23 Collision Alerts',
  '24-teacher-reports-export': '24 Reports Export',
  '25-teacher-atlas': '25 Teacher Atlas',
  '26-teacher-settings': '26 Teacher Settings',
  '30-admin-dashboard': '30 Admin Dashboard',
  '31-admin-users': '31 Admin Users',
  '32-admin-health': '32 System Health',
  '33-admin-submissions': '33 Admin Submissions',
  '34-admin-batch-scanner': '34 Batch Scanner',
  '35-admin-atlas': '35 Admin Atlas',
  '36-admin-settings': '36 Admin Settings',
};

async function pngToLayer(pngPath, layerName) {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    name: layerName,
    imageData: {
      width: info.width,
      height: info.height,
      data: new Uint8ClampedArray(data),
    },
  };
}

function savePsd(psdPath, psd, options = {}) {
  const buffer = writePsdBuffer(psd, options);
  fs.writeFileSync(psdPath, buffer);
}

async function convertOne(pngPath, psdPath, layerName) {
  const layer = await pngToLayer(pngPath, layerName);
  const psd = {
    width: layer.imageData.width,
    height: layer.imageData.height,
    children: [layer],
  };
  savePsd(psdPath, psd);
  return { width: layer.imageData.width, height: layer.imageData.height };
}

async function main() {
  if (!fs.existsSync(PNG_DIR)) {
    console.error('\nNo PNG screens found. Run first:\n  npm run export:figma-screens\n');
    process.exit(1);
  }

  fs.mkdirSync(PSD_DIR, { recursive: true });

  const pngs = fs.readdirSync(PNG_DIR).filter(f => f.endsWith('.png')).sort();
  if (!pngs.length) {
    console.error('\nPNG folder is empty. Start app and run:\n  npm run export:figma-screens\n');
    process.exit(1);
  }

  console.log('\n=== ProjectHub → Photoshop PSD Export ===\n');

  const masterChildren = [];
  let masterWidth = 0;
  let masterHeight = 0;
  const gap = 80;
  let yOffset = 0;

  for (const file of pngs) {
    const id = file.replace(/\.png$/, '');
    const label = LABELS[id] || id;
    const pngPath = path.join(PNG_DIR, file);
    const psdPath = path.join(PSD_DIR, `${id}.psd`);

    const { width, height } = await convertOne(pngPath, psdPath, label);
    console.log(`✓ ${id}.psd (${width}×${height})`);

    masterWidth = Math.max(masterWidth, width);
    masterHeight = yOffset + height;

    const layer = await pngToLayer(pngPath, label);
    layer.top = yOffset;
    layer.left = 0;
    masterChildren.push(layer);
    yOffset += height + gap;
  }

  // Master file: all screens stacked vertically (PSB for large canvas; also split PSD parts)
  const masterPsb = MASTER_PSD.replace('.psd', '.psb');
  savePsd(masterPsb, {
    width: masterWidth,
    height: masterHeight,
    children: masterChildren,
  }, { psb: true });
  console.log(`\n✓ Master file: ProjectHub-Full-Design.psb (${masterWidth}×${masterHeight})`);

  const PSD_MAX = 28000;
  const masterPsdParts = [];

  if (masterHeight <= PSD_MAX && masterWidth <= PSD_MAX) {
    savePsd(MASTER_PSD, {
      width: masterWidth,
      height: masterHeight,
      children: masterChildren,
    });
    masterPsdParts.push('design/photoshop-export/ProjectHub-Full-Design.psd');
    console.log(`✓ Master file: ProjectHub-Full-Design.psd (${masterWidth}×${masterHeight})`);
  } else {
    const packed = [];
    let batch = [];
    let batchHeight = 0;
    for (const layer of masterChildren) {
      const lh = layer.imageData.height;
      if (batch.length && batchHeight + lh > PSD_MAX) {
        packed.push(batch);
        batch = [];
        batchHeight = 0;
      }
      batch.push(layer);
      batchHeight += lh + gap;
    }
    if (batch.length) packed.push(batch);

    packed.forEach((layers, i) => {
      let h = 0;
      let w = 0;
      let y = 0;
      const positioned = layers.map(layer => {
        const copy = { ...layer, top: y, left: 0 };
        w = Math.max(w, layer.imageData.width);
        h = y + layer.imageData.height;
        y += layer.imageData.height + gap;
        return copy;
      });
      const suffix = packed.length === 1 ? '' : `-Part${i + 1}`;
      const fileName = `ProjectHub-Full-Design${suffix}.psd`;
      const partPath = path.join(path.dirname(MASTER_PSD), fileName);
      savePsd(partPath, { width: w, height: h, children: positioned });
      masterPsdParts.push(`design/photoshop-export/${fileName}`);
      console.log(`✓ Master split: ${fileName} (${w}×${h}, ${layers.length} screens)`);
    });
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    format: 'Adobe Photoshop PSD',
    brand: 'Hormuud ProjectHub',
    screenCount: pngs.length,
    individualFiles: 'design/photoshop-export/screens/*.psd',
    masterFile: 'design/photoshop-export/ProjectHub-Full-Design.psb',
    masterPsdParts,
    openIn: 'Adobe Photoshop · Photopea (free)',
    howToOpen: [
      'Open design/photoshop-export/screens/ for each screen as its own PSD',
      'Open ProjectHub-Full-Design.psb for ALL screens in one file (recommended)',
      'Or open ProjectHub-Full-Design-Part1.psd, Part2.psd, Part3.psd (standard PSD split)',
    ],
  };
  fs.writeFileSync(
    path.join(ROOT, 'design', 'photoshop-export', 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`\nDone → ${PSD_DIR}`);
  console.log(`${pngs.length} PSD files + 1 master PSD\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
