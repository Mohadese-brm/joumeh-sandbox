// rev3 (Mohadeseh 2026-10-26) QA: home product-row → next-section gaps, «قصه ما» picture size + bottom vs last text line,
// card hover/focus border = action-primary rgb(28,116,119), breadcrumb vertical centres + hover/selected underline (gap 8, 2px, teal) vs header tab.
// BASE=<url> TAG=<rev3-local|rev3-preview> OUT=<dir> [SHARE=<token>] node tests/e2e/rev3-qa.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
const base = process.env.BASE ?? 'http://127.0.0.1:8091', tag = process.env.TAG ?? 'rev3-local', out = process.env.OUT ?? '../reports/shots/design-batch-2026-10-26';
const STORY = readFileSync(new URL('../fixtures/story-text.txt', import.meta.url), 'utf8').replace(/\n$/, '');
mkdirSync(out, { recursive: true });
const R = { base, tag, at: new Date().toISOString(), console: [] };
const b = await chromium.launch();
const rd = x => Math.round(x * 100) / 100;
for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, locale: 'fa-IR' });
  if (process.env.SHARE) { const sp = await ctx.newPage(); await sp.goto(base + '/?_vercel_share=' + process.env.SHARE, { waitUntil: 'networkidle' }); await sp.close(); }
  const page = async path => { const p = await ctx.newPage(); p.on('console', m => m.type() === 'error' && R.console.push(`${vp} ${path}: ${m.text()}`)); p.on('pageerror', e => R.console.push(`${vp} ${path}: ${e.message}`)); await p.goto(base + path, { waitUntil: 'networkidle' }); return p; };
  const M = R[vp] = {};
  // 1. Home: last product-card bottom of each best-seller row → top of next section's first visible content (image or text)
  let p = await page('/');
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.waitForTimeout(400);
  M.homeGaps = await p.evaluate(() => [...document.querySelectorAll('section.best')].map(s => {
    const cards = [...s.querySelectorAll('.pc')]; const rowBottom = Math.max(...cards.map(c => c.getBoundingClientRect().bottom));
    const next = s.nextElementSibling; const nr = next.getBoundingClientRect();
    const firstContent = Math.min(...[...next.querySelectorAll('.feature__media, .feature__eyebrow')].map(e => e.getBoundingClientRect().top));
    return { row: s.querySelector('h2').textContent, next: next.querySelector('h2')?.textContent, rowToNextSectionEdge: Math.round(nr.top - rowBottom), rowToNextContent: Math.round(firstContent - rowBottom),
      rowEndSpaceToken: getComputedStyle(document.documentElement).getPropertyValue('--row-end-space').trim(), sectionPadBottom: getComputedStyle(s).paddingBottom }; }));
  for (const [i, g] of M.homeGaps.entries()) {
    const s = p.locator('section.best').nth(i); await s.scrollIntoViewIfNeeded();
    const bb = await s.boundingBox(); const nb = await p.locator('section.best').nth(i).locator('xpath=following-sibling::section[1]').boundingBox();
    await p.evaluate(y => scrollTo(0, y), Math.max(0, bb.y + (await p.evaluate(() => scrollY)) + bb.height - size.height * 0.55)); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${tag}-${vp}-home-gap-${i + 1}.png` });
  }
  await p.close();
  // 2. Story page
  p = await page('/info/story');
  M.story = await p.evaluate(exp => {
    const a = document.querySelector('[data-testid=story-text]'); const got = [a.querySelector('h1').textContent, ...[...a.querySelectorAll('p')].map(e => e.textContent)].join('\n');
    const img = document.querySelector('.story-page__media').getBoundingClientRect(); const ps = a.querySelectorAll('p'); const last = ps[ps.length - 1];
    const rg = document.createRange(); rg.selectNodeContents(last); const rects = [...rg.getClientRects()]; const lastLine = rects[rects.length - 1];
    const cs = getComputedStyle(document.querySelector('.story-page__media'));
    return { textIdentical: got === exp, imgSize: [Math.round(img.width), Math.round(img.height)], imgRadius: cs.borderRadius,
      imgBottom: Math.round(img.bottom * 100) / 100, lastLineBoxBottom: Math.round(last.getBoundingClientRect().bottom * 100) / 100, lastGlyphBottom: Math.round(lastLine.bottom * 100) / 100,
      deltaLineBox: Math.round((img.bottom - last.getBoundingClientRect().bottom) * 100) / 100, deltaGlyph: Math.round((img.bottom - lastLine.bottom) * 100) / 100,
      imgAboveText: img.bottom <= a.querySelector('h1').getBoundingClientRect().top + 1 };
  }, STORY);
  await p.screenshot({ path: `${out}/${tag}-${vp}-story.png`, fullPage: true });
  // breadcrumb (story page crumbs + /women crumbs)
  const crumb = async (pg, name) => {
    const r = await pg.evaluate(() => {
      const n = document.querySelector('.crumbs'); const c = e => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; };
      const textBox = e => { const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(); return r; };
      const a = n.querySelector('a'), sep = n.querySelector('.crumbs__sep svg') ?? n.querySelector('.crumbs__sep'), cur = n.querySelector('[aria-current]');
      const ul = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e), t = textBox(e); return { font: cs.fontSize + '/' + cs.lineHeight, color: cs.color, borderColor: cs.borderBottomColor, line: parseFloat(cs.borderBottomWidth),
        gapLineBoxToUnderline: Math.round((r.bottom - parseFloat(cs.borderBottomWidth) - parseFloat(cs.paddingBottom) - (r.top + parseFloat(cs.paddingTop)) - parseFloat(cs.lineHeight)) * 100) / 100 + parseFloat(cs.paddingBottom),
        textCentre: Math.round((t.top + t.height / 2) * 100) / 100 }; };
      return { centres: { home: Math.round(c(a.firstChild ? (() => { const t = textBox(a); return { getBoundingClientRect: () => t }; })() : a) * 100) / 100, sep: Math.round(c(sep) * 100) / 100, current: Math.round(c({ getBoundingClientRect: () => textBox(cur) }) * 100) / 100 },
        link: ul(a), current: ul(cur) };
    });
    r.maxCentreDelta = rd(Math.max(...Object.values(r.centres)) - Math.min(...Object.values(r.centres)));
    await pg.locator('.crumbs a').first().hover(); await pg.waitForTimeout(250);
    r.hover = await pg.evaluate(() => { const a = document.querySelector('.crumbs a'), cs = getComputedStyle(a); return { color: cs.color, borderColor: cs.borderBottomColor, line: parseFloat(cs.borderBottomWidth), gap: parseFloat(cs.paddingBottom), textDecoration: cs.textDecorationLine,
      height: a.getBoundingClientRect().height, curHeight: document.querySelector('.crumbs [aria-current]').getBoundingClientRect().height }; });
    const nb = await pg.locator('.crumbs').boundingBox();
    await pg.screenshot({ path: `${out}/${tag}-${vp}-${name}-crumb-hover.png`, clip: { x: Math.max(0, nb.x - 12), y: nb.y, width: Math.min(nb.width + 24, size.width - Math.max(0, nb.x - 12)), height: nb.height } });
    return r;
  };
  M.storyCrumb = await crumb(p, 'story'); await p.close();
  p = await page('/women'); M.womenCrumb = await crumb(p, 'women');
  // header tab (desktop) for comparison
  M.tab = await p.evaluate(() => { const a = document.querySelector('.hdr__links a.active'); if (!a || !a.offsetParent) return null; const cs = getComputedStyle(a);
    return { font: cs.fontSize + '/' + cs.lineHeight, color: cs.color, borderColor: cs.borderBottomColor, line: parseFloat(cs.borderBottomWidth), gap: parseFloat(cs.paddingBottom) }; });
  // 3. card hover + focus border
  await p.mouse.move(1, 1); const card = p.locator('.pc').first(); await card.scrollIntoViewIfNeeded();
  M.cardRest = await card.evaluate(c => getComputedStyle(c.querySelector('.pc__link')).borderTopColor);
  await card.hover(); await p.waitForTimeout(400);
  M.cardHover = await card.evaluate(c => getComputedStyle(c.querySelector('.pc__link')).borderTopColor);
  const cb = await card.boundingBox(); await p.screenshot({ path: `${out}/${tag}-${vp}-card-hover.png`, clip: { x: cb.x - 6, y: cb.y - 6, width: cb.width + 12, height: cb.height + 12 } });
  await p.mouse.move(1, 1); await p.waitForTimeout(300);
  await p.evaluate(() => document.activeElement?.blur()); await card.locator('.pc__link').focus(); await p.waitForTimeout(400);
  M.cardFocus = await card.evaluate(c => ({ border: getComputedStyle(c.querySelector('.pc__link')).borderTopColor, outline: getComputedStyle(c.querySelector('.pc__link')).outlineColor }));
  await p.close(); await ctx.close();
}
await b.close();
const T = 'rgb(28, 116, 119)';
R.summary = Object.fromEntries(['desktop', 'mobile'].map(vp => { const M = R[vp]; return [vp, {
  homeGapsOk: M.homeGaps.every(g => g.rowToNextContent >= 80), storyTextIdentical: M.story.textIdentical, storyBottomWithin2: M.story.imgAboveText || Math.abs(M.story.deltaLineBox) <= 2,
  cardHoverTeal: M.cardHover === T, cardFocusTeal: M.cardFocus.border === T,
  crumbCentresWithin1: M.storyCrumb.maxCentreDelta <= 1 && M.womenCrumb.maxCentreDelta <= 1,
  crumbHoverUnderline: [M.storyCrumb, M.womenCrumb].every(c => c.hover.borderColor === T && c.hover.line === 2 && c.hover.gap === 8 && c.hover.textDecoration === 'none'),
  crumbSelectedUnderline: [M.storyCrumb, M.womenCrumb].every(c => c.current.borderColor === T && c.current.line === 2 && c.current.gapLineBoxToUnderline === 8),
  tabMatches: !M.tab || (M.tab.borderColor === T && M.tab.line === 2 && M.tab.gap === 8) }]; }));
writeFileSync(`${out}/${tag}-qa.json`, JSON.stringify(R, null, 2));
console.log(JSON.stringify(R.summary, null, 1)); console.log('console', R.console);
