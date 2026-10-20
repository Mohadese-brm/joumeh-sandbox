// Full-page Playwright screenshots + axe-core on every page at desktop 1280 and mobile 375.
// Requires: API on 127.0.0.1:3001 and vite (dev or preview) on BASE. Local only.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173';
const API = process.env.API ?? 'http://127.0.0.1:3001/api';
const OUT = new URL('../../reports/shots/', import.meta.url).pathname;
const ONLY = process.env.ONLY;
mkdirSync(OUT, { recursive: true });
const j = async (path, opts = {}) => { const r = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) } }); return r.json(); };
async function session() {
  const phone = '09123456789';
  const req = await j('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) });
  if (!req.data?.devCode) throw new Error('OTP request failed (rate limit? restart API): ' + JSON.stringify(req));
  const v = await j('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code: req.data.devCode }) });
  return v.data.token;
}
async function cartWithItems() {
  const p1 = (await j('/products/women-1')).data, p2 = (await j('/products/women-2')).data, p3 = (await j('/products/women-9')).data;
  const pick = p => p.variants.find(v => v.size === 'M').id;
  let c = (await j('/cart/items', { method: 'POST', body: JSON.stringify({ variantId: pick(p1) }) })).data;
  c = (await j('/cart/items', { method: 'POST', body: JSON.stringify({ cartId: c.cartId, variantId: pick(p2) }) })).data;
  c = (await j('/cart/items', { method: 'POST', body: JSON.stringify({ cartId: c.cartId, variantId: pick(p3) }) })).data;
  return c.cartId;
}
const token = await session();
const PAGES = [
  // name, path, needsAuth, needsCart, action
  ['home', '/'], ['women', '/women'], ['women-p2', '/women?page=2'], ['men', '/men'],
  ['women-filter', '/women', false, false, async (pg, mobile) => { await pg.getByRole('button', { name: /فیلترها/ }).click(); await pg.waitForTimeout(400); }],
  ['product', '/product/women-1'], ['product-added', '/product/women-1', false, false, async pg => { await pg.locator('input[name=size][value=M]').check(); await pg.getByRole('button', { name: 'افزودن به سبد خرید' }).click(); await pg.waitForSelector('.toast'); }],
  ['search', '/', false, false, async pg => { await pg.getByRole('button', { name: 'جستجو' }).click(); await pg.fill('#q', 'کتان'); await pg.waitForSelector('.search__item'); }],
  ['auth-modal', '/', false, false, async (pg, mobile) => { if (mobile) await pg.getByRole('navigation', { name: 'ناوبری پایین' }).getByRole('button', { name: 'پروفایل' }).click(); else await pg.getByRole('button', { name: 'ورود یا ثبت‌نام' }).click(); await pg.waitForSelector('[role=dialog]'); }],
  ['cart-empty', '/cart'], ['cart', '/cart', false, true],
  ['checkout', '/checkout', true, true], ['payment', '/checkout/payment?order=10124', true], ['confirmation', '/checkout/confirmation/10124', true],
  ['account', '/account', true], ['orders', '/account/orders', true], ['order-detail', '/account/orders/10124', true],
  ['returns', '/account/returns', true], ['return-detail', '/account/returns/1', true],
  ['addresses', '/account/addresses', true], ['address-add', '/account/addresses', true, false, async pg => { await pg.getByRole('button', { name: 'افزودن آدرس جدید' }).click(); await pg.getByRole('button', { name: 'ذخیره آدرس' }).click(); await pg.waitForSelector('.err'); }],
  ['favorites', '/account/favorites', true], ['payment-info', '/account/payment', true], ['settings', '/account/settings', true],
  // Round 1 additions
  ['men-filter', '/men', false, false, async pg => { await pg.getByRole('button', { name: /فیلترها/ }).click(); await pg.waitForSelector('.filters__act'); await pg.waitForTimeout(400); }],
  ['auth-code', '/', false, false, async (pg, mobile) => { if (mobile) await pg.getByRole('navigation', { name: 'ناوبری پایین' }).getByRole('button', { name: 'پروفایل' }).click(); else await pg.getByRole('button', { name: 'ورود یا ثبت‌نام' }).click();
    await pg.fill('#phone', mobile ? '09120000002' : '09120000001'); await pg.getByRole('button', { name: 'ادامه' }).click(); await pg.waitForSelector('.otp'); }],
  ['size-required', '/women', false, false, async pg => { await pg.locator('.pc__cart').first().click(); await pg.waitForSelector('#pdp-err'); }],
  ['size-guide', '/product/women-1', false, false, async pg => { await pg.getByRole('button', { name: 'راهنمای سایز' }).click(); await pg.waitForSelector('.sg'); await pg.waitForTimeout(300); }],
  ['size-guide-page', '/info/size-guide'],
  ['faq', '/account/support', true], ['contact', '/account/support/contact', true], ['faq-guest', '/support'],
  ['account-guest', '/account'], ['not-found', '/no-such-page'], ['info', '/info/shipping'],
];
const browser = await chromium.launch();
const results = [];
for (const [vp, width, height] of [['desktop', 1280, 800], ['mobile', 375, 812]]) {
  for (const [name, path, auth, cart, action] of PAGES) {
    if (ONLY && !ONLY.split(',').includes(name)) continue;
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'fa-IR', reducedMotion: 'reduce' });
    const cartId = cart ? await cartWithItems() : null;
    await ctx.addInitScript(([t, c]) => { if (t) localStorage.setItem('joumeh.token', t); if (c) localStorage.setItem('joumeh.cartId', String(c)); }, [auth ? token : null, cartId]);
    const pg = await ctx.newPage(); const errors = [];
    pg.on('console', m => m.type() === 'error' && errors.push(m.text())); pg.on('pageerror', e => errors.push(String(e)));
    await pg.goto(BASE + path, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    if (action) { try { await action(pg, vp === 'mobile'); } catch (e) { errors.push('ACTION FAILED: ' + String(e).split('\n')[0]); } }
    await pg.waitForTimeout(300);
    const file = `${name}-${vp}.png`;
    await pg.screenshot({ path: OUT + file, fullPage: true });
    const axe = await new AxeBuilder({ page: pg }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const v = axe.violations.map(x => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, sample: x.nodes[0]?.target.join(' ') }));
    const dir = await pg.evaluate(() => [document.documentElement.lang, document.documentElement.dir, getComputedStyle(document.body).fontFamily]);
    const overflow = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    results.push({ page: name, viewport: `${vp} ${width}`, path, screenshot: `shots/${file}`, axeViolations: v.length, violations: v, consoleErrors: errors, langDir: dir.slice(0, 2), font: dir[2], horizontalOverflow: overflow });
    console.log(`${vp.padEnd(7)} ${name.padEnd(14)} axe=${v.length} console=${errors.length} overflow=${overflow}${v.length ? ' ' + v.map(x => x.id).join(',') : ''}`);
    await ctx.close();
  }
}
await browser.close();
writeFileSync(OUT + (ONLY ? 'partial-results.json' : 'results.json'), JSON.stringify(results, null, 2));
// address-add deliberately submits an empty form: the API's 400 is logged by Chromium and is expected there.
for (const r of results) if (r.page === 'address-add') { r.expectedConsole = r.consoleErrors.filter(e => /status of 400/.test(e)); r.consoleErrors = r.consoleErrors.filter(e => !/status of 400/.test(e)); }
const bad = results.filter(r => r.axeViolations || r.consoleErrors.length || r.horizontalOverflow);
console.log(`\n${results.length} page renders, ${results.reduce((s, r) => s + r.axeViolations, 0)} axe violations, ${bad.length} with issues`);
process.exit(bad.length ? 1 : 0);
