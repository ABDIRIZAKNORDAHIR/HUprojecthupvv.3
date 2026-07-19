/**
 * Production server: built UI + API on one port (for tunnel / cloud deploy).
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

if (!existsSync(dist)) {
  console.error('Missing dist/ folder. Run: npm run build');
  process.exit(1);
}

const port = process.env.PORT || '8080';
const env = {
  ...process.env,
  NODE_ENV: 'production',
  SERVE_STATIC: 'true',
  PUBLIC_DEPLOY: 'true',
  PORT: port,
};

const server = spawn(process.execPath, ['server/src/index.js'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: false,
});

server.on('exit', (code) => process.exit(code ?? 0));

process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));

console.log(`Production ProjectHub on http://localhost:${port}`);
