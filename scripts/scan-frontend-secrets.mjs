#!/usr/bin/env node
/**
 * Fail the build if production frontend assets contain secret-looking strings.
 * Run after `vite build` (npm run security:scan-bundle).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '../dist/assets');

const patterns = [
  { name: 'OpenAI key', re: /sk-[A-Za-z0-9]{20,}/ },
  { name: 'JWT secret literal', re: /dev-secret-change-in-production/ },
  { name: 'Groq/OpenAI env leakage', re: /GROQ_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY|JWT_SECRET|SMTP_PASS|DATABASE_URL|VAPID_PRIVATE_KEY/ },
  { name: 'Private key block', re: /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/ },
];

if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets missing — run npm run build first');
  process.exit(1);
}

const findings = [];
for (const file of fs.readdirSync(assetsDir)) {
  if (!/\.(js|css|map)$/i.test(file)) continue;
  const text = fs.readFileSync(path.join(assetsDir, file), 'utf8');
  for (const pattern of patterns) {
    if (pattern.re.test(text)) findings.push(`${file}: ${pattern.name}`);
  }
}

if (findings.length) {
  console.error('Secret scan failed:\n' + findings.map(f => ` - ${f}`).join('\n'));
  process.exit(1);
}

console.log('Secret scan passed: no sensitive patterns in dist/assets');
