
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const port = process.env.PORT || '8080';
const baseUrl = `http://localhost:${port}`;
const apiUrl = `${baseUrl}/api`;

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

function run(cmd, opts = {}) {
  execSync(cmd, { cwd: root, stdio: 'inherit', shell: true, ...opts });
}

function openApp(url) {
  if (process.platform !== 'win32') {
    try {
      execSync(`open "${url}"`, { stdio: 'ignore', shell: true });
    } catch {
      console.log('Open:', url);
    }
    return;
  }
  const chromePaths = [
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(p => p && fs.existsSync(p));
  const chrome = chromePaths[0];
  if (chrome) {
    spawn(chrome, [`--app=${url}`, '--window-size=1280,840'], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  try {
    execSync(`start "" msedge --app=${url}`, { stdio: 'ignore', shell: true });
  } catch {
    execSync(`start "" "${url}"`, { stdio: 'ignore', shell: true });
  }
}

async function waitForHealth(timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${apiUrl}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const health = await res.json();
      if (health.status !== 'ok') throw new Error('API not ready');
      const dbOk = health.database && !String(health.database).toLowerCase().includes('fail');
      if (!dbOk) throw new Error(`Database: ${health.database}`);
      return health;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Timed out waiting for database + API');
}

console.log('\n========================================');
console.log('  Hormuud ProjectHub — Full Stack Start');
console.log('  Database + API + AI + Frontend');
console.log('========================================\n');

log('1/5', 'Stopping old services...');
try {
  run('node scripts/stop-services.mjs 8080 3004 5180');
} catch { /* ignore */ }

log('2/5', 'Preparing MySQL database...');
try {
  run('node server/src/setupDatabase.js');
} catch (e) {
  console.error('\nDatabase setup failed. Start MySQL (localhost:3306) and check .env (DB_DRIVER=mysql).\n');
  process.exit(1);
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  log('3/5', 'Building frontend...');
  run('npm run build');
} else {
  log('3/5', 'Frontend build OK');
}

log('4/5', 'Starting API + frontend on port ' + port + '...');
const server = spawn(process.execPath, ['server/src/index.js'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    SERVE_STATIC: 'true',
    PUBLIC_DEPLOY: 'true',
    PORT: port,
  },
  stdio: 'inherit',
  shell: false,
});

let health;
try {
  health = await waitForHealth();
} catch (err) {
  console.error('\n' + err.message + '\n');
  server.kill();
  process.exit(1);
}

log('5/5', 'Opening ProjectHub app window...');
openApp(baseUrl + '/');

console.log('\n========================================');
console.log('  PROJECTHUB IS RUNNING');
console.log('========================================');
console.log('  App:      ' + baseUrl + '/');
console.log('  Teacher:  ' + baseUrl + '/teacher');
console.log('  Student:  ' + baseUrl + '/student');
console.log('  API:      ' + apiUrl + '/health');
console.log('  Database: ' + health.database);
console.log('  AI:       ' + (health.ai?.configured ? health.ai.message : 'Not configured — run SETUP_FREE_AI.bat'));
console.log('========================================');
console.log('\nPress Ctrl+C in this window to stop the server.\n');

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});

server.on('exit', (code) => process.exit(code ?? 0));
