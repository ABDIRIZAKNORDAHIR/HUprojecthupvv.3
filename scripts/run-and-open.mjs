/**
 * npm run start:all — build if needed, start server, open browser
 */
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const port = '8080';
const url = `http://localhost:${port}/`;

function openBrowser(target) {
  const cmd = process.platform === 'win32' ? `start "" "${target}"` : process.platform === 'darwin' ? `open "${target}"` : `xdg-open "${target}"`;
  try {
    execSync(cmd, { stdio: 'ignore', shell: true });
  } catch {
    console.log('Open in browser:', target);
  }
}

if (!fs.existsSync(dist)) {
  console.log('Building app...');
  execSync('npm run build', { cwd: root, stdio: 'inherit', shell: true });
}

console.log('Starting ProjectHub on', url);
const server = spawn(process.execPath, ['server/src/index.js'], {
  cwd: root,
  env: { ...process.env, NODE_ENV: 'production', SERVE_STATIC: 'true', PUBLIC_DEPLOY: 'true', PORT: port },
  stdio: 'inherit',
  shell: false,
});

await new Promise((resolve, reject) => {
  const deadline = Date.now() + 90000;
  const tick = () => {
    fetch(`${url}api/health`)
      .then(r => r.ok ? resolve() : setTimeout(tick, 800))
      .catch(() => Date.now() < deadline ? setTimeout(tick, 800) : reject(new Error('Server failed to start')));
  };
  setTimeout(tick, 2000);
});

console.log('\nOpening ProjectHub in your browser...\n');
openBrowser(url);

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});
