// rev1 (Mohadeseh review 2026-10-26) QA: card box = photo + 8px, hero CTA physical left, support FAB fixed bottom-right on every page
// (also after scrolling, clear of bottom nav + footer text), sort menu edges/icon strokes aligned with the trigger.
// BASE=<url> TAG=<rev1-local|rev1-preview> OUT=<dir> [SHARE=<_vercel_share token, never written to disk>] node tests/e2e/rev1-qa.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const base = process.env.BASE ?? 'http://127.0.0.1:8091', tag = process.env.TAG ?? 'rev1-local', out = process.env.OUT ?? '../reports/shots/design-batch-2026-10-26';
mkdirSync(out, { recursive: true });
const R = { base, tag, at: new Date().toISOString(), console: [] };
const b = await chromium.launch();
const PAGES = ['/', '/women', '/men', '/product/p08', '/cart', '/info/story', '/support', '/info/size-guide'];
for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 1, locale: 'fa-IR' });
  if (process.env.SHARE) { const sp = await ctx.newPage(); await sp.goto(base + '/?_vercel_share=' + process.env.SHARE, { waitUntil: 'networkidle' }); await sp.close(); }
  const M = R[vp] = {};
  const open = async path => { const p = await ctx.newPage(); p.on('console', m => m.type() === 'error' && R.console.push(`${vp} ${path}: ${m.text()}`)); p.on('pageerror', e => R.console.push(`${vp} ${path}: ${e.message}`));
    await p.goto(base + path, { waitUntil: 'networkidle' }); return p; };
  const cardMetrics = p => p.evaluate(() => [...document.querySelectorAll('.pc')].slice(0, 12).map(c => {
    const box = c.querySelector('.pc__link') ?? c; /* rev2: the visible box is .pc__link */ const r = box.getBoundingClientRect(), cs = getComputedStyle(box), bw = parseFloat(cs.borderTopWidth);
    const m = c.querySelector('.pc__media').getBoundingClientRect(), body = c.querySelector('.pc__body').getBoundingClientRect(), ms = getComputedStyle(c.querySelector('.pc__media'));
    const rd = x => Math.round(x * 10) / 10;
    return { card: [rd(r.width), rd(r.height)], photo: [rd(m.width), rd(m.height)], border: bw, cardRadius: cs.borderTopLeftRadius,
      padTop: rd(m.top - r.top - bw), padRight: rd(r.right - bw - m.right), padLeft: rd(m.left - r.left - bw),
      outerPlus: rd(r.width - m.width), infoInside: body.bottom <= r.bottom - bw + 0.5 && body.left >= r.left && body.right <= r.right,
      padBottom: rd(r.bottom - bw - body.bottom), infoInsetRight: rd(r.right - bw - body.right), photoBottomRadius: ms.borderBottomLeftRadius, photoTopRadius: ms.borderTopLeftRadius,
      swap: c.classList.contains('pc--swap') }; }));
  // ---- cards (shop + home rows)
  let p = await open('/women');
  const sc = await cardMetrics(p);
  M.shopCards = { n: sc.length, sample: sc[0], allPad8: sc.every(c => [c.padTop, c.padRight, c.padLeft].every(v => Math.abs(v - 8) <= 0.5)), allInfoInside: sc.every(c => c.infoInside), padBottoms: [...new Set(sc.map(c => c.padBottom))] };
  M.grid = await p.evaluate(() => { const g = document.querySelector('.pgrid, .grid'); const cs = getComputedStyle(g); const r = g.getBoundingClientRect();
    return { cls: g.className, colGap: cs.columnGap, rowGap: cs.rowGap, padStart: Math.round(r.left), padEnd: Math.round(innerWidth - document.documentElement.scrollWidth + document.documentElement.clientWidth - r.right - (innerWidth - document.documentElement.clientWidth)) }; });
  // hover swap still works
  const first = p.locator('.pc--swap .pc__link').first(); await first.scrollIntoViewIfNeeded(); await first.hover(); await p.waitForTimeout(500);
  M.hoverSwap = await p.evaluate(() => getComputedStyle(document.querySelector('.pc--swap .pc__img--2')).opacity);
  if (vp === 'desktop') { await p.locator('.pc').first().screenshot({ path: `${out}/${tag}-desktop-card-hover.png` }); await p.mouse.move(5, 5); await p.waitForTimeout(500);
    await p.locator('.pc').first().screenshot({ path: `${out}/${tag}-desktop-card.png` }); }
  else { await p.mouse.move(5, 5); await p.locator('.pgrid, .grid').first().screenshot({ path: `${out}/${tag}-mobile-cards.png` }); }
  // ---- sort
  if (vp === 'desktop') {
    await p.evaluate(() => scrollTo(0, 0)); await p.locator('#sort').click(); await p.waitForTimeout(250);
    M.sort = await p.evaluate(() => {
      const rr = e => e.getBoundingClientRect(); const txt = e => { const rg = document.createRange(); rg.selectNodeContents(e); const rs = [...rg.getClientRects()]; return { left: Math.min(...rs.map(x => x.left)), right: Math.max(...rs.map(x => x.right)) }; };
      const val = document.querySelector('.ssel__valueItem[data-current]'), chev = document.querySelector('.ssel__chev .icon'), field = document.querySelector('#sort'), menu = document.querySelector('#sort-menu');
      const opts = [...menu.querySelectorAll('.ssel__opt')]; const tick = menu.querySelector('.ssel__tick .icon'); const tickCol = menu.querySelector('[aria-selected=true] .ssel__tick');
      const stroke = icon => { const svg = icon.querySelector('svg'), pa = icon.querySelector('path'); const cs = getComputedStyle(pa); const vb = svg.viewBox.baseVal; const scale = svg.getBoundingClientRect().width / vb.width;
        return { cssStrokeWidth: cs.strokeWidth, vectorEffect: cs.vectorEffect, renderedPx: Math.round((cs.vectorEffect === 'non-scaling-stroke' ? parseFloat(cs.strokeWidth) : parseFloat(cs.strokeWidth) * scale) * 100) / 100, box: [rr(icon).width, rr(icon).height] }; };
      const t = txt(val), ch = rr(chev), tk = rr(tickCol);
      const optText = opts.map(o => txt(o.querySelector('.ssel__optText')).right), vs = getComputedStyle(val), os = getComputedStyle(opts[1]);
      return { triggerTextRight: Math.round(t.right * 10) / 10, optionTextRights: optText.map(x => Math.round(x * 10) / 10), textRightDelta: Math.max(...optText.map(x => Math.abs(x - t.right))).toFixed(2),
        chevLeft: ch.left, chevRight: ch.right, tickLeft: tk.left, tickRight: tk.right, iconLeftDelta: Math.abs(ch.left - tk.left).toFixed(2), iconRightDelta: Math.abs(ch.right - tk.right).toFixed(2),
        triggerBox: [Math.round(rr(field).left), Math.round(rr(field).right)], menuBox: [Math.round(rr(menu).left), Math.round(rr(menu).right)],
        chevStroke: stroke(chev), tickStroke: stroke(tick),
        triggerFont: `${vs.fontSize} ${vs.fontWeight} ${vs.lineHeight}`, optionFont: `${os.fontSize} ${os.fontWeight} ${os.lineHeight}`,
        backdrop: getComputedStyle(menu).backdropFilter, expanded: field.getAttribute('aria-expanded') }; });
    const clip = await p.evaluate(() => { const a = document.querySelector('.ssel').getBoundingClientRect(), m = document.querySelector('#sort-menu').getBoundingClientRect(); return { x: m.left - 40, y: a.top - 24, width: m.width + 80, height: m.bottom - a.top + 48 }; });
    await p.screenshot({ path: `${out}/${tag}-desktop-sort-open-crop.png`, clip });
    await p.screenshot({ path: `${out}/${tag}-desktop-sort-open.png` });
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(600);
    M.sortKeyboard = { url: new URL(p.url()).search, focus: await p.evaluate(() => document.activeElement?.id), open: await p.locator('#sort-menu').count() };
  }
  await p.close();
  p = await open('/'); await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); }); await p.waitForLoadState('networkidle');
  const hc = await cardMetrics(p);
  M.homeCards = { n: hc.length, sample: hc[0], allPad8: hc.every(c => [c.padTop, c.padRight, c.padLeft].every(v => Math.abs(v - 8) <= 0.5)), allInfoInside: hc.every(c => c.infoInside) };
  // ---- hero
  M.hero = await p.evaluate(() => { const h = document.querySelector('.hero-s').getBoundingClientRect(), c = document.querySelector('.hero-s__cta').getBoundingClientRect(), w = document.querySelector('.hero-s__ctaWrap.wrap, .hero-s__ctaWrap');
    const wcs = getComputedStyle(w); const content = w.getBoundingClientRect().left + parseFloat(wcs.paddingLeft);
    return { dir: document.documentElement.dir || getComputedStyle(document.documentElement).direction, heroW: h.width, ctaLeft: Math.round(c.left), ctaRight: Math.round(c.right), ctaW: Math.round(c.width), containerLeft: Math.round(content), ctaAtContainerLeft: Math.abs(c.left - content) <= 1, onLeftHalf: c.right < h.left + h.width / 2, fromBottom: Math.round(h.bottom - c.bottom) }; });
  await p.screenshot({ path: `${out}/${tag}-${vp}-home-hero.png` });
  // ---- FAB on every page, top / mid / bottom scroll
  M.fab = {};
  const fabRead = pg => pg.evaluate(() => { const f = document.querySelector('[data-testid=support-fab]'); if (!f) return null; const r = f.getBoundingClientRect(), cs = getComputedStyle(f);
    const bn = document.querySelector('.bnav'); const bnr = bn && getComputedStyle(bn).display !== 'none' ? bn.getBoundingClientRect() : null;
    const hits = []; const ftr = document.querySelector('.ftr');
    if (ftr) { const w = document.createTreeWalker(ftr, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n);
      for (const t of rg.getClientRects()) if (t.right > r.left && t.left < r.right && t.bottom > r.top && t.top < r.bottom) hits.push(n.textContent.trim().slice(0, 30)); } }
    return { position: cs.position, right: Math.round(innerWidth - document.documentElement.clientWidth + (document.documentElement.clientWidth - r.right)), rightFromViewport: Math.round(document.documentElement.clientWidth - r.right), bottomFromViewport: Math.round(innerHeight - r.bottom), size: Math.round(r.width),
      onRightHalf: r.left > document.documentElement.clientWidth / 2, clearOfBnav: bnr ? r.bottom <= bnr.top : true, bnavTop: bnr && Math.round(bnr.top), footerTextUnderFab: hits }; });
  for (const path of PAGES) {
    const q = path === '/' ? p : await open(path);
    const top = await fabRead(q); await q.evaluate(() => scrollTo(0, document.body.scrollHeight / 2)); await q.waitForTimeout(200); const mid = await fabRead(q);
    if (path === '/' ) await q.screenshot({ path: `${out}/${tag}-${vp}-sticky-phone-scrolled.png` });
    await q.evaluate(() => scrollTo(0, document.body.scrollHeight)); await q.waitForTimeout(300); const bot = await fabRead(q);
    if (path === '/info/story') await q.screenshot({ path: `${out}/${tag}-${vp}-sticky-phone-footer.png` });
    M.fab[path] = { top, mid, bot, sameSpotWhileScrolling: !!top && JSON.stringify([top.rightFromViewport, top.bottomFromViewport]) === JSON.stringify([mid.rightFromViewport, mid.bottomFromViewport]) && JSON.stringify([top.rightFromViewport, top.bottomFromViewport]) === JSON.stringify([bot.rightFromViewport, bot.bottomFromViewport]) };
    if (path === '/women') { await q.locator('[data-testid=support-fab]').click(); await q.waitForTimeout(300);
      M.chatOpens = { dialog: await q.locator('[role=dialog] [data-testid=support-chat]').count() === 1, focus: await q.evaluate(() => document.activeElement?.textContent?.trim()) };
      await q.locator('.chat__chip').first().click(); await q.waitForTimeout(800); M.chatOpens.answered = (await q.locator('.chat').textContent()).includes('پاسخ نمایشی (دمو)');
      if (vp === 'mobile') await q.screenshot({ path: `${out}/${tag}-mobile-support-chat.png` });
      await q.keyboard.press('Escape'); await q.waitForTimeout(200); M.chatOpens.closedFocusFab = await q.evaluate(() => document.activeElement?.dataset.testid === 'support-fab'); }
    if (q !== p) await q.close();
  }
  await p.close(); await ctx.close();
}
await b.close();
writeFileSync(`${out}/${tag}-qa.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
