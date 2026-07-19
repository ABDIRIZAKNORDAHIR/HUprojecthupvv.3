/**
 * Add OpenAI or Gemini API key to .env
 * Usage:
 *   node scripts/setup-ai-key.mjs
 *   node scripts/setup-ai-key.mjs --openai sk-proj-...
 *   node scripts/setup-ai-key.mjs --gemini AIzaSy...
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return '';
  return fs.readFileSync(ENV_PATH, 'utf8');
}

function writeEnv(content) {
  fs.writeFileSync(ENV_PATH, content, 'utf8');
}

function setKeyInEnv(content, keyName, keyValue) {
  const line = `${keyName}=${keyValue}`;
  const uncommented = new RegExp(`^#\\s*${keyName}=.*$`, 'm');
  const existing = new RegExp(`^${keyName}=.*$`, 'm');

  if (uncommented.test(content)) {
    return content.replace(uncommented, line);
  }
  if (existing.test(content)) {
    return content.replace(existing, line);
  }
  return content.trimEnd() + `\n${line}\n`;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function maskKey(key) {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

async function main() {
  const args = process.argv.slice(2);
  let openaiKey = '';
  let geminiKey = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--openai' && args[i + 1]) openaiKey = args[++i];
    if (args[i] === '--gemini' && args[i + 1]) geminiKey = args[++i];
  }

  console.log('');
  console.log('=== ProjectHub — AI API Key Setup ===');
  console.log('');

  let content = readEnv();

  const openaiMatch = content.match(/^OPENAI_API_KEY=(\S+)/m);
  const geminiMatch = content.match(/^GEMINI_API_KEY=(\S+)/m);

  if (openaiMatch && !openaiMatch[1].includes('PASTE')) {
    console.log(`OpenAI key already set: ${maskKey(openaiMatch[1])}`);
    openaiKey = openaiKey || openaiMatch[1];
  }
  if (geminiMatch && !geminiMatch[1].includes('PASTE')) {
    console.log(`Gemini key already set: ${maskKey(geminiMatch[1])}`);
    geminiKey = geminiKey || geminiMatch[1];
  }

  if (openaiKey && geminiKey && openaiMatch && geminiMatch) {
    console.log('');
    console.log('Both keys already configured. Running test...');
    const { spawnSync } = await import('child_process');
    spawnSync('npm', ['run', 'test-ai', '--prefix', 'server'], { cwd: ROOT, stdio: 'inherit', shell: true });
    process.exit(0);
  }

  if (!openaiKey && !geminiKey) {
    console.log('Choose provider:');
    console.log('  1 = OpenAI ChatGPT  (https://platform.openai.com/api-keys)');
    console.log('  2 = Google Gemini   (https://aistudio.google.com/apikey)');
    console.log('  3 = Both');
    console.log('');

    const choice = await prompt('Enter 1, 2, or 3: ');

    if (choice === '1' || choice === '3') {
      openaiKey = await prompt('Paste your OPENAI_API_KEY (starts with sk-): ');
    }
    if (choice === '2' || choice === '3') {
      geminiKey = await prompt('Paste your GEMINI_API_KEY: ');
    }
  }

  if (!openaiKey && !geminiKey) {
    console.log('');
    console.log('No key entered. Edit .env manually or run this script again.');
    process.exit(1);
  }

  if (openaiKey) {
    if (!openaiKey.startsWith('sk-')) {
      console.warn('Warning: OpenAI keys usually start with sk-');
    }
    content = setKeyInEnv(content, 'OPENAI_API_KEY', openaiKey);
    console.log(`✓ Saved OPENAI_API_KEY (${maskKey(openaiKey)})`);
  }

  if (geminiKey) {
    content = setKeyInEnv(content, 'GEMINI_API_KEY', geminiKey);
    console.log(`✓ Saved GEMINI_API_KEY (${maskKey(geminiKey)})`);
  }

  writeEnv(content);

  console.log('');
  console.log('Testing connection...');
  console.log('');

  const { spawnSync } = await import('child_process');
  const test = spawnSync('npm', ['run', 'test-ai', '--prefix', 'server'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  if (test.status === 0) {
    console.log('');
    console.log('Done! Restart ProjectHub (START_HERE.bat) for teacher AI to work.');
  } else {
    console.log('');
    console.log('Key saved but test failed — check billing or key validity.');
    console.log('Restart API after fixing: close ProjectHub API window, run START_HERE.bat');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
