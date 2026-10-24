// Local-only screenshots for branch catalog-real. Needs `npm run build` + `PORT=8080 npx tsx gerdoo/server.ts` running.
import { chromium } from 'playwright';
const base = process.env.BASE ?? 'http://127.0.0.1:8080';
const out = process.env.OUT ?? '../reports/shots';
const pages = [['home', '/'], ['women', '/women'], ['men', '/men'], ['product-p08', '/product/p08'], ['product-p01', '/product/p01'], ['product-p35', '/product/p35'], ['cart', '/cart']];
const b = await chromium.launch();
const report = [];
for (const [size, vp] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 375, height: 740 }]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  for (const [name, path] of pages) {
    const p = await ctx.newPage(); const errors = []; const bad = [];
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    p.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    await p.goto(base + path, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    // scroll to trigger lazy images, then back
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await p.waitForLoadState('networkidle'); await p.waitForTimeout(300);
    const imgs = await p.evaluate(() => [...document.images].map(i => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 })));
    const info = await p.evaluate(() => ({
      priceTexts: [...document.querySelectorAll('.pc__now, .pdp__now')].slice(0, 3).map(e => e.textContent),
      cardCartButtons: document.querySelectorAll('.pc__cart').length,
      addDisabled: document.querySelector('.pdp__add')?.hasAttribute('disabled') ?? null,
      sizeFieldset: !!document.querySelector('#options'),
    }));
    const file = `${out}/catalog-real-${size}-${name}.png`;
    await p.screenshot({ path: file, fullPage: true });
    report.push({ size, name, file, images: imgs.length, brokenImages: imgs.filter(i => !i.ok).map(i => i.src), productImages: imgs.filter(i => i.src.includes('/img/products/')).length, errors, httpErrors: bad, ...info });
    await p.close();
  }
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(report, null, 1));
