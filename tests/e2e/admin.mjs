// admin UI e2e (admin-v1: interim e-mail login, 2 full-access admins) + desktop screenshots. Usage: BASE=http://127.0.0.1:4180 node tests/e2e/admin.mjs
// Needs the API with JOUMEH_ADMIN_DEMO=1. admin-v1: expectations follow the real catalogue (41 products, sample placeholders on) + the demo seed (3 demo-only products, 5 orders 10119–10123, 5 customers). Screenshots → ../reports/shots/admin-demo-*.png
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4180';
const OUT = new URL(process.env.SHOTS ?? '../../../reports/shots/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
// JS exceptions fail the run; HTTP 4xx console lines come from the intentional error-path checks (403/400/409) and are only listed.
const errors = []; const httpErr = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => m.type() === 'error' && (m.text().startsWith('Failed to load resource') ? httpErr : errors).push(m.text()));
const results = []; const ok = (name, cond) => { results.push([name, !!cond]); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };
const shot = (n, fullPage = true) => page.screenshot({ path: `${OUT}admin-demo-${n}.png`, fullPage });
const text = () => page.locator('body').innerText();
const banner = async () => (await page.locator('.adm-demo').count()) === 1 && (await page.locator('.adm-demo').innerText()).includes('DEMO — data resets');
const go = async (p, n) => { await page.goto(BASE + p); await page.waitForLoadState('networkidle'); if (n) await shot(n); };

await go('/admin', 'login');
ok('admin-v1: pre-login session check logs no HTTP error (no 401 in console)', httpErr.length === 0);
ok('login: banner shown', await banner());
ok('login: interim e-mail + password form (no phone field)', (await page.locator('.adm-login input[type=email]').count()) === 1 && (await page.locator('.adm-login input[type=password]').count()) === 1 && !(await page.locator('.adm-login input[inputmode=numeric]').count()) && (await text()).includes('interim'));
ok('login: preview demo hint lists the two demo admins', (await page.locator('.adm-accts button').count()) === 2);
await page.fill('input[type=email]', 'owner.demo@joumeh.invalid'); await page.fill('input[type=password]', 'wrong-password-123'); await page.click('button[type=submit]'); await page.waitForSelector('.adm-login .err');
ok('login: wrong password refused', (await text()).includes('ایمیل یا رمز عبور درست نیست'));
await page.click('.adm-accts button:has-text("Owner")'); await page.waitForSelector('.adm-kpis');
ok('login: session is an httpOnly cookie (nothing in JS / localStorage)', !(await page.evaluate(() => document.cookie)).includes('joumeh_admin') && (await page.evaluate(() => Object.keys(localStorage).filter(k => k.includes('admin')).length)) === 0 && (await page.context().cookies()).some(c => c.name === 'joumeh_admin' && c.httpOnly && c.sameSite === 'Strict'));
await page.waitForLoadState('networkidle'); await shot('dashboard');
ok('dashboard: low-stock KPI (Figma 177:16571)', (await page.locator('.adm-kpi', { hasText: 'محصولات کم‌موجود' }).count()) === 1);
ok('dashboard: KPIs + recent orders', (await page.locator('.adm-kpi').count()) === 8 && (await page.locator('.adm-table tbody tr').count()) === 5);
ok('dashboard: banner on every screen', await banner());
ok('r2 S1: dashboard nav item active on /admin', (await page.locator('.adm-side a.on').innerText()).includes('داشبورد'));
ok('r2 S2: open-orders count pill on Orders nav', (await page.locator('.adm-side a', { hasText: 'سفارش‌ها' }).locator('.cnt').count()) === 1);
ok('r2 D1: KPI chart icons', (await page.locator('.adm-kpi img[src*="Chart"]').count()) === 8);

await go('/admin/products', 'products');
ok('products: list 10 rows, 44 total (41 real + 3 demo-only)', (await page.locator('tbody tr').count()) === 10 && (await text()).includes('۴۴ محصول'));
await page.click('role=tab[name=/پیش‌نویس/]'); await page.waitForTimeout(300);
ok('products: draft tab filters', (await page.locator('tbody tr').count()) === 2);
ok('admin-v1: NULL price shows «بدون قیمت» (no invented price)', (await page.locator('tbody td', { hasText: 'بدون قیمت' }).count()) === 2);
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
ok('products: edit shows variants + BD-10 stub', (await text()).includes('BD-10') && (await page.locator('tbody tr').count()) === 5);
ok('r2 E1: status + publish checklist side cards', (await text()).includes('چک‌لیست انتشار') && (await page.locator('.adm-check-list li').count()) === 6);
ok('r2 E2/E3: archive is danger, variant status badges', (await page.locator('.adm-btn.danger', { hasText: 'بایگانی' }).count()) === 1 && (await page.locator('tbody .adm-badge').count()) === 5);
await go('/admin/categories', 'categories'); ok('categories: list', (await page.locator('tbody tr').count()) >= 2);
ok('r3 SH-2: category «فعال» labelled sample', (await page.locator('tbody .adm-badge', { hasText: 'فعال · نمونه' }).count()) >= 2);
await page.click('button:has-text("افزودن دسته")'); await shot('categories-modal');
await page.locator('.adm-modal input').nth(0).fill('زیردسته آزمایشی'); await page.locator('.adm-modal input').nth(1).fill('e2e-sub');
await page.selectOption('.adm-modal select', { index: 1 }); await page.click('.adm-modal .adm-modal-foot button:has-text("افزودن دسته")'); await page.waitForTimeout(400);
ok('r2 C1: add-category modal creates a child row in the tree', (await page.locator('tbody tr.child', { hasText: 'زیردسته آزمایشی' }).count()) === 1);
await page.locator('tbody tr >> nth=0').locator('.adm-ovf-btn').click();
ok('r2 C1: overflow has ویرایش, delete disabled', (await page.locator('[role=menuitem]:has-text("ویرایش")').count()) === 1 && await page.locator('[role=menuitem]:has-text("حذف")').isDisabled());
await page.keyboard.press('Escape'); await page.mouse.click(5, 5);

// ---------- admin-v1: product images (178:18759), date picker (173:14077), inventory (179:21565 / 179:22434) ----------
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
await go('/admin/products/1');
const nImg = await page.locator('.adm-img').count();
await page.setInputFiles('[data-testid=img-file]', { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
ok('images: non-image refused in Persian', (await text()).includes('فقط تصویر JPG، PNG یا WebP مجاز است'));
await page.setInputFiles('[data-testid=img-file]', { name: 'big.png', mimeType: 'image/png', buffer: Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]) });
ok('images: > 5 MB refused in Persian', (await text()).includes('حجم تصویر باید حداکثر ۵ مگابایت باشد'));
const WEBP = readFileSync(new URL('../../public/img/products/012.webp', import.meta.url));
await page.setInputFiles('[data-testid=img-file]', { name: 'front.webp', mimeType: 'image/webp', buffer: WEBP });
await page.click('button:has-text("بارگذاری تصویر")'); await page.waitForTimeout(200);
ok('images: alt text required before upload', (await page.locator('.err', { hasText: 'متن جایگزین (alt) الزامی است' }).count()) >= 1 && (await page.locator('.adm-img').count()) === nImg);
await page.fill('input[placeholder*="نمای روبه‌رو"]', 'تصویر آزمایشی e2e، نمای روبه‌رو'); await page.click('button:has-text("بارگذاری تصویر")');
await page.waitForFunction(n => document.querySelectorAll('.adm-img').length === n + 1, nImg);
const newImg = page.locator('.adm-img').last();
ok('images: uploaded and listed with its alt', (await newImg.locator('img').getAttribute('alt')) === 'تصویر آزمایشی e2e، نمای روبه‌رو');
ok('images: stored file is served', (await page.request.get(BASE + await newImg.locator('img').getAttribute('src'))).status() === 200);
await page.locator('.adm-card:has(h2:text-is("تصاویر"))').scrollIntoViewIfNeeded(); await shot('product-edit-upload');
await newImg.locator('button:has-text("تصویر اصلی شود")').click(); await page.waitForTimeout(400);
ok('images: set as cover moves it first', (await page.locator('.adm-img').first().locator('img').getAttribute('alt')) === 'تصویر آزمایشی e2e، نمای روبه‌رو');
ok('variants: stock column + «تنظیم» per variant', (await page.locator('.adm-card:has(h2:has-text("تنوع‌ها")) button:has-text("تنظیم")').count()) === 5);
await page.click('button:has-text("افزودن تنوع")'); await page.click('.adm-modal button:has-text("افزودن")'); await page.waitForTimeout(300);
ok('variants: add form validates in Persian', (await page.locator('.adm-modal .err').count()) >= 2);
await page.locator('.adm-modal label.adm-check', { hasText: 'XL' }).first().click(); await page.fill('.adm-modal input[placeholder="مثلاً کرم"]', 'زیتونی'); await page.locator('.adm-modal input[dir=ltr]').fill('#6B7B3A');
await page.click('.adm-modal button:has-text("افزودن")'); await page.waitForTimeout(500);
ok('variants: new size×colour added (untracked)', (await page.locator('.adm-card:has(h2:has-text("تنوع‌ها")) tbody tr').count()) === 6);
await go('/admin/products');
await page.click('.adm-dp:has-text("از تاریخ") .adm-dp-in');
ok('date picker: Jalali month grid with ش..ج', (await page.locator('.adm-dp-pop .wd').allInnerTexts()).join('') === 'شیدسچپج' && /۱۴۰۵/.test(await page.locator('.adm-dp-head b').innerText()));
await shot('date-picker');
await page.click('.adm-dp-foot button:has-text("امروز")'); await page.waitForTimeout(400);
ok('date picker: today chosen, list still loads', !(await page.locator('.adm-dp-pop').count()) && /۱۴۰۵/.test(await page.locator('.adm-dp:has-text("از تاریخ") .adm-dp-in').innerText()) && (await page.locator('tbody tr').count()) > 0);
ok('products: «موجودی کل» column', (await page.locator('th', { hasText: 'موجودی کل' }).count()) === 1);

await go('/admin/inventory', 'inventory');
ok('inventory: rows + Figma columns', (await page.locator('tbody tr').count()) === 10 && (await page.locator('thead th').allInnerTexts()).slice(0, 8).join('|') === 'محصول / تنوع|SKU|موجود فیزیکی|رزرو|تخصیص|قابل فروش|حد هشدار|وضعیت');
ok('inventory: formula note with BD-08, «رزرو فروشگاه» tab is a disabled placeholder', (await page.locator('.adm-banner.info').first().innerText()).includes('BD-08') && await page.locator('role=tab[name="رزرو فروشگاه"]').isDisabled());
await page.click('role=tab[name=/کم‌موجود/]'); await page.waitForTimeout(400);
ok('inventory: low-stock tab filters', (await page.locator('tbody .adm-badge', { hasText: 'موجودی کم' }).count()) === (await page.locator('tbody tr').count()) && (await page.locator('tbody tr').count()) > 0);
const firstSku = await page.locator('tbody tr >> nth=0 >> td >> nth=1').innerText();
await page.locator('tbody tr >> nth=0').locator('button:has-text("تنظیم")').click();
await page.click('.adm-modal button:has-text("ثبت تغییر")'); await page.waitForTimeout(200);
ok('adjust: qty + reason required (Persian)', (await page.locator('.adm-modal .err').count()) >= 2 && (await page.locator('.adm-modal').innerText()).includes('دلیل تغییر را انتخاب کنید'));
await page.locator('.adm-modal input[inputmode=numeric]').fill('۶'); await page.selectOption('.adm-modal select', 'ورود کالا'); await page.fill('.adm-modal input[placeholder*="فاکتور"]', 'فاکتور آزمایشی ۲۱۴');
ok('adjust: «پس از ثبت» preview line', (await page.locator('.adm-modal .adm-banner').innerText()).includes('پس از ثبت'));
await shot('inventory-adjust');
await page.click('.adm-modal button:has-text("ثبت تغییر")'); await page.waitForSelector('.adm-modal', { state: 'detached' });
await go('/admin/inventory/history', 'inventory-history');
const h0 = await page.locator('tbody tr >> nth=0').innerText();
ok('history: newest row = the adjustment (+۶, reason, actor)', h0.includes('+۶') && h0.includes('ورود کالا') && h0.includes(firstSku) && h0.includes('فاکتور آزمایشی'));
ok('history: append-only meta, export is a disabled stub', (await text()).includes('فقط افزودنی') && await page.locator('button:has-text("خروجی")').isDisabled());
const audit = await (await page.request.get(BASE + '/api/admin/audit?q=stock')).json().catch(() => ({}));
ok('audit: stock change audited', JSON.stringify(audit).includes('stock:'));
await page.click('.adm-dp .adm-dp-in'); await page.click('.adm-dp-foot button:has-text("امروز")'); await page.waitForTimeout(400);
ok('history: date filter (today) keeps today\'s rows', (await page.locator('tbody tr').count()) > 0);
// in-store sale beyond stock → oversell state
// physical stock can't go below 0; oversell = an in-store sale that leaves less than the paid online orders already allocated
let target; for (let pg = 1; !target && pg <= 20; pg++) { const inv = await (await page.request.get(`${BASE}/api/admin/inventory?size=50&page=${pg}`)).json(); if (!inv.data.length) break; target = inv.data.find(r => r.allocated > 0 && r.available >= 0 && r.onHand > 0); }
ok('POS: found a variant with paid-order allocations', !!target);
await go('/admin/inventory'); await page.click('button:has-text("ثبت سریع فروش حضوری")');
await page.fill('.adm-modal input[placeholder*="JM-"]', target.sku); await page.locator('.adm-picklist button').first().click();
await page.locator('.adm-modal input[inputmode=numeric]').fill(String(target.available + 1));
ok('POS: warns before overselling + BD-09 note', (await page.locator('.adm-modal').innerText()).includes('BD-09') && (await page.locator('.adm-modal .adm-banner.danger').count()) === 1);
await shot('inventory-pos');
await page.click('.adm-modal button:has-text("ثبت فروش و کسر موجودی")'); await page.waitForSelector('.adm-modal', { state: 'detached' }); await page.waitForTimeout(300);
ok('POS: oversell banner shown (recorded, not hidden)', (await page.locator('.adm-banner.danger').first().innerText()).includes('مغایرت'));
await page.click('role=tab[name=/ناموجود/]'); await page.waitForTimeout(400); await shot('inventory-oversell');
ok('inventory: oversold variant shows negative available', (await page.locator('tbody tr', { hasText: target.sku }).innerText()).includes('−۱'));
ok('POS: affected paid orders listed, status not auto-changed', (await page.locator('.adm-banner.danger a[href*="/admin/orders/"]').count()) >= 1);

await go('/admin/orders', 'orders'); ok('orders: list 5 demo orders', (await page.locator('tbody tr').count()) === 5);
ok('r3 SH-1: channel labelled sample', (await page.locator('th', { hasText: 'کانال (نمونه)' }).count()) === 1);
ok('r2 O1: channel + fulfilment columns, export disabled', (await text()).includes('کانال') && (await page.locator('th', { hasText: 'ارسال' }).count()) >= 1 && await page.locator('button:has-text("خروجی")').isDisabled());
await page.fill('input[placeholder*="شماره سفارش"]', '10123'); await page.waitForTimeout(400); ok('orders: search', (await page.locator('tbody tr').count()) === 1);
await go('/admin/orders/10123', 'order-detail');
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

await go('/admin/customers', 'customers'); ok('customers: list 5', (await page.locator('tbody tr').count()) === 5);
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

await go('/admin/settings/users', 'settings-users'); ok('settings: read-only list of the 2 admins (full access, interim)', (await page.locator('tbody tr').count()) === 2 && (await text()).includes('owner.demo@joumeh.invalid') && (await text()).includes('interim') && !(await page.locator('button:has-text("دعوت کاربر")').count()) && !(await page.locator('.adm-ovf-btn').count()));
await go('/admin/settings/audit', 'settings-audit'); ok('audit: entries logged', (await page.locator('tbody tr').count()) >= 6);
ok('r2 U3: audit filters + disabled export', (await page.locator('.adm-filters').count()) === 1 && await page.locator('button:has-text("خروجی")').isDisabled());

// Second admin (business owner): same full access
await page.click('button[aria-label="خروج"]'); await page.waitForSelector('.adm-login');
await page.click('.adm-accts button:has-text("صاحب کسب‌وکار")'); await page.waitForSelector('.adm-side');
await go('/admin'); await page.waitForSelector('.adm-kpis');
ok('roles: business owner sees every module (Orders + Settings nav)', (await page.locator('.adm-side a', { hasText: 'سفارش‌ها' }).count()) === 1 && (await page.locator('.adm-side a', { hasText: 'تنظیمات' }).count()) === 1);
await go('/admin/orders', 'orders-business-owner'); ok('roles: business owner opens Orders (no no-permission card)', !(await page.locator('.adm-noperm').count()) && (await page.locator('tbody tr').count()) >= 5);

// ---------- admin-v1: no sideways scroll at 1440 and 390; mobile shell (177:16745 drawer, 177:16571 dashboard, 180:30160/180:30271 orders, 179:24354/179:24269 inventory) ----------
const PAGES = ['/admin', '/admin/products', '/admin/products/new', '/admin/products/1', '/admin/categories', '/admin/inventory', '/admin/inventory/history', '/admin/orders', '/admin/orders/10123', '/admin/customers', '/admin/customers/1', '/admin/reviews', '/admin/content', '/admin/settings/users', '/admin/settings/audit'];
const hscroll = () => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth);
for (const [w, h] of [[1440, 900], [390, 844]]) {
  await page.setViewportSize({ width: w, height: h }); const bad = [];
  for (const p of PAGES) { await go(p); await page.waitForTimeout(150); const d = await hscroll(); if (d > 0) bad.push(`${p} +${d}px`); }
  ok(`no horizontal scroll at ${w} on ${PAGES.length} admin pages`, !bad.length); if (bad.length) console.log(bad);
}
// at 390 now
await go('/admin'); await page.waitForSelector('.adm-kpis');
ok('mobile: sidebar hidden, 56px header with menu button', !(await page.locator('.adm-side').isVisible()) && (await page.locator('.adm-mtop').evaluate(e => e.getBoundingClientRect().height)) === 56);
ok('mobile: KPIs in 2 columns', await page.evaluate(() => { const k = [...document.querySelectorAll('.adm-kpi')].map(e => e.getBoundingClientRect()); return k[0].top === k[1].top && k[2].top > k[0].top; }));
await shot('m-dashboard', false); await shot('m-dashboard-full');
await page.click('button[aria-label="باز کردن منو"]'); await page.waitForSelector('.adm-drawer');
ok('mobile: drawer 300px on the right, focus inside', (await page.locator('.adm-drawer').evaluate(e => { const r = e.getBoundingClientRect(); return Math.round(r.width) === 300 && Math.round(r.right) === 390 && e.contains(document.activeElement); })));
await shot('m-drawer', false);
await page.keyboard.press('Escape'); await page.waitForTimeout(150); ok('mobile: Esc closes the drawer', !(await page.locator('.adm-drawer').count()));
await page.click('button[aria-label="باز کردن منو"]'); await page.locator('.adm-drawer a', { hasText: 'موجودی انبار' }).click(); await page.waitForLoadState('networkidle');
await page.waitForSelector('.adm-mcard, .adm-empty', { timeout: 5000 }).catch(() => {});
{ const d = [new URL(page.url()).pathname, await page.locator('.adm-drawer').count(), await page.locator('.adm-mcard').count()]; ok('mobile: drawer navigates and closes', d[0] === '/admin/inventory' && d[1] === 0 && d[2] > 0); if (!(d[0] === '/admin/inventory' && d[1] === 0 && d[2] > 0)) console.log(d); }
await shot('m-inventory');
await page.locator('.adm-mcard button:has-text("تنظیم")').first().click(); await page.waitForSelector('.adm-modal');
ok('mobile: adjust is full-screen', (await page.locator('.adm-modal').evaluate(e => Math.round(e.getBoundingClientRect().width))) === 390); await shot('m-adjust');
await page.keyboard.press('Escape');
await go('/admin/orders'); ok('mobile: orders as cards', (await page.locator('.adm-mcard').count()) === 5); await shot('m-orders');
await page.locator('.adm-mcard').first().click(); await page.waitForURL(/\/admin\/orders\/\d+$/); await page.waitForLoadState('networkidle');
ok('mobile: order detail full-width actions incl. «تماس با مشتری»', (await page.locator('.adm-mactions a:has-text("تماس با مشتری")').evaluate(e => Math.round(e.getBoundingClientRect().width))) === 358); await shot('m-order-detail');
await go('/admin/products', 'm-products'); ok('mobile: products as cards (Figma gap: adapted)', (await page.locator('.adm-mcard').count()) === 10);
await go('/admin/products/1', 'm-product-edit');
await page.click('button[aria-label="خروج"]').catch(() => {});
await page.setViewportSize({ width: 1440, height: 900 });

// Shop smoke (unchanged storefront)
await go('/'); ok('shop: home renders, no admin banner', !(await page.locator('.adm-demo').count()) && (await page.locator('header').count()) >= 1);
await go('/women'); ok('shop: draft products hidden from listing', !(await text()).includes('فقط پنل') && (await page.request.get(BASE + '/api/products/admin-demo-draft-1')).status() === 404);
ok('no JS errors', errors.length === 0); if (errors.length) console.log(errors); console.log(`expected HTTP error responses from negative checks: ${httpErr.length}`);
await b.close();
const f = results.filter(r => !r[1]); console.log(`\n${results.length - f.length}/${results.length} passed`); process.exit(f.length ? 1 : 0);
