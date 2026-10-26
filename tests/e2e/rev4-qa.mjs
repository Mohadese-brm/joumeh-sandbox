// rev4 (Mohadeseh 2026-10-26) QA: title-row basket button on the shared product card (shop grid + home rows).
// Circle centre vs title-text centre (≤1px), size 40/32, 44px hit area, teal fill + white icon, hover/focus darker teal + ring,
// long-title truncation clearance, unpriced → no button, click → not the card link (PDP size-required state), then size → add → toast.
// BASE=<url> TAG=<rev4-local|rev4-preview> OUT=<dir> [SHARE=<token>] node tests/e2e/rev4-qa.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const base = process.env.BASE ?? 'http://127.0.0.1:8091', tag = process.env.TAG ?? 'rev4-local', out = process.env.OUT ?? '../reports/shots/design-batch-2026-10-26';
mkdirSync(out, { recursive: true });
const R = { base, tag, at: new Date().toISOString(), console: [], fails: [] };
const ok = (c, m) => { if (!c) R.fails.push(m); };
const b = await chromium.launch();
const measure = () => [...document.querySelectorAll('.pc')].map(c => {
  const n = c.querySelector('.pc__name'), bt = c.querySelector('.pc__cart'), l = c.querySelector('.pc__link'), pr = c.querySelector('.pc__price');
  const rg = document.createRange(); rg.selectNodeContents(n); const t = rg.getBoundingClientRect(), a = n.getBoundingClientRect(), L = l.getBoundingClientRect();
  if (!bt) return { name: n.textContent, priced: !c.querySelector('.pc__now--onreq'), button: false };
  const q = bt.getBoundingClientRect(), cs = getComputedStyle(bt), af = getComputedStyle(bt, '::after');
  const ic = bt.querySelector('svg').getBoundingClientRect(), path = getComputedStyle(bt.querySelector('svg path'));
  const textRightEdgeVisible = a.left + parseFloat(getComputedStyle(n).paddingLeft); // name content box left edge (RTL: text ends here)
  return { name: n.textContent, button: true, label: bt.getAttribute('aria-label'), d: q.width, h: q.height,
    centreDelta: Math.abs((t.top + t.bottom) / 2 - (q.top + q.bottom) / 2), nameBoxCentreDelta: Math.abs((a.top + a.bottom) / 2 - (q.top + q.bottom) / 2),
    hitArea: q.width - 2 * parseFloat(af.left), btnLeftFromBox: q.left - L.left, clearanceToText: textRightEdgeVisible - q.right,
    priceTopVsBtnBottom: pr.getBoundingClientRect().top - q.bottom, bg: cs.backgroundColor, iconColor: path.stroke !== 'none' ? path.stroke : path.fill, icon: [ic.width, ic.height].map(Math.round),
    insideLink: !!bt.closest('a'), truncated: n.scrollWidth > n.clientWidth };
});
for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, locale: 'fa-IR' });
  if (process.env.SHARE) { const sp = await ctx.newPage(); await sp.goto(base + '/?_vercel_share=' + process.env.SHARE, { waitUntil: 'networkidle' }); await sp.close(); }
  const page = async path => { const p = await ctx.newPage(); p.on('console', m => m.type() === 'error' && R.console.push(`${vp} ${path}: ${m.text()}`)); p.on('pageerror', e => R.console.push(`${vp} ${path}: ${e.message}`)); await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForSelector('.pc'); return p; };
  const M = R[vp] = {};
  for (const path of ['/women', '/']) {
    const p = await page(path);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } scrollTo(0, 0); });
    const cards = await p.evaluate(measure); M[path] = cards; 
    for (const c of cards.filter(c => c.button)) {
      ok(c.centreDelta <= 1, `${vp}${path} ${c.name} centre Δ ${c.centreDelta}`);
      ok(c.d === (vp === 'desktop' ? 40 : 32) && c.h === c.d, `${vp}${path} ${c.name} size ${c.d}x${c.h}`);
      ok(c.hitArea >= 44, `${vp}${path} hit ${c.hitArea}`); ok(c.bg === 'rgb(28, 116, 119)', `${vp}${path} bg ${c.bg}`);
      ok(/255, 255, 255|#fff/i.test(c.iconColor), `${vp}${path} icon ${c.iconColor}`); ok(!c.insideLink, `${vp}${path} button inside link`);
      ok(c.clearanceToText >= 8, `${vp}${path} ${c.name} clearance ${c.clearanceToText}`); ok(c.priceTopVsBtnBottom >= 0, `${vp}${path} price overlaps button`);
      ok(c.label.startsWith('افزودن به سبد خرید'), `${vp}${path} label`);
    }
    for (const c of cards.filter(c => !c.button)) ok(!c.priced, `${vp}${path} priced card without button: ${c.name}`);
    if (path === '/women') {
      const card = p.locator('.pc.pc--buy').first(); await card.scrollIntoViewIfNeeded();
      await card.screenshot({ path: `${out}/${tag}-${vp}-card.png` });
      await p.locator('.pc.pc--buy .pc__cart').first().hover(); await p.waitForTimeout(250);
      M.hoverBg = await p.locator('.pc.pc--buy .pc__cart').first().evaluate(e => getComputedStyle(e).backgroundColor);
      await card.screenshot({ path: `${out}/${tag}-${vp}-card-hover.png` });
      await p.mouse.move(0, 0); await p.locator('.pc.pc--buy .pc__cart').first().focus(); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(250);
      M.focus = await p.locator('.pc.pc--buy .pc__cart').first().evaluate(e => { const s = getComputedStyle(e); return { focused: e === document.activeElement, bg: s.backgroundColor, outline: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`, offset: s.outlineOffset }; });
      await card.screenshot({ path: `${out}/${tag}-${vp}-card-focus.png` });
      ok(M.hoverBg === 'rgb(21, 89, 91)', `${vp} hover ${M.hoverBg}`); ok(M.focus.focused && M.focus.outline.startsWith('3px solid rgb(28, 116, 119)'), `${vp} focus ${JSON.stringify(M.focus)}`);
      // long title: inject a very long name into the first priced card and re-measure
      await p.evaluate(() => { const n = document.querySelector('.pc.pc--buy .pc__name'); n.textContent = 'مانتو کتان کویری با یقه ایستاده و دکمه‌های صدفی و آستین بلند و جیب‌دار (نمونه)'; });
      M.longTitle = (await p.evaluate(measure)).find(c => c.button);
      ok(M.longTitle.truncated && M.longTitle.clearanceToText >= 8 && M.longTitle.centreDelta <= 1, `${vp} long title ${JSON.stringify(M.longTitle)}`);
      await card.screenshot({ path: `${out}/${tag}-${vp}-card-longtitle.png` });
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('.pc__cart');
      // click: must not follow the card link; existing P9 logic → PDP size picker with size-required state
      const href = await p.locator('.pc.pc--buy .pc__link').first().getAttribute('href');
      await p.locator('.pc.pc--buy .pc__cart').first().click();
      await p.waitForSelector('#pdp-err', { timeout: 15000 });
      M.click = { cardHref: href, after: p.url().replace(base, ''), err: await p.locator('#pdp-err').textContent(), focusedSize: await p.evaluate(() => document.activeElement?.getAttribute('value')) };
      ok(M.click.after.endsWith('#options') && M.click.err.includes('سایز'), `${vp} click ${JSON.stringify(M.click)}`);
      await p.screenshot({ path: `${out}/${tag}-${vp}-click-size-required.png` });
      await p.locator('input[name=size]:not(:disabled)').first().check();
      await p.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).click();
      const toast = p.locator('.toast').first(); await toast.waitFor({ timeout: 15000 });
      M.toast = await toast.textContent(); ok(/به سبد اضافه شد/.test(M.toast), `${vp} toast ${M.toast}`);
      await p.screenshot({ path: `${out}/${tag}-${vp}-toast.png` });
    }
    await p.close();
  }
  await ctx.close();
}
await b.close();
R.pass = R.fails.length === 0;
writeFileSync(`${out}/${tag}-qa.json`, JSON.stringify(R, null, 2));
console.log(JSON.stringify({ pass: R.pass, fails: R.fails, console: R.console.length,
  desktop: { sample: R.desktop['/women'].find(c => c.button), hover: R.desktop.hoverBg, focus: R.desktop.focus, click: R.desktop.click, toast: R.desktop.toast },
  mobile: { sample: R.mobile['/women'].find(c => c.button), hover: R.mobile.hoverBg, click: R.mobile.click, toast: R.mobile.toast } }, null, 1));
