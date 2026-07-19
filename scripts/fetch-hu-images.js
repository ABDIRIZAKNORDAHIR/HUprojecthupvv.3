const urls = [
  'https://hu.edu.so/',
  'https://hu.edu.so/gallery/',
  'https://hu.edu.so/students/',
];

for (const url of urls) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const imgs = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi)]
      .map(m => m[1])
      .filter(u => !u.includes('emoji') && !u.includes('gravatar'));
    const unique = [...new Set(imgs.map(u => u.startsWith('http') ? u : new URL(u, url).href))]
      .filter(u => !/logo|President|guddoomiye|Vice-Chancellor|fartuun/i.test(u));
    console.log('\n', url, 'status', res.status, 'images:', unique.length);
    unique.slice(0, 25).forEach(u => console.log(u));
  } catch (e) {
    console.log(url, 'ERR', e.message);
  }
}
