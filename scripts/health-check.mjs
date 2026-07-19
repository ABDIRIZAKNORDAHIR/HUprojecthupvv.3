/**
 * Integration check — works on port 8080 (all-in-one) or 3004 (dev)
 */
const BASES = [
  process.env.PROJECTHUB_API,
  'http://localhost:8080/api',
  'http://localhost:3004/api',
].filter(Boolean);

async function resolveApi() {
  const seen = new Set();
  for (const base of BASES) {
    if (seen.has(base)) continue;
    seen.add(base);
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return base;
    } catch { /* try next */ }
  }
  throw new Error('No API on port 8080 or 3004. Run: npm start');
}

function dbOk(health) {
  if (!health.database) return false;
  const d = String(health.database).toLowerCase();
  return !d.includes('fail') && !d.includes('error');
}

async function test() {
  const API = await resolveApi();
  const results = [];

  try {
    const health = await fetch(`${API}/health`).then(r => r.json());
    const database = dbOk(health) ? 'OK' : `FAIL: ${health.database}`;
    results.push(['Database + API', health.status === 'ok' && dbOk(health) ? 'OK' : database]);
    results.push(['AI', health.ai?.configured ? `OK (${health.ai.provider})` : `WARN: ${health.ai?.message || 'not configured'}`]);
  } catch (e) {
    results.push(['Database + API', 'FAIL: ' + e.message]);
  }

  try {
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hu.edu', password: 'ProjectHub123!', portalRole: 'admin' }),
    });
    const login = await loginRes.json();
    if (!loginRes.ok) throw new Error(login.error || loginRes.status);
    results.push(['Admin login', 'OK']);
    const token = login.token;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    for (const [name, path] of [
      ['auth/me', '/auth/me'],
      ['admin/stats', '/admin/stats'],
      ['admin/live', '/admin/live'],
      ['projects', '/projects'],
      ['settings', '/settings'],
    ]) {
      const r = await fetch(`${API}${path}`, { headers });
      const d = await r.json().catch(() => ({}));
      results.push([name, r.ok ? 'OK' : `FAIL ${r.status}: ${d.error || ''}`]);
    }

    const studentLogin = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        universityId: 'HU000-1001',
        email: 'alex.chen@hu.edu',
        password: 'ProjectHub123!',
      }),
    });
    const sl = await studentLogin.json();
    results.push(['Student login', studentLogin.ok ? 'OK' : `FAIL: ${sl.error}`]);
  } catch (e) {
    results.push(['Auth flow', 'FAIL: ' + e.message]);
  }

  console.log('\n=== ProjectHub Integration Check ===\n');
  for (const [name, status] of results) {
    const ok = status.startsWith('OK') || status.startsWith('WARN');
    console.log(`${ok ? '✓' : '✗'} ${name}: ${status}`);
  }
  const failed = results.filter(([, s]) => s.startsWith('FAIL'));
  console.log(failed.length ? `\n${failed.length} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed.length ? 1 : 0);
}

test();
