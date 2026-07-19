const urls = [
  'http://localhost:5180/',
  'http://localhost:5180/src/main.tsx',
  'http://localhost:5180/@vite/client',
];
for (const url of urls) {
  try {
    const r = await fetch(url);
    const t = await r.text();
    console.log(url, '->', r.status, 'len', t.length);
    if (url.endsWith('/') && t.length < 2000) console.log(t);
    if (!r.ok) console.log('BODY:', t.slice(0, 300));
  } catch (e) {
    console.log(url, '-> FAIL', e.message);
  }
}
