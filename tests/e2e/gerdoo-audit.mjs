// gerdoo-update-2026-10-28 READ-ONLY audit of the Oct 26 list against a live store. Every non-GET /api request is ABORTED,
// so nothing is written to the store's database (no carts, no reviews, no logins). Playwright 1440×900 + 390×844.
// BASE=<url> OUT=<dir> TAG=<gerdoo|preview> [SHARE=<vercel share token>] node tests/e2e/gerdoo-audit.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const base = process.env.BASE ?? 'https://joumeh-storefront.gerdoo.app';
const out = process.env.OUT ?? 'reports/shots/gerdoo-update-2026-10-28';
const tag = process.env.TAG ?? 'gerdoo';
const STORY = readFileSync(new URL('../fixtures/story-text.txt', import.meta.url), 'utf8').replace(/\n$/, '');
const R = { base, tag, at: new Date().toISOString(), blockedWrites: [], console: [], desktop: {}, mobile: {} };
const b = await chromium.launch();
async function open(ctx, path, opts = {}) {
  const p = await ctx.newPage();
  await p.route('**/api/**', r => { const m = r.request().method(); if (m !== 'GET' && m !== 'HEAD') { R.blockedWrites.push(`${m} ${new URL(r.request().url()).pathname}`); return r.abort(); } return opts.slow && opts.slow.test(r.request().url()) ? new Promise(x => setTimeout(x, 1500)).then(() => r.continue()) : r.continue(); });
  p.on('console', m => { if (m.type() === 'error') R.console.push(`${ctx._vp} ${path}: ${m.text().slice(0, 140)}`); });
  await p.goto(base + path, { waitUntil: opts.wait ?? 'networkidle' });
  if (!opts.wait) await p.evaluate(() => document.fonts.ready);
  return p;
}
const shot = (p, name, full = true) => p.screenshot({ path: `${out}/${tag}-${name}.png`, fullPage: full });
const scrollAll = p => p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
const selGap = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); const bb = parseFloat(cs.borderBottomWidth);
  return { gap: Math.round(parseFloat(cs.paddingBottom)), line: bb, borderColor: cs.borderBottomColor, text: e.textContent.trim() }; }, sel);
const iconAudit = p => p.evaluate(() => { const all = [...document.querySelectorAll('svg')]; const nonPack = all.filter(s => !s.closest('.icon') && !s.closest('[data-figma-icon]'));
  return { svgs: all.length, inPackWrapper: all.length - nonPack.length, outside: nonPack.map(s => (s.parentElement?.className?.baseVal ?? s.parentElement?.className ?? '') + '|' + (s.getAttribute('class') ?? '')).slice(0, 10), imgIcons: [...document.querySelectorAll('img[src*="icon"]')].map(i => i.getAttribute('src')).slice(0, 10) }; });

for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 1, locale: 'fa-IR' }); ctx._vp = vp;
  if (process.env.SHARE) { const sp = await ctx.newPage(); await sp.goto(base + '/?_vercel_share=' + process.env.SHARE, { waitUntil: 'networkidle' }); await sp.close(); }
  const M = R[vp];
  // HOME (items 1–4, 6, 9)
  let p = await open(ctx, '/'); await scrollAll(p); await p.waitForLoadState('networkidle');
  M.home = await p.evaluate(() => {
    const q = s => document.querySelector(s); const rc = e => e && e.getBoundingClientRect(); const hero = q('.hero-s'), img = q('.hero-s__img'), cta = q('.hero-s__cta');
    const feats = [...document.querySelectorAll('.feature')].map(f => { const e = s => f.querySelector(s)?.getBoundingClientRect(); const d = f.querySelector('.feature__desc'); const m = f.querySelector('.feature__media img, .story__frame'); const mr = m?.getBoundingClientRect(); const sec = f.getBoundingClientRect(); const tx = e('.feature__text');
      return { id: f.id, eyebrowToTitle: Math.round(e('.feature__title').top - e('.feature__eyebrow').bottom), titleToDesc: Math.round(e('.feature__desc').top - e('.feature__title').bottom), descToCta: Math.round(e('.feature__cta').top - e('.feature__desc').bottom),
        descLines: Math.round(e('.feature__desc').height / parseFloat(getComputedStyle(d).lineHeight)), media: mr && [Math.round(mr.width), Math.round(mr.height)], textVCentreMinusMedia: mr && Math.round((tx.top + tx.bottom) / 2 - (mr.top + mr.bottom) / 2),
        textAlign: getComputedStyle(f.querySelector('.feature__text')).textAlign, ctaCentreMinusTextCentre: Math.round((e('.feature__cta').left + e('.feature__cta').right) / 2 - (tx.left + tx.right) / 2), padTop: parseFloat(getComputedStyle(f).paddingTop), padBottom: parseFloat(getComputedStyle(f).paddingBottom) }; });
    const secs = [...document.querySelectorAll('main .hsec')]; const gaps = secs.slice(1).map((s, i) => ({ from: secs[i].id || secs[i].className.split(' ').slice(0, 2).join('.'), to: s.id || s.className.split(' ').slice(0, 2).join('.'), contentGap: Math.round(rc(s.querySelector('.wrap') ?? s).top + parseFloat(getComputedStyle(s).paddingTop) - (rc(secs[i].querySelector('.wrap') ?? secs[i]).bottom - parseFloat(getComputedStyle(secs[i]).paddingBottom))) }));
    const story = q('#story'); const sImg = rc(story.querySelector('.story__frame') ?? story.querySelector('img')); const ftr = rc(q('.ftr'));
    return { hero: hero && { section: [Math.round(rc(hero).width), Math.round(rc(hero).height)], viewportW: document.documentElement.clientWidth, img: [Math.round(rc(img).width), Math.round(rc(img).height)], src: img.currentSrc.replace(location.origin, ''), cta: cta?.textContent.trim(), ctaHref: cta?.getAttribute('href'), heroes: document.querySelectorAll('.hero-s, .hero').length, carousel: !!q('.hero__slides, .carousel, [aria-roledescription="carousel"]') },
      features: feats, sectionGaps: gaps, cardsPerRow: [...document.querySelectorAll('.best')].map(s => s.querySelectorAll('.pgrid > li').length), storyImageToFooter: Math.round(ftr.top - sImg.bottom),
      prices: [...document.querySelectorAll('.best .pc')].slice(0, 2).map(c => c.querySelector('.pc__price, .pc__now, .pc__soon')?.textContent?.trim() ?? c.textContent.trim().slice(-30)), overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  M.home.icons = await iconAudit(p);
  await shot(p, `${vp}-home`); await shot(p, `${vp}-home-hero`, false); await p.close();
  // SHOP (5–9)
  p = await open(ctx, '/women'); await scrollAll(p); await p.waitForLoadState('networkidle');
  M.shop = await p.evaluate(() => { const q = s => document.querySelector(s); const cw = document.documentElement.clientWidth; const grid = q('.pgrid'); const gr = grid.getBoundingClientRect();
    const lis = [...grid.children].map(l => l.getBoundingClientRect()); const row1 = lis.filter(r => Math.abs(r.top - lis[0].top) < 1); const row2 = lis.filter(r => r.top > lis[0].bottom - 1);
    const link = q('.pc__link'); const cs = getComputedStyle(link); const c = q('.pc').getBoundingClientRect(); const m = q('.pc__media').getBoundingClientRect();
    return { padRight: Math.round(cw - gr.right), padLeft: Math.round(gr.left), columns: row1.length, colGap: row1.length > 1 ? Math.round(row1[0].left - row1[1].right) : null, rowGap: row2.length ? Math.round(row2[0].top - lis[0].bottom) : null,
      card: { w: Math.round(c.width), h: Math.round(c.height), bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor, mediaPadTop: Math.round(m.top - c.top), hasPriceSlot: link.textContent.includes('قیمت') || !!q('.pc__now'), priceText: (q('.pc__price') ?? q('.pc__soon') ?? q('.pc__now'))?.textContent?.trim() },
      swapCards: document.querySelectorAll('.pc--swap').length, cards: document.querySelectorAll('.pc').length, filterControls: document.querySelectorAll('[class*="filter"], [aria-label*="فیلتر"]').length, cardHearts: document.querySelectorAll('.pc__fav').length, crumbSepIcon: !!q('.crumbs .icon svg'), overflowX: document.documentElement.scrollWidth - cw }; });
  M.shop.tabActive = await selGap(p, vp === 'desktop' ? '.hdr__links a.active' : '.mmenu a.active span');
  M.shop.crumbCurrent = await selGap(p, '.crumbs [aria-current="page"]');
  M.shop.icons = await iconAudit(p);
  await shot(p, `${vp}-women`);
  if (vp === 'desktop') {
    const sw = p.locator('.pc--swap').first(); await sw.scrollIntoViewIfNeeded(); const before = await sw.locator('.pc__img--2').evaluate(e => getComputedStyle(e).opacity);
    await sw.hover(); await p.waitForTimeout(600); const after = await sw.locator('.pc__img--2').evaluate(e => getComputedStyle(e).opacity); const border = await sw.locator('.pc__link').evaluate(e => getComputedStyle(e).borderTopColor);
    await sw.screenshot({ path: `${out}/${tag}-desktop-card-hover.png` }); await p.mouse.move(5, 5); M.hoverSwap = { before, after, borderOnHover: border };
    await p.evaluate(() => window.scrollTo(0, 0)); const btn = p.locator('#sort');
    const S = { closed: await p.evaluate(() => { const f = getComputedStyle(document.querySelector('#sort')); return { label: document.querySelector('#sort-lbl')?.textContent, value: document.querySelector('.ssel__value')?.textContent, bg: f.backgroundColor, border: f.borderTopWidth, chevron: !!document.querySelector('#sort svg') }; }) };
    await btn.click(); await p.waitForTimeout(300);
    S.open = await p.evaluate(() => { const m = document.querySelector('#sort-menu'); const ms = getComputedStyle(m); const sel = m.querySelector('[aria-selected=true]'); const t = sel.querySelector('.ssel__optText').getBoundingClientRect(); const tick = sel.querySelector('.ssel__tick svg')?.getBoundingClientRect(); const mr = m.getBoundingClientRect();
      return { valueColor: getComputedStyle(document.querySelector('.ssel__value')).color, backdrop: ms.backdropFilter || ms.webkitBackdropFilter, options: [...m.querySelectorAll('[role=option]')].map(o => o.textContent.trim()), optionTextRightInset: Math.round(mr.right - t.right), tickLeftOfText: tick ? tick.right <= t.left : false }; });
    await shot(p, 'desktop-sort-open', false); await p.keyboard.press('Escape'); M.sort = S;
  } else { const sb = p.locator('.sbtn'); if (await sb.count()) { await sb.click(); await p.waitForTimeout(300); M.sortMobile = await p.evaluate(() => ({ dialog: !!document.querySelector('[role=dialog]'), title: document.querySelector('[role=dialog] h2')?.textContent })); await shot(p, 'mobile-sort-sheet', false); await p.keyboard.press('Escape'); } }
  await p.close();
  // PDP (10)
  p = await open(ctx, '/product/p08'); await p.waitForTimeout(300);
  M.pdp = await p.evaluate(() => { const q = s => document.querySelector(s); const h = q('.pdp__hero img, .pdp__main img, .pdp img')?.getBoundingClientRect();
    return { heroImg: h && [Math.round(h.width), Math.round(h.height)], ratingRow: q('.pdp__rating')?.textContent.trim() ?? null, stars: document.querySelectorAll('.pdp__stars svg, .pdp__rating svg').length, desc: q('.pdp__desc')?.textContent.trim().slice(0, 80) ?? null, descSection: !!q('.pdp__desc, #description'),
      reviewsSection: !!q('#reviews'), reviewsText: q('#reviews')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 160), reviewItems: document.querySelectorAll('#reviews li, #reviews article').length, sampleTag: (document.body.textContent).includes('نمونه'), price: q('.pdp__now, .pdp__price')?.textContent?.trim(), addDisabled: q('.pdp__add')?.disabled, heart: !!q('.pdp__fav') }; });
  M.pdp.icons = await iconAudit(p);
  await shot(p, `${vp}-pdp`); await p.close();
  // CART (11) — empty cart only (no writes)
  p = await open(ctx, '/cart'); await p.waitForTimeout(300);
  M.cart = await p.evaluate(() => ({ empty: !!document.querySelector('.cart__empty'), text: document.querySelector('main')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 160), rows: document.querySelectorAll('.citem').length }));
  await shot(p, `${vp}-cart`); await p.close();
  // STORY (14)
  p = await open(ctx, '/info/story');
  M.story = await p.evaluate(exp => { const a = document.querySelector('[data-testid=story-text]'); if (!a) return { found: false }; const got = [a.querySelector('h1').textContent, ...[...a.querySelectorAll('p')].map(e => e.textContent)].join('\n'); return { exactMatch: got === exp, gotLen: got.length, expLen: exp.length }; }, STORY);
  await shot(p, `${vp}-story`); await p.close();
  // SUPPORT (13)
  const fabs = {}; for (const path of ['/', '/women', '/men', '/product/p08', '/cart', '/info/story', '/support', '/info/size-guide']) { const q = await open(ctx, path); fabs[path] = await q.locator('[data-testid=support-fab]').isVisible(); await q.close(); }
  p = await open(ctx, '/women'); const CH = { fabOnPages: fabs, fixed: await p.evaluate(() => getComputedStyle(document.querySelector('.sfab')).position) };
  await p.locator('.sfab').click(); await p.waitForTimeout(300);
  CH.open = await p.evaluate(() => ({ title: document.querySelector('[role=dialog] h2')?.textContent, notice: document.querySelector('.chat__demo')?.textContent, chips: [...document.querySelectorAll('.chat__chip')].map(c => c.textContent) }));
  await p.locator('.chat__chip').nth(2).click(); await p.waitForTimeout(800); CH.answer = await p.evaluate(() => [...document.querySelectorAll('.chat__msg')].map(m => m.textContent.trim().slice(0, 100)));
  await shot(p, `${vp}-support-chat`, false); await p.close(); M.chat = CH;
  // SEARCH (11, 12)
  p = await open(ctx, '/', { slow: /\/api\/search/ });
  await p.locator('.hdr__search').click(); await p.fill('#q', 'یزد'); await p.waitForTimeout(500);
  const sl = await p.locator('[data-testid=search-loading]').isVisible().catch(() => false); await p.waitForTimeout(1800);
  M.search = { loadingShown: sl, count: await p.evaluate(() => document.querySelector('.search__count')?.textContent), items: await p.locator('.search__item').count(), firstItem: await p.evaluate(() => document.querySelector('.search__item')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)) };
  await shot(p, `${vp}-search`, false); await p.close();
  // LOADING (12)
  const L = {}; for (const [k, path, rx, tid] of [['home', '/', /\/api\/products/, 'grid-skeleton'], ['shop', '/women', /\/api\/products/, 'grid-skeleton'], ['pdp', '/product/p08', /\/api\/products\/p08/, 'pdp-skeleton']]) {
    const q = await open(ctx, path, { slow: rx, wait: 'domcontentloaded' }); await q.waitForTimeout(500); L[k] = await q.locator(`[data-testid=${tid}]`).first().isVisible().catch(() => false); await q.close(); }
  M.loading = L; await ctx.close();
}
await b.close();
writeFileSync(`${out}/${tag}-audit.json`, JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
