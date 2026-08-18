
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ensureDevStack } from './start-dev-windows.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const appUrl = 'http://localhost:5180/';

function openApp(url) {
  const bat = path.join(__dirname, 'open-app.bat');
  if (process.platform === 'win32' && fs.existsSync(bat)) {
    execSync(`call "${bat}" "${url}"`, { cwd: root, stdio: 'ignore', shell: true });
    return;
  }
  const cmd = process.platform === 'darwin'
    ? `open "${url}"`
    : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  try {
    execSync(cmd, { stdio: 'ignore', shell: true });
  } catch {
    console.log('Open in browser:', url);
  }
}

console.log('\n========================================');
console.log('  Hormuud ProjectHub — Starting');
console.log('  Database + API + Frontend (latest)');
console.log('========================================\n');

try {
  await ensureDevStack({ restart: true });
} catch (err) {
  console.error('\nStartup failed:', err.message);
  console.error('Check MySQL is running and review .env (DB_DRIVER=mysql).\n');
  process.exit(1);
}

console.log('\nOpening ProjectHub...\n');
openApp(appUrl);

console.log('========================================');
console.log('  PROJECTHUB IS RUNNING');
console.log('========================================');
console.log('  App:     ' + appUrl);
console.log('  Teacher: ' + appUrl + 'teacher');
console.log('  Student: ' + appUrl + 'student');
console.log('  API:     http://localhost:3004/api/health');
console.log('========================================');
console.log('\nKeep the ProjectHub API and UI windows open.\n');
console.log('Share online: double-click SHARE_ON_INTERNET.bat\n');
