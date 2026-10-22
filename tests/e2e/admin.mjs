// admin-demo UI e2e + desktop screenshots. Usage: BASE=http://127.0.0.1:4180 node tests/e2e/admin.mjs
// Needs the API with JOUMEH_ADMIN_DEMO=1. Screenshots → ../reports/shots/admin-demo-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4180';
const OUT = new URL(process.env.SHOTS ?? '../../../reports/shots/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
// JS exceptions fail the run; HTTP 4xx console lines come from the intentional error-path checks (403/400/409) and are only listed.
const errors = []; const httpErr = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => m.type() === 'error' && (m.text().startsWith('Failed to load resource') ? httpErr : errors).push(m.text()));
const results = []; const ok = (name, cond) => { results.push([name, !!cond]); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };
const shot = n => page.screenshot({ path: `${OUT}admin-demo-${n}.png`, fullPage: true });
const text = () => page.locator('body').innerText();
const banner = async () => (await page.locator('.adm-demo').count()) === 1 && (await page.locator('.adm-demo').innerText()).includes('DEMO — data resets');
const go = async (p, n) => { await page.goto(BASE + p); await page.waitForLoadState('networkidle'); if (n) await shot(n); };

await go('/admin', 'login');
ok('login: banner shown', await banner());
await page.fill('input[inputmode=numeric]', '09123456789'); await page.click('button[type=submit]'); await page.waitForSelector('[role=alert]');
ok('login: customer number denied', (await text()).includes('این شماره دسترسی مدیریت ندارد'));
await page.fill('input[inputmode=numeric]', '09120000001'); await page.click('button[type=submit]'); await page.waitForSelector('.adm-kpis');
await page.waitForLoadState('networkidle'); await shot('dashboard');
ok('dashboard: KPIs + recent orders', (await page.locator('.adm-kpi').count()) === 8 && (await page.locator('.adm-table tbody tr').count()) === 5);
ok('dashboard: banner on every screen', await banner());
ok('r2 S1: dashboard nav item active on /admin', (await page.locator('.adm-side a.on').innerText()).includes('داشبورد'));
ok('r2 S2: open-orders count pill on Orders nav', (await page.locator('.adm-side a', { hasText: 'سفارش‌ها' }).locator('.cnt').count()) === 1);
ok('r2 D1: KPI chart icons', (await page.locator('.adm-kpi img[src*="Chart"]').count()) === 8);

await go('/admin/products', 'products');
ok('products: list 10 rows, 43 total', (await page.locator('tbody tr').count()) === 10 && (await text()).includes('۴۳ محصول'));
await page.click('role=tab[name=/پیش‌نویس/]'); await page.waitForTimeout(300);
ok('products: draft tab filters', (await page.locator('tbody tr').count()) === 2);
ok('r2 P2: filters row with more-filters ghost', (await page.locator('.adm-filters button:has-text("فیلترهای بیشتر")').count()) === 1);
await go('/admin/products/new'); await page.click('text=ذخیره پیش‌نویس'); await page.waitForTimeout(300);
ok('products: create validation errors', (await page.locator('.err').count()) >= 3); await shot('products-create-error');
ok('r2 E4: top danger banner, no red toast', (await page.locator('.adm-banner.danger').innerText()).includes('خطا') && !(await page.locator('.adm-toast.err, .adm-toast.error').count()));
const inputs = page.locator('.adm-card input.adm-input');
await inputs.nth(0).fill('مانتو آزمایشی'); await inputs.nth(1).fill('test-e2e'); await page.selectOption('.adm-card select >> nth=0', '1');
await page.locator('input[inputmode=numeric]').first().fill('990000'); await page.click('text=ذخیره پیش‌نویس'); await page.waitForURL(/\/admin\/products\/\d+$/); await page.waitForLoadState('networkidle');
ok('products: draft created', (await text()).includes('پیش‌نویس'));
await page.click('button:has-text("انتشار")'); await page.click('.adm-modal button:has-text("انتشار")'); await page.waitForTimeout(400);
ok('products: published', (await page.locator('section:has(h2:text-is("وضعیت")) .adm-badge').innerText()).includes('منتشر شده'));
const shop = await (await page.request.get(BASE + '/api/products/test-e2e')).json(); ok('products: visible in shop after publish', shop.data?.name === 'مانتو آزمایشی');
await go('/admin/products/1', 'product-edit');
ok('products: edit shows variants + BD-10 stub', (await text()).includes('BD-10') && (await page.locator('tbody tr').count()) === 10);
ok('r2 E1: status + publish checklist side cards', (await text()).includes('چک‌لیست انتشار') && (await page.locator('.adm-check-list li').count()) === 6);
ok('r2 E2/E3: archive is danger, variant status badges', (await page.locator('.adm-btn.danger', { hasText: 'بایگانی' }).count()) === 1 && (await page.locator('tbody .adm-badge').count()) === 10);
await go('/admin/categories', 'categories'); ok('categories: list', (await page.locator('tbody tr').count()) >= 2);
ok('r3 SH-2: category «فعال» labelled sample', (await page.locator('tbody .adm-badge', { hasText: 'فعال · نمونه' }).count()) >= 2);
await page.click('button:has-text("افزودن دسته")'); await shot('categories-modal');
await page.locator('.adm-modal input').nth(0).fill('زیردسته آزمایشی'); await page.locator('.adm-modal input').nth(1).fill('e2e-sub');
await page.selectOption('.adm-modal select', { index: 1 }); await page.click('.adm-modal .adm-modal-foot button:has-text("افزودن دسته")'); await page.waitForTimeout(400);
ok('r2 C1: add-category modal creates a child row in the tree', (await page.locator('tbody tr.child', { hasText: 'زیردسته آزمایشی' }).count()) === 1);
await page.locator('tbody tr >> nth=0').locator('.adm-ovf-btn').click();
ok('r2 C1: overflow has ویرایش, delete disabled', (await page.locator('[role=menuitem]:has-text("ویرایش")').count()) === 1 && await page.locator('[role=menuitem]:has-text("حذف")').isDisabled());
await page.keyboard.press('Escape'); await page.mouse.click(5, 5);

await go('/admin/orders', 'orders'); ok('orders: list 10', (await page.locator('tbody tr').count()) === 10);
ok('r3 SH-1: channel labelled sample', (await page.locator('th', { hasText: 'کانال (نمونه)' }).count()) === 1);
ok('r2 O1: channel + fulfilment columns, export disabled', (await text()).includes('کانال') && (await page.locator('th', { hasText: 'ارسال' }).count()) >= 1 && await page.locator('button:has-text("خروجی")').isDisabled());
await page.fill('input[placeholder*="شماره سفارش"]', '10124'); await page.waitForTimeout(400); ok('orders: search', (await page.locator('tbody tr').count()) === 1);
await go('/admin/orders/10124', 'order-detail');
ok('orders: detail with BD stubs', (await text()).includes('BD-02') && (await text()).includes('BD-06'));
await page.click('button:has-text("ثبت ارسال")'); await page.click('.adm-modal button:has-text("تأیید")'); await page.waitForTimeout(400);
ok('orders: status → shipped', (await page.locator('.adm-badge', { hasText: 'ارسال شده' }).count()) >= 1);
await page.fill('textarea', 'یادداشت آزمایشی'); await page.click('button:has-text("ثبت یادداشت")'); await page.waitForTimeout(300); ok('orders: note added', (await text()).includes('یادداشت آزمایشی'));
await go('/admin/orders/10122'); await page.click('.adm-actions button:has-text("بیشتر")'); await page.click('[role=menuitem]:has-text("لغو سفارش")'); await page.click('.adm-modal button:has-text("لغو سفارش")'); await page.waitForTimeout(300);
ok('orders: cancel requires reason', (await page.locator('.adm-modal .err').count()) === 1);
await page.mouse.move(5, 5);
ok('r2 M1–M3: modal 560 + ×, reason select, warning banner, tinted danger', (await page.locator('.adm-modal').evaluate(e => Math.round(e.getBoundingClientRect().width))) === 560 && (await page.locator('.adm-modal .adm-x').count()) === 1 && (await page.locator('.adm-modal select').count()) === 1 && (await page.locator('.adm-modal .adm-banner.warning').innerText()).includes('BD-05') && (await page.locator('.adm-modal .adm-btn.danger').evaluate(e => getComputedStyle(e).backgroundColor)) === 'rgb(253, 242, 242)');
await page.selectOption('.adm-modal select', 'درخواست مشتری'); await shot('order-cancel-modal'); await page.fill('.adm-modal textarea', 'توضیح آزمایشی'); await page.click('.adm-modal button:has-text("لغو سفارش")'); await page.waitForTimeout(400);
ok('orders: cancelled', (await page.locator('.adm-head ~ div .adm-badge', { hasText: 'لغو شده' }).count()) === 1);

await go('/admin/customers', 'customers'); ok('customers: list 6', (await page.locator('tbody tr').count()) === 6);
await page.click('tbody tr >> nth=0'); await page.waitForLoadState('networkidle'); await shot('customer-profile'); ok('customers: profile', (await text()).includes('آدرس‌ها'));
await page.fill('textarea', 'یادداشت مشتری آزمایشی'); await page.click('button:has-text("ثبت یادداشت")'); await page.waitForTimeout(300); ok('r2 CU2: customer internal note', (await text()).includes('یادداشت مشتری آزمایشی'));

await go('/admin/reviews', 'reviews');
ok('r3 RV-6: proposal note replaces PENDING DESIGN, page meta', (await text()).includes('طرح پیشنهادی — در انتظار تصمیم') && !(await text()).includes('PENDING DESIGN') && (await text()).includes('نظرات بلافاصله و بدون بررسی منتشر می‌شوند · داده نمونه'));
ok('reviews: 5 rows', (await page.locator('tbody tr').count()) === 5);
ok('r3 RV-1: no hide/show/delete buttons in reviews UI', !(await page.locator('main button, .adm-main button').filter({ hasText: /پنهان کردن|^نمایش$|^حذف$/ }).count()));
ok('r3 RV-2: no status tabs, no status column', !(await page.locator('[role=tab]').count()) && !(await page.locator('th', { hasText: 'وضعیت' }).count()));
ok('r3 RV-3: product cell thumbnail + SKU, column order', (await page.locator('tbody tr >> nth=0').locator('.adm-prod img, .adm-prod .adm-thumb').count()) === 1 && /\S/.test(await page.locator('tbody tr >> nth=0 >> .adm-prod small').innerText()) && (await page.locator('thead th').allInnerTexts()).slice(0, 5).join('|') === 'محصول|نویسنده|امتیاز|متن نظر|تاریخ');
await page.locator('tbody tr >> nth=0').locator('.adm-ovf-btn').click();
ok('r3 RV-3: ⋯ menu has exactly the two view items', (await page.locator('[role=menuitem]').allInnerTexts()).join('|') === 'مشاهده محصول در فروشگاه|مشاهده مشتری'); await shot('reviews-menu');
await page.click('[role=menuitem]:has-text("مشاهده مشتری")'); await page.waitForURL(/\/admin\/customers\/\d+$/); await page.waitForSelector("text=آدرس‌ها"); ok('r3 RV-3: «مشاهده مشتری» opens the customer', (await text()).includes('آدرس‌ها'));
await go('/admin/reviews');
ok('r3 RV-5: stars use the brand colour', (await page.locator('.adm-stars .on >> nth=0').evaluate(e => getComputedStyle(e).color)) === 'rgb(21, 89, 91)');
const nRev = await page.locator('tbody tr').count(); await page.fill('input[aria-label="از تاریخ"]', '2999-01-01'); await page.waitForTimeout(400);
ok('r3 RV-4: date filter narrows the list', nRev > 0 && (await page.locator('tbody tr').count()) === 0 && (await text()).includes('نتیجه‌ای با این فیلترها'));
for (const st of ['empty', 'loading', 'error']) { await go(`/admin/reviews?preview=${st}`, `reviews-${st}`); }
await go('/admin/reviews?preview=empty'); ok('r3 RV-7: empty state', (await text()).includes('هنوز نظری ثبت نشده') && !(await page.locator('button:has-text("افزودن")').count()));
await go('/admin/reviews?preview=error'); ok('r3 RV-7: error state + retry', (await text()).includes('نظرات بارگذاری نشد') && (await page.locator('button:has-text("تلاش دوباره")').count()) === 1);
await go('/admin/reviews?preview=loading'); ok('r3 RV-7: loading skeleton', (await page.locator('[aria-busy=true] .adm-skel-row').count()) === 5);
ok('r3 RV-8: Reviews sidebar item kept', (await page.locator('.adm-side a', { hasText: 'نظرات' }).count()) === 1);

await go('/admin/content', 'content'); ok('content: hero form + 3 sections', (await page.locator('.adm-sec').count()) === 3);
ok('r2 CT1: preview button next to publish', (await page.locator('.adm-actions a:has-text("پیش‌نمایش")').count()) === 1);
await page.click('role=tab[name="صفحات و قوانین"]'); await page.waitForTimeout(200); await shot('content-pages');
await page.click('tbody tr >> nth=0'); await page.waitForLoadState('networkidle');
await page.fill('textarea', 'متن آزمایشی ارسال'); await page.click('button:has-text("انتشار")'); await page.waitForTimeout(400); await shot('content-edit');
await go('/info/shipping'); ok('content: published page shows in shop', (await text()).includes('متن آزمایشی ارسال'));

await go('/admin/settings/users', 'settings-users'); ok('settings: 4 admin users + matrix', (await page.locator('tbody tr').count()) >= 4 + 6);
await page.click('button:has-text("دعوت کاربر")'); await page.waitForSelector('.adm-modal');
ok('r4: freshly opened invite modal shows no errors', (await page.locator('.adm-modal .err, .adm-modal .bad').count()) === 0);
await page.click('.adm-modal-foot button:has-text("ارسال دعوت")'); await page.waitForTimeout(300);
const e0 = await page.locator('.adm-modal .err').allInnerTexts();
ok('r4: empty submit shows name, mobile and role errors', e0.length === 3 && e0.some(t => t.includes('نام')) && e0.some(t => t.includes('موبایل')));
await page.fill('.adm-modal input >> nth=0', 'کاربر آزمایشی');
const e1 = await page.locator('.adm-modal .err').allInnerTexts();
ok('r4: name error clears as soon as the name is valid', e1.length === 2 && !e1.some(t => t.includes('نام')));
await page.fill('.adm-modal input[inputmode=numeric]', '0912000009'); ok('r4: invalid mobile keeps its error', (await page.locator('.adm-modal .err', { hasText: 'موبایل' }).count()) === 1);
await page.fill('.adm-modal input[inputmode=numeric]', '09120000099');
const e2 = await page.locator('.adm-modal .err').allInnerTexts();
ok('r4: mobile error clears as soon as the number is valid (only roles left)', e2.length === 1 && !e2.some(t => t.includes('موبایل')));
await page.click('.adm-modal-foot button:has-text("انصراف")'); await page.click('button:has-text("دعوت کاربر")'); await page.waitForSelector('.adm-modal');
ok('r4: reopened modal is clean (no errors, empty fields)', (await page.locator('.adm-modal .err, .adm-modal .bad').count()) === 0 && (await page.locator('.adm-modal input >> nth=0').inputValue()) === '');
await page.keyboard.press('Escape'); await page.waitForTimeout(150); await page.click('button:has-text("دعوت کاربر")'); await page.waitForSelector('.adm-modal');
ok('r4: modal reopened after Escape is clean', (await page.locator('.adm-modal .err').count()) === 0);
await page.click('.adm-modal-foot button:has-text("ارسال دعوت")'); await page.waitForTimeout(300);
await page.fill('.adm-modal input >> nth=0', 'کاربر آزمایشی'); await page.fill('.adm-modal input[inputmode=numeric]', '09120000099');
await page.click('.adm-modal [role=combobox]'); await page.click('.adm-ms-list label >> nth=1');
ok('r4: role error clears as soon as a role is picked', (await page.locator('.adm-modal .err').count()) === 0);
await page.click('.adm-ms-list label >> nth=2'); await shot('settings-invite-open');
await page.click('.adm-modal-head h2'); await page.waitForTimeout(150);
ok('r3: invite dropdown closes on outside click (closed-state shot)', !(await page.locator('.adm-ms-list').count()) && await page.locator('.adm-modal-foot button:has-text("ارسال دعوت")').isVisible() && await page.locator('.adm-modal .adm-banner.info').isVisible());
ok('r2 U2: multi-select tags + BD-13 info banner', (await page.locator('.adm-ms-tag').count()) === 2 && (await page.locator('.adm-modal .adm-banner.info').innerText()).includes('BD-13'));
ok('r4: closed-state shot is filled, valid, no errors', (await page.locator('.adm-modal .err, .adm-modal .bad').count()) === 0); await shot('settings-invite');
await page.click('.adm-modal-foot button:has-text("ارسال دعوت")'); await page.waitForTimeout(400); ok('r3: invite submits with multi-select roles', !(await page.locator('.adm-modal').count()) && (await text()).includes('کاربر آزمایشی'));
await page.keyboard.press('Escape');
await page.locator('tbody tr >> nth=0').locator('.adm-ovf-btn').click(); await page.click('[role=menuitem]:has-text("ویرایش")'); await page.uncheck('.adm-modal label:has-text("مدیر کل") input'); await page.click('.adm-modal button:has-text("ذخیره")'); await page.waitForTimeout(300);
ok('settings: last-owner protection', (await text()).includes('حداقل یک مدیر کل')); await page.keyboard.press('Escape');
await go('/admin/settings/audit', 'settings-audit'); ok('audit: entries logged', (await page.locator('tbody tr').count()) >= 6);
ok('r2 U3: audit filters + disabled export', (await page.locator('.adm-filters').count()) === 1 && await page.locator('button:has-text("خروجی")').isDisabled());

// Role check: catalog manager
await page.click('button[aria-label="خروج"]'); await page.waitForSelector('.adm-login');
await page.click('.adm-accts button:has-text("مسئول محصولات")'); await page.waitForSelector('.adm-side');
ok('roles: deep link to a forbidden page after login shows no-permission', (await page.locator('.adm-noperm').count()) === 1);
await go('/admin'); await page.waitForSelector('.adm-kpis');
ok('roles: catalog manager sees no Orders/Settings nav', !(await page.locator('.adm-side a', { hasText: 'سفارش‌ها' }).count()) && !(await page.locator('.adm-side a', { hasText: 'تنظیمات' }).count()));
await go('/admin/orders', 'no-permission'); ok('r2 N1: no-permission card under the page title', (await page.locator('.adm-head h1').innerText()) === 'سفارش‌ها' && (await page.locator('.adm-noperm').innerText()).includes('دسترسی ندارید') && (await text()).includes('این بخش برای نقش شما فعال نیست.') && (await page.locator('.adm-noperm .adm-lock img').count()) === 1);

// Shop smoke (unchanged storefront)
await go('/'); ok('shop: home renders, no admin banner', !(await page.locator('.adm-demo').count()) && (await page.locator('header').count()) >= 1);
await go('/women'); ok('shop: draft products hidden from listing', !(await text()).includes('(داده نمونه) draft'));
ok('no JS errors', errors.length === 0); if (errors.length) console.log(errors); console.log(`expected HTTP error responses from negative checks: ${httpErr.length}`);
await b.close();
const f = results.filter(r => !r[1]); console.log(`\n${results.length - f.length}/${results.length} passed`); process.exit(f.length ? 1 : 0);
