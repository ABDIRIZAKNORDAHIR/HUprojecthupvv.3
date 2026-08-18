
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const uiPort = 5180;
const apiPort = 3004;
const uiUrl = `http://127.0.0.1:${uiPort}/`;
const apiHealth = `http://127.0.0.1:${apiPort}/api/health`;

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

async function isUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitFor(url, label, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp(url)) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for ${label} (${url})`);
}

function startWindow(title, command) {
  if (process.platform !== 'win32') {
    spawn('sh', ['-c', command], { cwd: root, detached: true, stdio: 'ignore' }).unref();
    return;
  }
  const inner = `cd /d "${root}" && call scripts\\env-path.bat && ${command}`;
  execSync(`start "${title}" cmd /k "${inner}"`, { cwd: root, stdio: 'ignore', shell: true });
}

export async function ensureDevStack({ restart = false } = {}) {
  if (restart) {
    log('1/4', 'Stopping old services...');
    try {
      execSync(`node scripts/stop-services.mjs ${apiPort} ${uiPort} 8080`, { cwd: root, stdio: 'inherit' });
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  const apiRunning = await isUp(apiHealth);
  const uiRunning = await isUp(uiUrl);

  if (!apiRunning) {
    log('2/4', `Starting API on port ${apiPort}...`);
    startWindow('ProjectHub API', 'title ProjectHub API && color 0E && npm.cmd run dev:server');
    await waitFor(apiHealth, 'API');
  } else {
    log('2/4', `API already running on port ${apiPort}`);
  }

  if (!uiRunning) {
    log('3/4', `Starting UI on port ${uiPort}...`);
    startWindow('ProjectHub UI', 'title ProjectHub UI && color 0A && npm.cmd run dev');
    await waitFor(uiUrl, 'UI');
  } else {
    log('3/4', `UI already running on port ${uiPort}`);
  }

  log('4/4', 'Development stack ready');
  return { uiUrl, apiHealth, uiPort, apiPort };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const restart = process.argv.includes('--restart');
  console.log('\n=== ProjectHub — Development Stack ===\n');
  try {
    const { uiUrl } = await ensureDevStack({ restart });
    console.log(`\nReady at ${uiUrl}\n`);
  } catch (err) {
    console.error('\n' + err.message + '\n');
    process.exit(1);
  }
}
