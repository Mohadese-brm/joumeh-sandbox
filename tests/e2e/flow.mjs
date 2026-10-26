// Requires the local API with the explicit demo-OTP opt-in: `npm run api:demo` (JOUMEH_DEMO_OTP=1).
// End-to-end purchase flow in a real browser (local only): PDP → cart → checkout → OTP login → mock payment → confirmation.
// admin-v1: slugs/names updated to the real catalogue (p01 «مجموعه یزد – ۰۱», p02); needs sample placeholders on (app default) for prices + sizes.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4173';
const h = await (await fetch('http://127.0.0.1:3001/api/auth/otp/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '09129999999' }) })).json();
if (!h.data?.devCode) { console.error('API is not in demo-OTP mode. Start it with JOUMEH_DEMO_OTP=1 (npm run api:demo).'); process.exit(2); }
const b = await chromium.launch(); const results = [];
const step = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL ' + String(e).split('\n')[0]]); throw e; } };
for (const [vp, width] of [['desktop', 1280], ['mobile', 375]]) {
  const pg = await b.newPage({ viewport: { width, height: 800 } }); const phone = vp === 'desktop' ? '09121111111' : '09122222222';
  try {
    await step(`${vp}: size required before add`, async () => { await pg.goto(BASE + '/product/p02'); await pg.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).click(); await pg.getByText('لطفاً سایز را انتخاب کنید.').waitFor(); });
    await step(`${vp}: add to cart shows toast`, async () => { await pg.locator('input[name=size][value=L]').check(); await pg.getByRole('button', { name: 'افزودن به سبد خرید', exact: true }).click(); await pg.getByText('به سبد اضافه شد').waitFor(); });
    await step(`${vp}: cart qty + remove/undo`, async () => {
      await pg.goto(BASE + '/cart'); await pg.getByRole('button', { name: /افزایش تعداد/ }).click(); await pg.locator('.citem output', { hasText: '۲' }).waitFor();
      await pg.getByRole('button', { name: /^حذف .* از سبد$/ }).click(); await pg.getByText('سبد خرید شما خالی است').waitFor();
      await pg.getByRole('button', { name: 'بازگرداندن' }).click(); await pg.locator('.citem').first().waitFor(); });
    await step(`${vp}: checkout requires login (BD-07), OTP via modal`, async () => {
      await pg.getByRole('button', { name: 'ادامه فرایند خرید' }).click(); await pg.getByRole('heading', { name: 'اطلاعات ارسال' }).waitFor();
      await pg.getByRole('button', { name: 'ورود / ثبت‌نام' }).click(); await pg.getByLabel('شماره موبایل').last().fill(phone);
      // Round 2: the demo-code box is dev-only (absent in this production build); read the mock code from the local API response instead.
      const [resp] = await Promise.all([pg.waitForResponse(r => r.url().endsWith('/api/auth/otp/request')), pg.getByRole('dialog').getByRole('button', { name: 'ادامه' }).click()]);
      const code = (await resp.json()).data.devCode; if (await pg.getByTestId('dev-otp').count()) throw new Error('dev OTP box visible in production build');
      await pg.getByLabel('رقم ۱ کد تأیید').fill(code); await pg.getByRole('dialog').getByRole('button', { name: 'تأیید و ورود' }).click(); await pg.getByText('ورود موفق').waitFor(); await pg.getByRole('dialog').waitFor({ state: 'detached' }); });
    await step(`${vp}: checkout validation then submit`, async () => {
      await pg.getByRole('button', { name: 'ادامه و پرداخت' }).click(); await pg.locator('.err').first().waitFor();
      await pg.getByLabel('نام و نام خانوادگی').fill('مشتری آزمایشی'); await pg.getByLabel('شماره موبایل').fill(phone); await pg.getByLabel('استان').selectOption('یزد');
      await pg.getByLabel('شهر').fill('یزد'); await pg.getByLabel('نشانی کامل').fill('خیابان نمونه'); await pg.getByLabel('کد پستی').fill('1234567890');
      await pg.getByLabel(/پست پیشتاز/).check(); await pg.getByRole('button', { name: 'ادامه و پرداخت' }).click(); await pg.waitForURL(/checkout\/payment/); });
    await step(`${vp}: mock payment failure then success → confirmation`, async () => {
      await pg.getByRole('button', { name: 'شبیه‌سازی پرداخت ناموفق' }).click(); await pg.getByText(/پرداخت ناموفق بود/).waitFor();
      await pg.getByRole('button', { name: 'پرداخت آزمایشی موفق' }).click(); await pg.waitForURL(/confirmation/); await pg.getByText('پرداخت‌شده (آزمایشی)').waitFor(); });
    await step(`${vp}: new order appears in account orders`, async () => { const id = new URL(pg.url()).pathname.split('/').pop(); const fa = id.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
      await pg.goto(BASE + '/account/orders'); await pg.getByRole('heading', { name: `سفارش ${fa}` }).waitFor(); });
    await step(`${vp}: pagination next(<) goes to page 2, keyboard reachable`, async () => {
      await pg.goto(BASE + '/women'); await pg.getByRole('button', { name: 'صفحه‌ی بعد' }).focus(); await pg.keyboard.press('Enter'); await pg.waitForURL(/page=2/);
      const box = await pg.getByRole('button', { name: 'صفحه‌ی بعد' }).boundingBox(), box1 = await pg.getByRole('button', { name: 'صفحه‌ی ۱' }).boundingBox();
      if (!(box.x < box1.x)) throw new Error('next arrow is not left of page 1'); });
    await step(`${vp}: fix1 — no heart on cards; heart on PDP toggles, then listed, then red remove link (127:468)`, async () => {
      await pg.goto(BASE + '/women'); await pg.locator('.pc').first().waitFor();
      if (await pg.locator('.pc__fav, .pc button[aria-label*="علاقه‌مندی"]').count()) throw new Error('heart still on product cards');
      await pg.goto(BASE + '/product/p01'); const heart = pg.locator('.pdp__fav'); if ((await heart.count()) !== 1) throw new Error('heart missing on PDP');
      await heart.click(); await pg.getByText('به علاقه‌مندی‌ها اضافه شد').waitFor();
      await pg.goto(BASE + '/account/favorites'); await pg.getByRole('heading', { name: 'مجموعه یزد – ۰۱' }).waitFor();
      await pg.getByRole('button', { name: /حذف از علاقه‌مندی‌ها — مجموعه یزد – ۰۱/ }).click(); await pg.getByRole('heading', { name: 'مجموعه یزد – ۰۱' }).waitFor({ state: 'detached' }); });
    await step(`${vp}: card bag button → PDP size-required state (P9)`, async () => {
      await pg.goto(BASE + '/women'); await pg.getByRole('button', { name: 'افزودن به سبد خرید — مجموعه یزد – ۰۱' }).click(); await pg.waitForURL(/product\/p01/); await pg.getByText('لطفاً سایز را انتخاب کنید.').waitFor(); });
    await step(`${vp}: fix1 — no filter UI; sort (56:286 / 56:621 + 56:951) reorders by price`, async () => {
      await pg.goto(BASE + '/women'); await pg.locator('.pc').first().waitFor();
      if (await pg.locator('.filters, .shop__panel, .shop__fbtn').count() || await pg.getByRole('button', { name: /فیلتر/ }).count()) throw new Error('filter UI present');
      const prices = async () => pg.locator('.pc__now').evaluateAll(els => els.map(e => +e.textContent.replace(/[^۰-۹]/g, '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
      if (vp === 'desktop') { if (await pg.locator('select').count()) throw new Error('native select present'); await pg.locator('#sort').click(); await pg.locator('.ssel__opt[aria-selected=true]', { hasText: 'جدیدترین' }).waitFor(); await pg.getByRole('option', { name: 'ارزان‌ترین' }).click(); }
      else { await pg.getByRole('button', { name: /^مرتب‌سازی:/ }).click(); await pg.getByRole('radio', { name: 'ارزان‌ترین' }).click(); }
      await pg.waitForURL(/sort=price-asc/); await pg.waitForFunction(() => document.querySelectorAll('.pc').length > 0);
      await pg.waitForTimeout(300); const p = await prices(); if (!p.length || p.some((v, i) => i && v < p[i - 1])) throw new Error('not ascending: ' + p);
      if (vp === 'mobile' && !(await pg.getByRole('button', { name: 'مرتب‌سازی: ارزان‌ترین' }).count())) throw new Error('mobile sort label not updated'); });
    await step(`${vp}: signup (107:773) requires names, then creates the account`, async () => {
      await pg.goto(BASE + '/account'); await pg.getByRole('button', { name: 'خروج' }).first().click(); await pg.getByRole('dialog').getByRole('button', { name: 'خروج' }).click(); await pg.waitForURL(BASE + '/');
      if (vp === 'mobile') await pg.getByRole('navigation', { name: 'ناوبری پایین' }).getByRole('button', { name: 'پروفایل' }).click(); else await pg.getByRole('button', { name: 'ورود یا ثبت‌نام' }).click();
      await pg.getByRole('button', { name: 'ثبت‌نام کنید' }).click(); const d = pg.getByRole('dialog', { name: 'عضویت' });
      await d.getByRole('button', { name: 'ادامه' }).click(); await d.getByText('نام را وارد کنید').waitFor();
      await d.getByLabel('نام *').fill('نگار'); await d.getByLabel('نام خانوادگی *').fill('رضایی'); const ph = vp === 'desktop' ? '09127777771' : '09127777772'; await d.getByLabel('شماره موبایل').fill(ph);
      const [resp] = await Promise.all([pg.waitForResponse(r => r.url().endsWith('/api/auth/otp/request')), d.getByRole('button', { name: 'ادامه' }).click()]);
      const code = (await resp.json()).data.devCode; const f = pg.getByLabel('رقم ۱ کد تأیید');
      if (!(await f.evaluate(e => e === document.activeElement))) throw new Error('first OTP box not focused');
      await f.fill(code); await pg.getByRole('button', { name: 'تأیید و ورود' }).click(); await pg.getByText('ورود موفق').waitFor(); await pg.getByRole('dialog').waitFor({ state: 'detached' });
      await pg.goto(BASE + '/account'); await pg.getByText('خوش آمدید، نگار').waitFor(); });
    if (vp === 'mobile') await step(`mobile: auth dialogs are a centred 343px card, sort stays a bottom sheet (R2-1, 108:6003)`, async () => {
      const tok = await pg.evaluate(() => { const t = localStorage.getItem('joumeh.token'); localStorage.removeItem('joumeh.token'); return t; });
      await pg.goto(BASE + '/'); await pg.getByRole('navigation', { name: 'ناوبری پایین' }).getByRole('button', { name: 'پروفایل' }).click(); await pg.getByRole('dialog').waitFor();
      for (const open of [async () => {}, async () => pg.getByRole('button', { name: 'ثبت‌نام کنید' }).click()]) {
        await open(); const r = await pg.locator('.modal__box').boundingBox(); const vh = pg.viewportSize().height;
        if (Math.round(r.width) !== 343 || r.x < 15 || vh - (r.y + r.height) < 15 || (await pg.locator('.modal__grip').count())) throw new Error('auth modal not a centred card: ' + JSON.stringify(r));
      }
      await pg.keyboard.press('Escape'); await pg.goto(BASE + '/women'); await pg.getByRole('button', { name: /^مرتب‌سازی:/ }).click();
      const f = await pg.locator('.modal__box').boundingBox(); if (Math.round(f.y + f.height) < pg.viewportSize().height - 1 || Math.round(f.width) !== 375) throw new Error('sort not a bottom sheet');
      await pg.keyboard.press('Escape'); await pg.evaluate(t => t && localStorage.setItem('joumeh.token', t), tok); });
    await step(`${vp}: logout confirm`, async () => { await pg.goto(BASE + '/account'); await pg.getByRole('button', { name: 'خروج' }).click(); await pg.getByRole('dialog').getByRole('button', { name: 'خروج' }).click(); await pg.waitForURL(BASE + '/'); });
  } catch { /* recorded */ }
  await pg.close();
}
await b.close();
for (const r of results) console.log(r[1].padEnd(6), r[0]);
const fails = results.filter(r => r[1] !== 'PASS').length; console.log(`\n${results.length - fails}/${results.length} flow steps passed`); process.exit(fails ? 1 : 0);
