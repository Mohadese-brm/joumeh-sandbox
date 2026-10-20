// End-to-end purchase flow in a real browser (local only): PDP → cart → checkout → OTP login → mock payment → confirmation.
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4173';
const b = await chromium.launch(); const results = [];
const step = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL ' + String(e).split('\n')[0]]); throw e; } };
for (const [vp, width] of [['desktop', 1280], ['mobile', 375]]) {
  const pg = await b.newPage({ viewport: { width, height: 800 } }); const phone = vp === 'desktop' ? '09121111111' : '09122222222';
  try {
    await step(`${vp}: size required before add`, async () => { await pg.goto(BASE + '/product/women-2'); await pg.getByRole('button', { name: 'افزودن به سبد خرید' }).click(); await pg.getByText('لطفاً سایز را انتخاب کنید.').waitFor(); });
    await step(`${vp}: add to cart shows toast`, async () => { await pg.locator('input[name=size][value=L]').check(); await pg.getByRole('button', { name: 'افزودن به سبد خرید' }).click(); await pg.getByText('به سبد اضافه شد').waitFor(); });
    await step(`${vp}: cart qty + remove/undo`, async () => {
      await pg.goto(BASE + '/cart'); await pg.getByRole('button', { name: /افزایش تعداد/ }).click(); await pg.locator('.citem output', { hasText: '۲' }).waitFor();
      await pg.getByRole('button', { name: /^حذف .* از سبد$/ }).click(); await pg.getByText('سبد خرید شما خالی است').waitFor();
      await pg.getByRole('button', { name: 'بازگرداندن' }).click(); await pg.locator('.citem').first().waitFor(); });
    await step(`${vp}: checkout requires login (BD-07), OTP via modal`, async () => {
      await pg.getByRole('button', { name: 'ادامه فرایند خرید' }).click(); await pg.getByRole('heading', { name: 'اطلاعات ارسال' }).waitFor();
      await pg.getByRole('button', { name: 'ورود / ثبت‌نام' }).click(); await pg.getByLabel('شماره موبایل').last().fill(phone);
      await pg.getByRole('dialog').getByRole('button', { name: 'ادامه' }).click(); const code = (await pg.getByTestId('dev-otp').locator('bdi').textContent()).trim();
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
    await step(`${vp}: favourite toggle then listed, then red remove link (127:468)`, async () => {
      await pg.goto(BASE + '/women'); await pg.getByRole('button', { name: /^مانتو کتان کویری در علاقه‌مندی‌ها$/ }).click(); await pg.getByText('به علاقه‌مندی‌ها اضافه شد').waitFor();
      await pg.goto(BASE + '/account/favorites'); await pg.getByRole('heading', { name: 'مانتو کتان کویری' }).waitFor();
      await pg.getByRole('button', { name: /حذف از علاقه‌مندی‌ها — مانتو کتان کویری/ }).click(); await pg.getByRole('heading', { name: 'مانتو کتان کویری' }).waitFor({ state: 'detached' }); });
    await step(`${vp}: card bag button → PDP size-required state (P9)`, async () => {
      await pg.goto(BASE + '/women'); await pg.getByRole('button', { name: 'افزودن مانتو کتان کویری به سبد خرید' }).click(); await pg.waitForURL(/product\/women-1/); await pg.getByText('لطفاً سایز را انتخاب کنید.').waitFor(); });
    await step(`${vp}: filter Apply via «نمایش N محصول» updates URL; «پاک کردن» resets`, async () => {
      await pg.goto(BASE + '/women'); await pg.getByRole('button', { name: /فیلترها/ }).click(); await pg.getByRole('checkbox', { name: 'مانتو' }).check();
      const btn = pg.getByRole('button', { name: /^نمایش .* محصول$/ }); await pg.waitForFunction(() => /نمایش [۰-۹]+ محصول/.test(document.querySelector('.filters__act .btn--primary')?.textContent ?? ''));
      await btn.click(); await pg.waitForURL(/type=/); await pg.getByRole('button', { name: /فیلترها/ }).click(); await pg.getByRole('button', { name: 'پاک کردن' }).click(); await pg.waitForURL(u => !u.search.includes('type=')); });
    await step(`${vp}: logout confirm`, async () => { await pg.goto(BASE + '/account'); await pg.getByRole('button', { name: 'خروج' }).click(); await pg.getByRole('dialog').getByRole('button', { name: 'خروج' }).click(); await pg.waitForURL(BASE + '/'); });
  } catch { /* recorded */ }
  await pg.close();
}
await b.close();
for (const r of results) console.log(r[1].padEnd(6), r[0]);
const fails = results.filter(r => r[1] !== 'PASS').length; console.log(`\n${results.length - fails}/${results.length} flow steps passed`); process.exit(fails ? 1 : 0);
