
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { ensureDevStack } from './start-dev-windows.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uiPort = 5180;
const linkFile = path.join(root, 'PUBLIC_LINK.txt');

const cloudflaredCandidates = [
  process.env.CLOUDFLARED_PATH,
  'cloudflared',
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
].filter(Boolean);

function findCloudflared() {
  for (const bin of cloudflaredCandidates) {
    if (bin.includes('\\') || bin.includes('/')) {
      if (fs.existsSync(bin)) return bin;
      continue;
    }
    try {
      execSync(`where ${bin}`, { stdio: 'ignore' });
      return bin;
    } catch {
      /* try next */
    }
  }
  return null;
}

function openApp(url) {
  const bat = path.join(__dirname, 'open-app.bat');
  if (process.platform === 'win32' && fs.existsSync(bat)) {
    spawn('cmd', ['/c', bat, url], { detached: true, stdio: 'ignore' }).unref();
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

function savePublicLink(url) {
  const body = [
    'Hormuud ProjectHub — Public link',
    `Created: ${new Date().toLocaleString()}`,
    '',
    `PUBLIC LINK: ${url}`,
    '',
    'Share this link while this PC and ProjectHub are running.',
    'Keep the ProjectHub Cloud window open.',
  ].join('\n');
  fs.writeFileSync(linkFile, body, 'utf8');
}

console.log('\n=== ProjectHub — Share on Internet (Cloud) ===\n');
console.log('Starting API + UI, then opening a Cloudflare public link...\n');

await ensureDevStack({ restart: true });

const cloudflared = findCloudflared();
if (!cloudflared) {
  console.log('\ncloudflared is not installed.\n');
  console.log('Install once, then run this again:\n');
  console.log('  winget install --id Cloudflare.cloudflared\n');
  process.exit(1);
}

console.log('[5/5] Opening Cloudflare tunnel...\n');
console.log('  >>> Your public link will appear below and open automatically.');
console.log('  >>> Keep this window open while others use the app.\n');

let opened = false;

const tunnel = spawn(
  cloudflared,
  ['tunnel', '--url', `http://127.0.0.1:${uiPort}`, '--no-autoupdate'],
  { stdio: ['ignore', 'pipe', 'pipe'], shell: cloudflared === 'cloudflared' },
);

const handleOutput = (data) => {
  const text = data.toString();
  process.stdout.write(text);
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (match && !opened) {
    opened = true;
    const publicUrl = match[0];
    savePublicLink(publicUrl);
    console.log('\n============================================================');
    console.log('  YOUR PUBLIC LINK:', publicUrl);
    console.log('  Saved to PUBLIC_LINK.txt');
    console.log('============================================================\n');
    openApp(publicUrl);
  }
};

tunnel.stdout.on('data', handleOutput);
tunnel.stderr.on('data', handleOutput);

tunnel.on('exit', (code) => {
  process.exit(code ?? 0);
});

process.on('SIGINT', () => {
  tunnel.kill('SIGINT');
});
