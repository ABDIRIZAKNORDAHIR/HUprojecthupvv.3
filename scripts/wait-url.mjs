/**
 * Wait until URL returns HTTP 200.
 * Usage: node scripts/wait-url.mjs <url> [maxAttempts]
 */
const url = process.argv[2];
const maxAttempts = Number(process.argv[3]) || 45;
const timeoutMs = 3000;

if (!url) {
  console.error('Usage: node wait-url.mjs <url> [maxAttempts]');
  process.exit(1);
}

for (let i = 0; i < maxAttempts; i++) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.ok) {
      console.log(`OK: ${url}`);
      process.exit(0);
    }
  } catch {
    /* retry */
  }
  await new Promise((r) => setTimeout(r, 1000));
}

console.error(`FAIL: ${url}`);
process.exit(1);
