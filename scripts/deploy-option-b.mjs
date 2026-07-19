/**
 * Option B deploy helper — automates git setup + opens sign-in pages.
 * You only click through browser login ONCE for GitHub + Supabase + Render.
 */
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { cwd: root, stdio: 'inherit', shell: true, ...opts });
}

function runCapture(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', shell: true }).trim();
}

function openUrl(url) {
  try {
    execSync(`start "" "${url}"`, { shell: true, stdio: 'ignore' });
  } catch {
    console.log('Open:', url);
  }
}

function ghPath() {
  const candidates = [
    'gh',
    'C:\\Program Files\\GitHub CLI\\gh.exe',
    `${process.env.LOCALAPPDATA}\\Programs\\GitHub CLI\\gh.exe`,
  ];
  for (const c of candidates) {
    try {
      execSync(`"${c}" --version`, { stdio: 'ignore', shell: true });
      return c;
    } catch {
      /* next */
    }
  }
  return null;
}

function gitPath() {
  const candidates = ['git', 'C:\\Program Files\\Git\\cmd\\git.exe'];
  for (const c of candidates) {
    try {
      execSync(`"${c}" --version`, { stdio: 'ignore', shell: true });
      return c;
    } catch {
      /* next */
    }
  }
  return null;
}

function readGroqKey() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return '';
  const m = fs.readFileSync(envPath, 'utf8').match(/^GROQ_API_KEY=(.+)$/m);
  return m?.[1]?.trim() || '';
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

console.log('\n=== ProjectHub Option B — Automated Deploy ===\n');

const git = gitPath();
if (!git) {
  console.error('Git not found. Run: winget install Git.Git');
  console.error('Then run this script again.');
  process.exit(1);
}

// 1. Git init + commit
if (!fs.existsSync(path.join(root, '.git'))) {
  run(`"${git}" init`);
  run(`"${git}" branch -M main`);
}
run(`"${git}" add -A`);
try {
  run(`"${git}" commit -m "Deploy Hormuud ProjectHub to cloud"`);
} catch {
  console.log('(Nothing new to commit, continuing...)');
}

const groq = readGroqKey();
if (groq) {
  fs.writeFileSync(
    path.join(root, 'RENDER_ENV_COPY.txt'),
    `Paste these in Render → hormuud-projecthub → Environment:\n\n` +
      `GROQ_API_KEY=${groq}\n\n` +
      `DATABASE_URL=(paste from Supabase after Step 1)\n`,
  );
  console.log('\nCreated RENDER_ENV_COPY.txt with your GROQ key for Render.\n');
}

// 2. GitHub
const gh = ghPath();
if (!gh) {
  console.log('GitHub CLI not installed.');
  openUrl('https://desktop.github.com');
  console.log('\nInstall GitHub Desktop, publish folder, then open Render.');
  openUrl('https://supabase.com/dashboard');
  openUrl('https://dashboard.render.com/blueprint/new');
  process.exit(0);
}

let authed = false;
try {
  runCapture(`"${gh}" auth status`);
  authed = true;
} catch {
  console.log('\n--- GitHub login (one time) ---');
  console.log('A browser window will open. Click Authorize.\n');
  run(`"${gh}" auth login -w -p https -h github.com`);
  authed = true;
}

if (authed) {
  console.log('\n--- Creating GitHub repo and pushing code ---\n');
  try {
    run(`"${gh}" repo create hormuud-projecthub --public --source=. --remote=origin --push`);
    console.log('\nGitHub repo created and code pushed!\n');
  } catch {
    try {
      run(`"${gh}" repo view hormuud-projecthub`);
      run(`"${gh}" push -u origin main`);
    } catch (e) {
      console.error('Push failed. Use GitHub Desktop to publish, then continue.');
    }
  }

  const repoUrl = runCapture(`"${gh}" repo view --json url -q .url`).replace(/"/g, '');
  console.log('Repo:', repoUrl);

  openUrl('https://supabase.com/dashboard/project/new');
  console.log('\n--- STEP 1: Supabase (browser opened) ---');
  console.log('Create project "projecthub", copy DATABASE URI, replace [YOUR-PASSWORD]\n');

  const dbUrl = await prompt('Paste DATABASE_URL here when ready (or Enter to skip): ');
  if (dbUrl) {
    const txt = fs.readFileSync(path.join(root, 'RENDER_ENV_COPY.txt'), 'utf8');
    fs.writeFileSync(
      path.join(root, 'RENDER_ENV_COPY.txt'),
      txt.replace('DATABASE_URL=(paste from Supabase after Step 1)', `DATABASE_URL=${dbUrl}`),
    );
  }

  openUrl('https://dashboard.render.com/blueprint/new');
  console.log('\n--- STEP 2: Render (browser opened) ---');
  console.log('New → Blueprint → select hormuud-projecthub → Apply');
  console.log('Add env vars from RENDER_ENV_COPY.txt → Save\n');

  openUrl(repoUrl);
}

console.log('\n=== When Render shows LIVE, run SET_APP_URL.bat with your Render URL ===\n');
