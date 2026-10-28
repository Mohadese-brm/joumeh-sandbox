// gerdoo-update-2026-10-28: screenshots of the NEW features against a LOCAL run of gerdoo/server.ts
// (in-memory SQLite, real catalogue with no prices, JOUMEH_SAMPLE_OVERLAY=1). Never point this at the live store: it creates an admin.
// BASE=http://localhost:8091 OUT=reports/shots/gerdoo-update-2026-10-28 node tests/e2e/gerdoo-update-shots.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const base = process.env.BASE ?? 'http://localhost:8091';
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(base)) { console.error('local only'); process.exit(1); }
const out = process.env.OUT ?? 'reports/shots/gerdoo-update-2026-10-28';
const R = { base, at: new Date().toISOString(), checks: {}, console: [] };
const b = await chromium.launch();
const VPS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } }; // mobile first: the real create runs once, on desktop, at the end
const PW = 'local-only-' + Math.random().toString(36).slice(2, 12); // throwaway, local in-memory DB, never written anywhere
for (const [vp, viewport] of Object.entries(VPS)) {
  const ctx = await b.newContext({ viewport, locale: 'fa-IR', deviceScaleFactor: 1 });
  const p = await ctx.newPage(); p.on('console', m => { if (m.type() === 'error') R.console.push(`${vp}: ${m.text().slice(0, 160)}`); });
  const go = async path => { await p.goto(base + path, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); };
  const shot = (n, full = true) => p.screenshot({ path: `${out}/local-overlay-${vp}-${n}.png`, fullPage: full });
  const c = R.checks[vp] = {};
  await go('/'); c.sampleBar = await p.locator('[data-testid=sample-bar]').textContent(); c.footerSample = await p.locator('.ftr__sample').textContent().catch(() => null); await shot('home', false);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(300); await shot('footer', false);
  await go('/women'); c.cardSampleTags = await p.locator('.pc__sample').count(); c.cards = await p.locator('.pc').count(); await shot('women');
  await go('/product/p02'); c.pdpTag = await p.locator('.pdp .tag-sample').first().textContent().catch(() => null);
  c.reviewsSample = await p.getByText('(نمونه)').count(); await shot('pdp');
  await p.locator('label.size', { hasText: /^M$/ }).first().click(); await p.locator('.pdp__add').click(); await p.waitForTimeout(800);
  await go('/cart'); c.cartBlocked = await p.locator('[data-testid=orders-blocked]').textContent().catch(() => null);
  c.checkoutBtn = await p.getByRole('button', { name: /ثبت سفارش غیرفعال/ }).or(p.getByRole('link', { name: /ثبت سفارش غیرفعال/ })).first().textContent().catch(() => null); await shot('cart');
  await go('/checkout'); c.checkoutBlocked = await p.locator('[data-testid=orders-blocked]').count(); await shot('checkout');
  // one-time admin setup page
  await go('/admin/setup'); c.setupOpen = await p.locator('[data-testid=setup-form]').count(); await shot('setup-open');
  const f = p.locator('[data-testid=setup-form]');
  await f.locator('input[name=email]').fill('someone@example.com'); await f.locator('input[name=name]').fill('نمونه');
  await f.locator('input[name=password]').fill('short'); await f.locator('input[name=password2]').fill('other'); await f.locator('button[type=submit]').click(); await p.waitForTimeout(300);
  c.clientErrors = await f.locator('.adm-field__err, [role=alert], .err').allTextContents().catch(() => []); await shot('setup-error-password');
  await f.locator('input[name=password]').fill(PW); await f.locator('input[name=password2]').fill(PW); await f.locator('button[type=submit]').click(); await p.waitForTimeout(600);
  c.wrongEmail = await f.innerText(); await shot('setup-error-email');
  if (vp === 'desktop') { // the real create runs once (desktop); mobile then sees the closed page
    await f.locator('input[name=email]').fill('mohadesebrahim1329@gmail.com'); await f.locator('button[type=submit]').click(); await p.waitForTimeout(1500);
    c.done = await p.locator('[data-testid=setup-done]').innerText().catch(() => null); await shot('setup-success');
  }
  if (vp === 'desktop') { const resp = await p.goto(base + '/admin/setup', { waitUntil: 'networkidle' }); c.closedStatus = resp.status(); c.closed = await p.locator('[data-testid=setup-closed]').innerText().catch(() => null); await shot('setup-closed'); }
  await ctx.close();
}
{ const ctx = await b.newContext({ viewport: VPS.mobile, locale: 'fa-IR' }); const p = await ctx.newPage(); // mobile, after the account exists
  const resp = await p.goto(base + '/admin/setup', { waitUntil: 'networkidle' }); R.checks.mobile.closedStatus = resp.status();
  R.checks.mobile.closed = await p.locator('[data-testid=setup-closed]').innerText().catch(() => null); await p.screenshot({ path: `${out}/local-overlay-mobile-setup-closed.png`, fullPage: true }); await ctx.close(); }
await b.close();
writeFileSync(`${out}/local-overlay-checks.json`, JSON.stringify(R, null, 2)); console.log(JSON.stringify(R, null, 2));
