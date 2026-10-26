// rev5 (Mohadeseh 2026-10-26 «mobile PDP button text is big»): PDP button text/height at 360/390 (+768 tablet, 1440 desktop),
// one line + no overflow, review sheet submit, and other pages' .btn at 360 (must be unchanged vs BEFORE json if given).
// BASE=<url> TAG=<rev5-local|rev5-preview|rev5-before> OUT=<dir> [SHARE=<token>] [BEFORE=<json>] node tests/e2e/rev5-qa.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
const base = process.env.BASE ?? 'http://127.0.0.1:8091', tag = process.env.TAG ?? 'rev5-local', out = process.env.OUT ?? '../reports/shots/design-batch-2026-10-26';
mkdirSync(out, { recursive: true });
const BEFORE = process.env.BEFORE && existsSync(process.env.BEFORE) ? JSON.parse(readFileSync(process.env.BEFORE, 'utf8')) : null;
const R = { base, tag, at: new Date().toISOString(), console: [], fails: [] };
const ok = (c, m) => { if (!c) R.fails.push(m); };
const btns = sel => [...document.querySelectorAll(sel)].filter(e => e.offsetParent).map(e => {
  const s = getComputedStyle(e), r = e.getBoundingClientRect();
  const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); const textRects = [];
  for (let n; (n = tw.nextNode());) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); textRects.push(...[...rg.getClientRects()].filter(x => x.width > 1)); }
  const lines = new Set(textRects.map(x => Math.round(x.top))).size;
  const icon = e.querySelector('.icon'); const iconShown = !!icon && getComputedStyle(icon).display !== 'none';
  return { cls: e.className, text: e.textContent.trim(), fs: s.fontSize, fw: s.fontWeight, lh: s.lineHeight, ws: s.whiteSpace, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
    lines, overflow: e.scrollWidth > e.clientWidth + 1 || textRects.some(x => x.left < r.left - 0.5 || x.right > r.right + 0.5), iconShown,
    clipsViewport: r.right > innerWidth + 0.5 || r.left < -0.5 };
});
const b = await chromium.launch();
const VPS = [['desktop', 1440], ['tablet', 768], ['m390', 390], ['m360', 360]];
for (const [vp, w] of VPS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, locale: 'fa-IR' });
  if (process.env.SHARE) { const sp = await ctx.newPage(); await sp.goto(base + '/?_vercel_share=' + process.env.SHARE, { waitUntil: 'networkidle' }); await sp.close(); }
  const p = await ctx.newPage(); p.on('console', m => m.type() === 'error' && R.console.push(`${vp}: ${m.text()}`));
  const M = R[vp] = {};
  await p.goto(base + '/product/p01', { waitUntil: 'networkidle' }); await p.waitForSelector('.pdp__add');
  M.pdp = await p.evaluate(btns, '.pdp .btn');
  const buy = p.locator('.pdp__buy'); await buy.scrollIntoViewIfNeeded();
  if (vp.startsWith('m')) { await p.screenshot({ path: `${out}/${tag}-${vp}-pdp-buy.png` }); await buy.screenshot({ path: `${out}/${tag}-${vp}-pdp-buyrow.png` }); }
  // review sheet (guest → may open auth instead; measure whatever .btn the opened dialog shows)
  await p.locator('.revs__add').scrollIntoViewIfNeeded(); await p.locator('.revs__add').click(); await p.waitForSelector('[role=dialog]');
  M.dialog = { title: await p.locator('[role=dialog] h2').first().textContent(), isReview: await p.locator('[role=dialog] .revf').count() > 0, btns: await p.evaluate(btns, '[role=dialog] .btn') };
  if (vp.startsWith('m')) await p.screenshot({ path: `${out}/${tag}-${vp}-dialog.png` });
  if (process.env.LOGIN && vp.startsWith('m') && !M.dialog.isReview) { // sandbox mock OTP (local API devCode) → the review sheet itself
    await p.getByLabel('شماره موبایل').last().fill('0912' + String(Math.floor(1e6 + Math.random() * 8e6)).padStart(7, '0'));
    const [resp] = await Promise.all([p.waitForResponse(r => r.url().endsWith('/api/auth/otp/request')), p.getByRole('dialog').getByRole('button', { name: 'ادامه' }).click()]);
    await p.getByLabel('رقم ۱ کد تأیید').fill((await resp.json()).data.devCode); await p.getByRole('dialog').getByRole('button', { name: 'تأیید و ورود' }).click();
    await p.waitForSelector('[role=dialog] .revf', { timeout: 10000 }).catch(async () => { await p.waitForTimeout(800); if (!(await p.locator('[role=dialog] .revf').count())) { await p.keyboard.press('Escape'); await p.locator('.revs__add').click(); await p.waitForSelector('[role=dialog] .revf'); } });
    M.sheet = await p.evaluate(btns, '[role=dialog] .btn');
    await p.screenshot({ path: `${out}/${tag}-${vp}-review-sheet.png` });
    for (const x of M.sheet) ok(x.fs === '14px' && x.fw === '500' && x.lines === 1 && !x.overflow && x.h >= 48 && x.h <= 50, `${vp} sheet ${x.text} ${x.fs}/${x.fw} h${x.h}`);
  }
  await p.keyboard.press('Escape');
  // other pages using the same .btn component (should be untouched)
  if (vp === 'm360' || vp === 'desktop') {
    await p.goto(base + '/product/p01', { waitUntil: 'networkidle' }); await p.locator('input[name=size]:not(:disabled)').first().check(); await p.locator('.pdp__add').click(); await p.waitForSelector('.toast');
    if (vp === 'm360') await p.screenshot({ path: `${out}/${tag}-${vp}-pdp-toast.png` });
    M.others = {};
    for (const path of ['/', '/cart', '/checkout', '/info/faq', '/support/contact', '/favorites', '/account']) { await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(250); M.others[path] = await p.evaluate(btns, 'main .btn'); }
  }
  await ctx.close();
  // checks
  const add = M.pdp.find(x => /pdp__add/.test(x.cls)), rv = M.pdp.find(x => /revs__add/.test(x.cls));
  for (const x of [...M.pdp, ...M.dialog.btns]) ok(x.lines === 1 && !x.overflow && !x.clipsViewport, `${vp} ${x.text} lines=${x.lines} overflow=${x.overflow}`);
  if (vp.startsWith('m')) {
    for (const x of [add, rv, ...M.dialog.btns.filter(d => M.dialog.isReview)]) ok(x.fs === '14px' && x.fw === '500' && x.lh === '24px' && x.h >= 48 && x.h <= 50, `${vp} ${x.text} ${x.fs}/${x.fw}/${x.lh} h${x.h}`);
  }
  if (BEFORE) for (const k of vp.startsWith('m') ? ['dialog'] : ['pdp', 'dialog']) {
    const strip = a => a.map(({ cls, text, fs, fw, lh, w, h, lines }) => ({ cls, text, fs, fw, lh, w, h, lines }));
    const a = k === 'dialog' ? M[k].btns : M[k], bb = k === 'dialog' ? BEFORE[vp][k].btns : BEFORE[vp][k];
    ok(JSON.stringify(strip(a)) === JSON.stringify(strip(bb)), `${vp} ${k} changed vs before`);
  }
  if (BEFORE && M.others) for (const [path, a] of Object.entries(M.others)) {
    const strip = a => a.map(({ cls, text, fs, fw, lh, w, h }) => ({ cls, text, fs, fw, lh, w, h }));
    ok(JSON.stringify(strip(a)) === JSON.stringify(strip(BEFORE[vp].others[path] ?? [])), `${vp} ${path} buttons changed vs before`);
  }
}
await b.close();
R.pass = R.fails.length === 0;
writeFileSync(`${out}/${tag}-qa.json`, JSON.stringify(R, null, 2));
const brief = x => x && `${x.text} ${x.fs}/${x.fw}/${x.lh} ${x.w}x${x.h} lines=${x.lines}${x.overflow ? ' OVERFLOW' : ''} icon=${x.iconShown}`;
console.log(JSON.stringify({ pass: R.pass, fails: R.fails, console: R.console,
  ...Object.fromEntries(VPS.map(([vp]) => [vp, { add: brief(R[vp].pdp.find(x => /pdp__add/.test(x.cls))), review: brief(R[vp].pdp.find(x => /revs__add/.test(x.cls))), dialog: R[vp].dialog.title + ' | ' + R[vp].dialog.btns.map(brief).join(' ; '), sheet: (R[vp].sheet ?? []).map(brief).join(' ; ') }])) }, null, 1));
