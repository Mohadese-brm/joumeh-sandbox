// rev2 (Mohadeseh 2026-10-26 "round above like picture") QA: the card BOX has an arched top concentric with the picture arch,
// 8px outside it on top/left/right (box top radius − border = picture top radius + 8), bottom corners 12, picture bottom ≈20 (mw×0.057).
// Geometry from computed styles + rects for every card on /women and / (home rows); pixel scan of the rendered arch (rest + hover) is done
// by tests/e2e/rev2-arch-scan.py on the saved 1× crops. BASE=<url> TAG=<rev2-local|rev2-preview> OUT=<dir> [SHARE=<token>] node tests/e2e/rev2-qa.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const base = process.env.BASE ?? 'http://127.0.0.1:8091', tag = process.env.TAG ?? 'rev2-local', out = process.env.OUT ?? '../reports/shots/design-batch-2026-10-26';
mkdirSync(out, { recursive: true });
const R = { base, tag, at: new Date().toISOString(), console: [], crops: [] };
const b = await chromium.launch();
for (const [vp, size] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  for (const dpr of [1, 2]) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: dpr, locale: 'fa-IR' });
    if (process.env.SHARE) { const sp = await ctx.newPage(); await sp.goto(base + '/?_vercel_share=' + process.env.SHARE, { waitUntil: 'networkidle' }); await sp.close(); }
    for (const path of ['/women', '/']) {
      const p = await ctx.newPage(); p.on('console', m => m.type() === 'error' && R.console.push(`${vp}@${dpr} ${path}: ${m.text()}`)); p.on('pageerror', e => R.console.push(`${vp}@${dpr} ${path}: ${e.message}`));
      await p.goto(base + path, { waitUntil: 'networkidle' });
      if (dpr === 1) {
        const cards = await p.evaluate(() => [...document.querySelectorAll('.pc')].map(c => {
          const box = c.querySelector('.pc__link'), r = box.getBoundingClientRect(), cs = getComputedStyle(box), bw = parseFloat(cs.borderTopWidth);
          const med = c.querySelector('.pc__media'), m = med.getBoundingClientRect(), ms = getComputedStyle(med), body = c.querySelector('.pc__body').getBoundingClientRect();
          const px = v => parseFloat(v), rd = x => Math.round(x * 100) / 100;
          const boxTop = px(cs.borderTopLeftRadius), boxTopR = px(cs.borderTopRightRadius), photoTop = px(ms.borderTopLeftRadius);
          // concentric check: centres of the two top-left arcs coincide
          const boxC = [r.left + boxTop, r.top + boxTop], phC = [m.left + photoTop, m.top + photoTop];
          // gap along the arch at angles 0..180 (from the shared centre): (box inner radius) − (photo radius); arcs are circles so constant if concentric
          const archGaps = [0, 30, 45, 60, 90, 120, 135, 150, 180].map(a => { const t = a * Math.PI / 180; const cx = (r.left + r.right) / 2, cy = r.top + boxTop;
            const inner = boxTop - bw, ph = photoTop, pcx = (m.left + m.right) / 2, pcy = m.top + photoTop;
            // point on inner box edge and on photo edge along the same direction from each centre; gap = distance between them
            const bx = cx + inner * Math.cos(t), by = cy - inner * Math.sin(t), qx = pcx + ph * Math.cos(t), qy = pcy - ph * Math.sin(t); return rd(Math.hypot(bx - qx, by - qy)); });
          return { box: [rd(r.width), rd(r.height)], photo: [rd(m.width), rd(m.height)], border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
            boxTopRadius: [rd(boxTop), rd(boxTopR)], boxBottomRadius: [px(cs.borderBottomLeftRadius), px(cs.borderBottomRightRadius)], photoTopRadius: rd(photoTop), photoBottomRadius: rd(px(ms.borderBottomLeftRadius)),
            boxTopMinusBorderMinusPhotoTop: rd(boxTop - bw - photoTop), centreDelta: rd(Math.hypot(boxC[0] - phC[0], boxC[1] - phC[1])),
            padTop: rd(m.top - r.top - bw), padLeft: rd(m.left - r.left - bw), padRight: rd(r.right - bw - m.right), padBottom: rd(r.bottom - bw - body.bottom), archGaps,
            wrapperBg: getComputedStyle(c).backgroundColor, wrapperBorder: getComputedStyle(c).borderTopWidth, swap: c.classList.contains('pc--swap') }; }));
        const ok = c => [c.padTop, c.padLeft, c.padRight].every(v => Math.abs(v - 8) <= 0.5) && Math.abs(c.boxTopMinusBorderMinusPhotoTop - 8) <= 0.5 && c.centreDelta <= 0.5 && c.archGaps.every(g => Math.abs(g - 8) <= 0.5);
        R[`${vp} ${path}`] = { n: cards.length, allOk: cards.every(ok), failing: cards.map((c, i) => ok(c) ? null : i).filter(x => x != null), sample: cards[0],
          gridPadAndGaps: await p.evaluate(() => { const g = document.querySelector('.pgrid'), cs = getComputedStyle(g); return { left: Math.round(g.getBoundingClientRect().left), colGap: cs.columnGap, rowGap: cs.rowGap }; }) };
      }
      // screenshots: rest + hover of the first swap card (1× crops are pixel-scanned; 2× are the review images)
      const card = p.locator('.pc--swap').first(); await card.scrollIntoViewIfNeeded(); await p.mouse.move(2, 2); await p.waitForTimeout(450);
      const pg = path === '/' ? 'home' : 'shop', name = d => `${out}/${tag}-${vp}-${pg}-card${d}${dpr === 2 ? '@2x' : ''}.png`;
      const clip = await card.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.left - 6, y: r.top - 6, width: r.width + 12, height: r.height + 12 }; });
      await p.screenshot({ path: name(''), clip }); R.crops.push(name(''));
      await card.locator('.pc__link').hover(); await p.waitForTimeout(500);
      const hov = await card.evaluate(e => ({ op: getComputedStyle(e.querySelector('.pc__img--2')).opacity, border: getComputedStyle(e.querySelector('.pc__link')).borderTopColor }));
      if (dpr === 1) R[`${vp} ${path}`].hover = hov;
      await p.screenshot({ path: name('-hover'), clip }); R.crops.push(name('-hover'));
      if (dpr === 2 && path === '/women') { await p.mouse.move(2, 2); await p.waitForTimeout(450); await p.locator('.pgrid').first().screenshot({ path: `${out}/${tag}-${vp}-shop-grid@2x.png` }).catch(() => {}); }
      await p.close();
    }
    await ctx.close();
  }
}
await b.close();
writeFileSync(`${out}/${tag}-cards.json`, JSON.stringify(R, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(R).filter(([k]) => k.includes('/')).map(([k, v]) => [k, { n: v.n, allOk: v.allOk, failing: v.failing, hover: v.hover }])), null, 1), R.console);
