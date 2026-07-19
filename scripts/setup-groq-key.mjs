/**
 * Save FREE Groq API key to .env
 * Groq: https://console.groq.com/keys — no credit card required
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

function readEnv() {
  return fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
}

function writeEnv(content) {
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

function setEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const commented = new RegExp(`^#\\s*${key}=.*$`, 'm');
  const existing = new RegExp(`^${key}=.*$`, 'm');
  if (commented.test(content)) return content.replace(commented, line);
  if (existing.test(content)) return content.replace(existing, line);
  return content.trimEnd() + `\n${line}\n`;
}

function prompt(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, a => { rl.close(); resolve(a.trim()); }));
}

async function main() {
  const argKey = process.argv[2]?.trim();
  let key = argKey || '';

  console.log('');
  console.log('=== Groq FREE AI Setup ===');
  console.log('Get key: https://console.groq.com/keys (no credit card)');
  console.log('');

  if (!key) {
    key = await prompt('Paste your Groq API key (gsk_...): ');
  }

  if (!key) {
    console.log('No key entered.');
    process.exit(1);
  }

  if (!key.startsWith('gsk_')) {
    console.warn('Warning: Groq keys usually start with gsk_');
  }

  let content = readEnv();
  content = setEnvVar(content, 'GROQ_API_KEY', key);
  content = setEnvVar(content, 'GROQ_MODEL', 'llama-3.3-70b-versatile');
  content = setEnvVar(content, 'GROQ_BASE_URL', 'https://api.groq.com/openai/v1');
  content = setEnvVar(content, 'AI_PROVIDER', 'groq');
  content = setEnvVar(content, 'AI_FALLBACK', 'false');

  if (!content.includes('GROQ_API_KEY')) {
    content += `\n# FREE AI — Groq (no credit card)\nGROQ_API_KEY=${key}\nGROQ_MODEL=llama-3.3-70b-versatile\nGROQ_BASE_URL=https://api.groq.com/openai/v1\nAI_PROVIDER=groq\nAI_FALLBACK=false\n`;
  }

  writeEnv(content);
  console.log('✓ Groq key saved to .env');
  console.log('');
  console.log('Testing...');

  const { spawnSync } = await import('child_process');
  const test = spawnSync('npm', ['run', 'test-ai', '--prefix', 'server'], {
    cwd: ROOT, stdio: 'inherit', shell: true,
  });

  if (test.status === 0) {
    console.log('');
    console.log('SUCCESS! Restart ProjectHub with START_HERE.bat');
  } else {
    console.log('');
    console.log('Key saved. Restart START_HERE.bat and try Re-analyze in the app.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
