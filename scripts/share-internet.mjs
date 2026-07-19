/**
 * Share ProjectHub on the internet for FREE via Cloudflare Tunnel.
 * Your PC must stay on. Uses your local SQL Server — no cloud DB needed.
 */
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const port = process.env.SHARE_PORT || '8080';

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
}

console.log('\n=== ProjectHub — Share on Internet (FREE) ===\n');

if (!existsSync(dist)) {
  console.log('[1/4] Building application...');
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
} else {
  console.log('[1/4] Using existing build (run npm run build to refresh)');
}

console.log('[2/4] Starting production server on port', port, '...');
const serverEnv = {
  ...process.env,
  NODE_ENV: 'production',
  SERVE_STATIC: 'true',
  PUBLIC_DEPLOY: 'true',
  PORT: port,
};
const server = spawn(process.execPath, ['server/src/index.js'], {
  cwd: root,
  env: serverEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});

await new Promise((resolve, reject) => {
  const deadline = Date.now() + 60000;
  const check = () => {
    fetch(`http://127.0.0.1:${port}/api/health`)
      .then(r => r.ok ? resolve() : setTimeout(check, 500))
      .catch(() => Date.now() < deadline ? setTimeout(check, 500) : reject(new Error('Server did not start')));
  };
  setTimeout(check, 1500);
});

console.log('[3/4] Server ready at http://localhost:' + port);
console.log('[4/4] Opening Cloudflare Tunnel...\n');
console.log('  >>> Look below for your PUBLIC URL (https://....trycloudflare.com)');
console.log('  >>> Share that link with anyone on the internet.');
console.log('  >>> Keep this window open. Press Ctrl+C to stop.\n');

function startTunnel(bin) {
  const tunnel = spawn(bin, ['tunnel', '--url', `http://127.0.0.1:${port}`], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: bin === 'cloudflared',
  });

  const showUrl = (data) => {
    const text = data.toString();
    process.stdout.write(text);
    const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (m) {
      console.log('\n============================================================');
      console.log('  YOUR PUBLIC LINK:', m[0]);
      console.log('  Login: swilliams@hu.edu / ProjectHub123!  (teacher)');
      console.log('============================================================\n');
    }
  };

  tunnel.stdout.on('data', showUrl);
  tunnel.stderr.on('data', showUrl);

  tunnel.on('exit', (code) => {
    server.kill();
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    tunnel.kill('SIGINT');
    server.kill('SIGINT');
  });
}

// Try cloudflared from PATH, common install, or winget hint
const candidates = ['cloudflared'];
let started = false;
for (const bin of candidates) {
  try {
    execSync(`where ${bin}`, { stdio: 'ignore' });
    startTunnel(bin);
    started = true;
    break;
  } catch {
    /* try next */
  }
}

if (!started) {
  console.log('\ncloudflared is not installed yet.\n');
  console.log('Install it once (free), then run this script again:\n');
  console.log('  winget install --id Cloudflare.cloudflared\n');
  console.log('Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n');
  console.log('Local app is still running at http://localhost:' + port);
  console.log('Press Ctrl+C to stop the server.\n');
  server.stdout?.pipe(process.stdout);
  server.stderr?.pipe(process.stderr);
}
