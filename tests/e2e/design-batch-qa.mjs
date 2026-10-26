// design-batch-2026-10-26 QA: Playwright headless 1440×900 + 390×844. BASE=<url> OUT=<dir> TAG=<local|preview> node tests/e2e/design-batch-qa.mjs
// Optional HEADERS='{"x-vercel-protection-bypass":"…"}' for protected previews (never written to disk).
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const base = process.env.BASE ?? 'http://127.0.0.1:8091';
const out = process.env.OUT ?? '../reports/shots/design-batch-2026-10-26';
const tag = process.env.TAG ?? 'local';
const headers = process.env.HEADERS ? JSON.parse(process.env.HEADERS) : undefined;
const STORY = readFileSync(new URL('../fixtures/story-text.txt', import.meta.url), 'utf8').replace(/\n$/, '');
const R = { base, tag, at: new Date().toISOString(), desktop: {}, mobile: {}, console: [], axe: {} };
const r1 = v => Math.round(v * 10) / 10;
const b = await chromium.launch();

async function page(ctx, path, opts = {}) {
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') R.console.push(`${ctx._vp} ${path}: ${m.text()}`); });
  p.on('pageerror', e => R.console.push(`${ctx._vp} ${path}: pageerror ${e.message}`));
  if (opts.route) await opts.route(p);
  await p.goto(base + path, { waitUntil: opts.wait ?? 'networkidle' });
  if ((opts.wait ?? 'networkidle') === 'networkidle') await p.evaluate(() => document.fonts.ready);
  return p;
}
const shot = (p, name, full = true) => p.screenshot({ path: `${out}/${tag}-${name}.png`, fullPage: full });
const scrollAll = p => p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); } window.scrollTo(0, 0); });
// text→underline gap for an element whose underline is border-block-end: distance from line box bottom to border top
const selGap = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
  const bb = parseFloat(cs.borderBottomWidth); const lineBottom = r.bottom - bb - parseFloat(cs.paddingBottom);
  return { gap: Math.round((r.bottom - bb) - lineBottom), line: bb, color: cs.color, borderColor: cs.borderBottomColor, lineHeight: cs.lineHeight, height: r.height, text: e.textContent.trim() }; }, sel);
async function axe(p, key) { try { const a = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa']).analyze(); R.axe[key] = a.violations.map(v => `${v.impact} ${v.id} (${v.nodes.length})`); } catch (e) { R.axe[key] = ['axe error ' + e.message]; } }

for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 1, extraHTTPHeaders: headers, locale: 'fa-IR' }); ctx._vp = vp;
  const M = R[vp];
  // ---------- HOME ----------
  let p = await page(ctx, '/'); await scrollAll(p); await p.waitForLoadState('networkidle');
  M.home = await p.evaluate(() => {
    const q = s => document.querySelector(s); const rc = e => e && e.getBoundingClientRect();
    const hero = q('.hero-s'), img = q('.hero-s__img'), cta = q('.hero-s__cta');
    const secs = [...document.querySelectorAll('main .hsec')];
    const feat = q('#f-women'); const g = s => rc(feat.querySelector(s));
    const ey = g('.feature__eyebrow'), ti = g('.feature__title'), de = g('.feature__desc'), ct = g('.feature__cta'), me = g('.feature__media img') ?? g('.feature__media');
    const descEl = feat.querySelector('.feature__desc'); const lh = parseFloat(getComputedStyle(descEl).lineHeight);
    const story = q('#story'); const sImg = rc(story.querySelector('.story__frame') ?? story.querySelector('img')); const ftr = rc(q('.ftr'));
    const gaps = secs.slice(1).map((s, i) => { const prev = secs[i]; const content = s.firstElementChild; return { prev: prev.id || prev.className, next: s.id || s.className, sectionPaddingTop: parseFloat(getComputedStyle(s).paddingTop), prevContentBottomToNextContentTop: Math.round(rc(content).top - rc(prev.lastElementChild ?? prev).bottom - parseFloat(getComputedStyle(prev).paddingBottom) + parseFloat(getComputedStyle(prev).paddingBottom)) }; });
    const rows = [...document.querySelectorAll('.best')].map(s => s.querySelectorAll('.pgrid > li').length);
    const allFeat = [...document.querySelectorAll('.feature')].map(f => { const e = s => f.querySelector(s)?.getBoundingClientRect(); const d = f.querySelector('.feature__desc'); const m = f.querySelector('.feature__media img, .story__frame');
      return { id: f.id, eyebrowToTitle: Math.round(e('.feature__title').top - e('.feature__eyebrow').bottom), titleToDesc: Math.round(e('.feature__desc').top - e('.feature__title').bottom), descToCta: Math.round(e('.feature__cta').top - e('.feature__desc').bottom), descLines: Math.round(e('.feature__desc').height / parseFloat(getComputedStyle(d).lineHeight)), media: m && [Math.round(m.getBoundingClientRect().width), Math.round(m.getBoundingClientRect().height)], textCenterVsMediaCenter: m && Math.round(((e('.feature__eyebrow').top + e('.feature__cta').bottom) / 2) - ((m.getBoundingClientRect().top + m.getBoundingClientRect().bottom) / 2)), ctaText: f.querySelector('.feature__cta')?.textContent.trim() }; });
    return { hero: { section: [Math.round(rc(hero).width), Math.round(rc(hero).height)], img: [Math.round(rc(img).width), Math.round(rc(img).height)], imgCoversHero: Math.abs(rc(img).width - rc(hero).width) < 1 && Math.abs(rc(img).height - rc(hero).height) < 1, currentSrc: img.currentSrc.replace(location.origin, ''), ctaText: cta.textContent.trim(), ctaHref: cta.getAttribute('href'), heroCount: document.querySelectorAll('.hero-s, .hero').length, carousel: !!q('.hero__slides, .carousel') },
      features: allFeat, sectionGaps: gaps, cardsPerBestSeller: rows, storyImageToFooter: Math.round(ftr.top - sImg.bottom), cardHearts: document.querySelectorAll('.pc .pc__fav, .pc [aria-label*="علاقه"]').length,
      priceTexts: [...document.querySelectorAll('.pc__now')].slice(0, 4).map(e => e.textContent), overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  await shot(p, `${vp}-home`); await shot(p, `${vp}-home-hero`, false); await axe(p, `${vp} /`); await p.close();

  // ---------- SHOP ----------
  p = await page(ctx, '/women'); await scrollAll(p); await p.waitForLoadState('networkidle');
  M.shop = await p.evaluate(() => {
    const q = s => document.querySelector(s); const cw = document.documentElement.clientWidth; const grid = q('.pgrid'); const gr = grid.getBoundingClientRect();
    const lis = [...grid.children].map(l => l.getBoundingClientRect()); const row1 = lis.filter(r => Math.abs(r.top - lis[0].top) < 1); const row2 = lis.filter(r => r.top > lis[0].bottom - 1);
    const card = q('.pc'); const cs = getComputedStyle(card); const media = q('.pc__media').getBoundingClientRect(); const cr = card.getBoundingClientRect();
    const sepSvg = q('.crumbs__sep svg, .crumbs svg');
    return { gridPadStart: Math.round(cw - gr.right), gridPadEnd: Math.round(gr.left), columns: row1.length, colGap: row1.length > 1 ? Math.round(row1[0].left - row1[1].right) : null, rowGap: row2.length ? Math.round(row2[0].top - lis[0].bottom) : null,
      card: { w: Math.round(cr.width), h: Math.round(cr.height), bg: cs.backgroundColor, border: cs.border, radius: cs.borderRadius, mediaW: Math.round(media.width), mediaH: Math.round(media.height), hasPrice: !!card.querySelector('.pc__now') },
      filterControls: document.querySelectorAll('[class*="filter"], [data-testid*="filter"], [aria-label*="فیلتر"]').length, cardHearts: document.querySelectorAll('.pc__fav').length,
      crumbSeparatorIsFigmaIcon: !!sepSvg, crumbSeparatorText: q('.crumbs ol')?.textContent, swapCards: document.querySelectorAll('.pc--swap').length, cards: document.querySelectorAll('.pc').length, overflowX: document.documentElement.scrollWidth - cw };
  });
  M.shop.tabActive = await selGap(p, vp === 'desktop' ? '.hdr__links a.active' : '.mmenu a.active span');
  M.shop.crumbCurrent = await selGap(p, '.crumbs [aria-current="page"]');
  await shot(p, `${vp}-women`);
  // hover swap
  if (vp === 'desktop') {
    const sw = p.locator('.pc--swap').first(); await sw.scrollIntoViewIfNeeded();
    const before = await sw.locator('.pc__img--2').evaluate(e => getComputedStyle(e).opacity);
    await sw.hover(); await p.waitForTimeout(500);
    const after = await sw.locator('.pc__img--2').evaluate(e => ({ op: getComputedStyle(e).opacity, src: e.currentSrc.split('/').pop() }));
    const firstSrc = await sw.locator('.pc__img--1').evaluate(e => e.currentSrc.split('/').pop());
    await sw.screenshot({ path: `${out}/${tag}-desktop-card-hover.png` });
    const single = p.locator('.pc:not(.pc--swap)').first(); const singleInfo = (await single.count()) ? await single.evaluate(e => ({ imgs: e.querySelectorAll('img').length })) : 'all cards have 2 images';
    await p.mouse.move(5, 5); await p.waitForTimeout(400);
    const reset = await sw.locator('.pc__img--2').evaluate(e => getComputedStyle(e).opacity);
    // keyboard focus also swaps
    await sw.locator('a').first().focus(); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(450);
    const focusOp = await sw.locator('.pc__img--2').evaluate(e => getComputedStyle(e).opacity);
    M.hoverSwap = { before, after, firstSrc, reset, focusOp, singleImageFallback: singleInfo };
  }
  // sort
  await p.evaluate(() => window.scrollTo(0, 0));
  if (vp === 'desktop') {
    const S = {}; const btn = p.locator('#sort');
    S.closed = await p.evaluate(() => { const f = getComputedStyle(document.querySelector('#sort')); const l = document.querySelector('#sort-lbl'); return { label: l.textContent, value: document.querySelector('.ssel__value').textContent, bg: f.backgroundColor, border: f.borderTopWidth + ' ' + f.borderTopStyle, color: f.color, labelAboveValue: l.getBoundingClientRect().bottom <= document.querySelector('.ssel__value').getBoundingClientRect().top + 1, chevron: !!document.querySelector('#sort svg') }; });
    await btn.click(); await p.waitForTimeout(250);
    S.open = await p.evaluate(() => { const m = document.querySelector('#sort-menu'); const ms = getComputedStyle(m); const f = document.querySelector('#sort'); const opts = [...m.querySelectorAll('[role=option]')];
      const sel = m.querySelector('[aria-selected=true]'); const t = sel.querySelector('.ssel__optText').getBoundingClientRect(); const tick = sel.querySelector('.ssel__tick svg')?.getBoundingClientRect(); const mr = m.getBoundingClientRect();
      return { expanded: f.getAttribute('aria-expanded'), valueColor: getComputedStyle(document.querySelector('.ssel__value')).color, chevColor: getComputedStyle(document.querySelector('.ssel__chev')).color, backdrop: ms.backdropFilter || ms.webkitBackdropFilter, bg: ms.backgroundColor, options: opts.map(o => o.textContent.trim()),
        textRightAligned: Math.round(mr.right - t.right), tickOnLeft: tick ? tick.right <= t.left : false, tickCount: m.querySelectorAll('.ssel__tick svg').length, activeDesc: f.getAttribute('aria-activedescendant') }; });
    await shot(p, 'desktop-sort-open', false);
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForLoadState('networkidle'); await p.waitForTimeout(300);
    S.afterKeyboardSelect = await p.evaluate(() => ({ url: location.search, value: document.querySelector('.ssel__value').textContent, menuOpen: !!document.querySelector('#sort-menu'), focus: document.activeElement?.id, firstPrices: [...document.querySelectorAll('.pc__now')].slice(0, 3).map(e => e.textContent) }));
    await btn.click(); await p.waitForTimeout(150); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    S.escape = await p.evaluate(() => ({ menuOpen: !!document.querySelector('#sort-menu'), focus: document.activeElement?.id }));
    await btn.click(); await p.locator('#sort-menu [role=option]').nth(0).click(); await p.waitForTimeout(300);
    S.mouseSelect = await p.evaluate(() => ({ url: location.search, value: document.querySelector('.ssel__value').textContent, menuOpen: !!document.querySelector('#sort-menu') }));
    await btn.click(); await p.mouse.click(30, 850); await p.waitForTimeout(150);
    S.outsideClickClosed = await p.evaluate(() => !document.querySelector('#sort-menu'));
    M.sort = S;
  } else {
    const sb = p.locator('.sbtn'); if (await sb.count()) { await sb.click(); await p.waitForTimeout(300); M.sortMobile = await p.evaluate(() => ({ dialog: !!document.querySelector('[role=dialog]'), title: document.querySelector('[role=dialog] h2')?.textContent })); await shot(p, 'mobile-sort-sheet', false); await p.keyboard.press('Escape'); }
  }
  await axe(p, `${vp} /women`); await p.close();

  // ---------- PDP ----------
  p = await page(ctx, '/product/p08');
  M.pdp = await p.evaluate(() => { const q = s => document.querySelector(s); const h = q('.pdp__hero img, .pdp__main img, .pdp img').getBoundingClientRect();
    return { heroImg: [Math.round(h.width), Math.round(h.height)], rating: q('.pdp__rating')?.textContent.trim(), stars: document.querySelectorAll('.pdp__stars svg').length, desc: q('.pdp__desc')?.textContent.trim().slice(0, 80), reviews: document.querySelectorAll('#reviews li, #reviews article').length, reviewsSampleTag: (q('#reviews')?.textContent ?? '').includes('نمونه'), heart: !!q('.pdp__fav'), price: q('.pdp__now')?.textContent, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  await shot(p, `${vp}-pdp`); await axe(p, `${vp} /product/p08`);
  // cart add
  const sizeInput = p.locator('input[name=size]:not([disabled])').first(); await sizeInput.check({ force: true });
  await p.locator('.pdp__add').click(); await p.waitForTimeout(700);
  M.cartAdd = await p.evaluate(() => ({ badge: document.querySelector('.hdr [class*="badge"], .bnav [class*="badge"]')?.textContent ?? null, toast: document.querySelector('[role=status]')?.textContent?.trim()?.slice(0, 60) }));
  await p.close();
  // ---------- CART ----------
  p = await page(ctx, '/cart');
  const cartRead = () => p.evaluate(() => ({ rows: document.querySelectorAll('.citem').length, qty: document.querySelector('.citem output')?.textContent, total: document.querySelector('.summary')?.textContent.replace(/\s+/g, ' ').slice(0, 140), empty: !!document.querySelector('.cart__empty') }));
  const C = { afterAdd: await cartRead() };
  if (vp === 'desktop') C.metrics = await p.evaluate(() => { const r = s => document.querySelector(s)?.getBoundingClientRect(); const t = r('.citem img'); const s = r('.summary'); return { thumb: t && [Math.round(t.width), Math.round(t.height)], summaryW: s && Math.round(s.width), qtyBtn: r('.qty--pill button') && Math.round(r('.qty--pill button').height) }; });
  await shot(p, `${vp}-cart`);
  await p.locator('.qty--pill button').first().click(); await p.waitForTimeout(600); C.afterIncrease = await cartRead();
  await p.locator('.qty--pill button').nth(1).click(); await p.waitForTimeout(600); C.afterDecrease = await cartRead();
  await axe(p, `${vp} /cart`);
  await p.locator('.citem__del').first().click(); await p.waitForTimeout(700); C.afterRemove = await cartRead();
  M.cart = C; await p.close();

  // ---------- STORY ----------
  p = await page(ctx, '/info/story');
  M.story = await p.evaluate(exp => { const a = document.querySelector('[data-testid=story-text]'); const parts = [a.querySelector('h1').textContent, ...[...a.querySelectorAll('p')].map(e => e.textContent)]; const got = parts.join('\n');
    const img = document.querySelector('.story__frame').getBoundingClientRect(); const f = document.querySelector('.ftr').getBoundingClientRect(); const art = a.getBoundingClientRect();
    return { exactMatch: got === exp, gotLen: got.length, expLen: exp.length, zwnj: (got.match(/\u200c/g) || []).length, contentToFooter: Math.round(f.top - Math.max(img.bottom, art.bottom)) }; }, STORY);
  await shot(p, `${vp}-story`); await axe(p, `${vp} /info/story`); await p.close();

  // ---------- SUPPORT CHAT (on every page) ----------
  const fabs = {};
  for (const path of ['/', '/women', '/product/p08', '/cart', '/info/story', '/support']) { const q = await page(ctx, path); fabs[path] = await q.locator('[data-testid=support-fab]').isVisible(); await q.close(); }
  p = await page(ctx, '/women');
  const CH = { fabOnPages: fabs };
  CH.fabPos = await p.evaluate(() => { const f = document.querySelector('.sfab').getBoundingClientRect(); const n = document.querySelector('.bnav')?.getBoundingClientRect(); return { fab: [Math.round(f.left), Math.round(f.bottom), Math.round(f.width)], bnavTop: n && n.height ? Math.round(n.top) : null, clearOfBnav: n && n.height ? f.bottom <= n.top - 8 : true }; });
  await p.locator('.sfab').click(); await p.waitForTimeout(300);
  CH.open = await p.evaluate(() => ({ dialog: !!document.querySelector('[role=dialog] [data-testid=support-chat]'), title: document.querySelector('[role=dialog] h2')?.textContent, notice: document.querySelector('.chat__demo')?.textContent, focus: document.activeElement?.textContent, chips: [...document.querySelectorAll('.chat__chip')].map(c => c.textContent) }));
  await p.locator('.chat__chip').nth(2).click(); await p.waitForTimeout(800);
  await p.fill('#chat-in', 'سلام، رنگ دیگری دارید؟'); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  CH.after = await p.evaluate(() => [...document.querySelectorAll('.chat__msg')].map(m => m.textContent.trim().slice(0, 90)));
  await shot(p, `${vp}-support-chat`, false);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  CH.closed = await p.evaluate(() => ({ dialog: !!document.querySelector('[role=dialog]'), focusIsFab: document.activeElement?.classList.contains('sfab') }));
  M.chat = CH; await p.close();

  // ---------- SEARCH ----------
  p = await page(ctx, '/', { route: async pg => { await pg.route('**/api/search*', async r => { await new Promise(x => setTimeout(x, 1200)); await r.continue(); }); } });
  await p.locator('.hdr__search').click(); await p.fill('#q', 'یزد'); await p.waitForTimeout(500);
  const sl = await p.locator('[data-testid=search-loading]').isVisible().catch(() => false);
  await p.waitForTimeout(1500);
  M.search = { loadingShown: sl, result: await p.evaluate(() => document.querySelector('.search__count')?.textContent), items: await p.locator('.search__item').count() };
  if (M.search.items) { await p.locator('.search__item').first().click(); await p.waitForLoadState('networkidle'); M.search.navigatedTo = new URL(p.url()).pathname; }
  await p.close();

  // ---------- LOADING STATES (API delayed 1.5 s) ----------
  const slow = glob => async pg => { await pg.route(glob, async r => { await new Promise(x => setTimeout(x, 1500)); await r.continue(); }); };
  const L = {};
  for (const [k, path, glob, tid] of [['home', '/', '**/api/products*', 'grid-skeleton'], ['shop', '/women', '**/api/products*', 'grid-skeleton'], ['pdp', '/product/p08', '**/api/products/p08', 'pdp-skeleton'], ['cart', '/cart', '**/api/cart/**', 'cart-skeleton']]) {
    const q = await page(ctx, path, { route: slow(glob), wait: 'domcontentloaded' });
    await q.waitForTimeout(500);
    L[k] = await q.locator(`[data-testid=${tid}]`).first().isVisible().catch(() => false);
    if (vp === 'desktop' && (k === 'shop' || k === 'pdp')) await shot(q, `desktop-loading-${k}`, false);
    await q.waitForLoadState('networkidle'); L[k + 'Resolved'] = !(await q.locator(`[data-testid=${tid}]`).count()); await q.close();
  }
  M.loading = L;
  await ctx.close();
}
await b.close();
writeFileSync(`${out}/${tag}-qa.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(R, null, 1));
