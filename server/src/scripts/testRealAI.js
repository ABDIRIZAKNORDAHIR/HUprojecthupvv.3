import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { isRealAIConfigured, getActiveAIProvider, getAIProviderInfo } from '../services/aiEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return { ok: false, skipped: true };

  const baseUrl = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: ProjectHub real AI is working.' }],
      max_tokens: 20,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try { detail = JSON.parse(text).error?.message || detail; } catch { /* ignore */ }
    return { ok: false, provider: 'groq', error: `HTTP ${res.status}: ${detail}` };
  }

  const data = JSON.parse(text);
  return { ok: true, provider: 'groq', model, reply: data.choices?.[0]?.message?.content?.trim() };
}

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return { ok: false, skipped: true };

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: ProjectHub real AI is working.' }],
      max_tokens: 20,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try { detail = JSON.parse(text).error?.message || detail; } catch { /* ignore */ }
    return { ok: false, provider: 'openai', error: `HTTP ${res.status}: ${detail}` };
  }

  const data = JSON.parse(text);
  return { ok: true, provider: 'openai', model, reply: data.choices?.[0]?.message?.content?.trim() };
}

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || !apiKey.startsWith('AIzaSy')) return { ok: false, skipped: true };

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const baseUrl = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');

  const res = await fetch(
    `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: ProjectHub real AI is working.' }] }],
        generationConfig: { maxOutputTokens: 20, temperature: 0 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 300);
    try { detail = JSON.parse(text).error?.message || detail; } catch { /* ignore */ }
    return { ok: false, provider: 'gemini', error: `HTTP ${res.status}: ${detail}` };
  }

  const data = JSON.parse(text);
  const reply = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
  return { ok: true, provider: 'gemini', model, reply };
}

async function main() {
  console.log('');
  console.log('ProjectHub — Real AI connection test');
  console.log('===================================');

  if (!isRealAIConfigured()) {
    console.log('');
    console.log('FAIL: No AI configured.');
    console.log('');
    console.log('FREE fix (no credit card):');
    console.log('  Double-click SETUP_FREE_AI.bat');
    console.log('  Get key at https://console.groq.com/keys');
    console.log('');
    process.exit(1);
  }

  const info = getAIProviderInfo();
  console.log(`Active provider: ${getActiveAIProvider()}`);
  console.log(`Model:           ${info.model}`);
  console.log(`Free tier:       ${info.isFree ? 'yes' : 'no'}`);
  console.log('');

  const groq = await testGroq();
  const openai = await testOpenAI();
  const gemini = await testGemini();

  if (groq.ok) {
    console.log('✓ Groq (FREE) — working');
    console.log(`  Reply: "${groq.reply}"`);
  } else if (!groq.skipped) {
    console.log('✗ Groq — failed');
    console.log(`  ${groq.error}`);
  } else {
    console.log('○ Groq — not configured (run SETUP_FREE_AI.bat)');
  }

  console.log('');

  if (openai.ok) {
    console.log('✓ OpenAI — working');
    console.log(`  Reply: "${openai.reply}"`);
  } else if (!openai.skipped) {
    console.log('✗ OpenAI — failed (needs billing — use Groq instead)');
  }

  if (gemini.ok) {
    console.log('✓ Gemini — working');
    console.log(`  Reply: "${gemini.reply}"`);
  } else if (!gemini.skipped) {
    console.log('✗ Gemini — failed');
    console.log(`  ${gemini.error}`);
  }

  console.log('');

  if (groq.ok || openai.ok || gemini.ok) {
    console.log('SUCCESS: Real AI is ready for teachers!');
    process.exit(0);
  }

  console.log('FAIL: Add a FREE Groq key — SETUP_FREE_AI.bat');
  process.exit(1);
}

main();
