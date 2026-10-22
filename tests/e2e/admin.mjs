// admin-demo UI e2e + desktop screenshots. Usage: BASE=http://127.0.0.1:4180 node tests/e2e/admin.mjs
// Needs the API with JOUMEH_ADMIN_DEMO=1. Screenshots → ../reports/shots/admin-demo-*.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:4180';
const OUT = new URL('../../../reports/shots/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
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

await go('/admin/products', 'products');
ok('products: list 10 rows, 43 total', (await page.locator('tbody tr').count()) === 10 && (await text()).includes('۴۳ محصول'));
await page.click('role=tab[name=/پیش‌نویس/]'); await page.waitForTimeout(300);
ok('products: draft tab filters', (await page.locator('tbody tr').count()) === 2);
await go('/admin/products/new'); await page.click('text=ذخیره پیش‌نویس'); await page.waitForTimeout(300);
ok('products: create validation errors', (await page.locator('.err').count()) >= 3); await shot('products-create-error');
const inputs = page.locator('.adm-card input.adm-input');
await inputs.nth(0).fill('مانتو آزمایشی'); await inputs.nth(1).fill('test-e2e'); await page.selectOption('.adm-card select >> nth=0', '1');
await page.locator('input[inputmode=numeric]').first().fill('990000'); await page.click('text=ذخیره پیش‌نویس'); await page.waitForURL(/\/admin\/products\/\d+$/); await page.waitForLoadState('networkidle');
ok('products: draft created', (await text()).includes('پیش‌نویس'));
await page.click('button:has-text("انتشار")'); await page.click('.adm-modal button:has-text("انتشار")'); await page.waitForTimeout(400);
ok('products: published', (await page.locator('.adm-head .adm-badge').innerText()).includes('منتشر شده'));
const shop = await (await page.request.get(BASE + '/api/products/test-e2e')).json(); ok('products: visible in shop after publish', shop.data?.name === 'مانتو آزمایشی');
await go('/admin/products/1', 'product-edit');
ok('products: edit shows variants + BD-10 stub', (await text()).includes('BD-10') && (await page.locator('tbody tr').count()) === 10);
await go('/admin/categories', 'categories'); ok('categories: list', (await page.locator('tbody tr').count()) >= 2);

await go('/admin/orders', 'orders'); ok('orders: list 10', (await page.locator('tbody tr').count()) === 10);
await page.fill('input[placeholder*="شماره سفارش"]', '10124'); await page.waitForTimeout(400); ok('orders: search', (await page.locator('tbody tr').count()) === 1);
await go('/admin/orders/10124', 'order-detail');
ok('orders: detail with BD stubs', (await text()).includes('BD-02') && (await text()).includes('BD-06'));
await page.click('button:has-text("ثبت ارسال")'); await page.click('.adm-modal button:has-text("تأیید")'); await page.waitForTimeout(400);
ok('orders: status → shipped', (await page.locator('.adm-badge', { hasText: 'ارسال شده' }).count()) >= 1);
await page.fill('textarea', 'یادداشت آزمایشی'); await page.click('button:has-text("ثبت یادداشت")'); await page.waitForTimeout(300); ok('orders: note added', (await text()).includes('یادداشت آزمایشی'));
await go('/admin/orders/10122'); await page.click('button:has-text("لغو سفارش")'); await page.click('.adm-modal button:has-text("لغو سفارش")'); await page.waitForTimeout(300);
ok('orders: cancel requires reason', (await page.locator('.adm-modal .err').count()) === 1); await shot('order-cancel-modal');
await page.fill('.adm-modal textarea', 'درخواست مشتری'); await page.click('.adm-modal button:has-text("لغو سفارش")'); await page.waitForTimeout(400);
ok('orders: cancelled', (await page.locator('.adm-head ~ div .adm-badge', { hasText: 'لغو شده' }).count()) === 1);

await go('/admin/customers', 'customers'); ok('customers: list 6', (await page.locator('tbody tr').count()) === 6);
await page.click('tbody tr >> nth=0'); await page.waitForLoadState('networkidle'); await shot('customer-profile'); ok('customers: profile', (await text()).includes('آدرس‌ها'));

await go('/admin/reviews', 'reviews');
ok('reviews: pending-design label', (await text()).includes('در انتظار طراحی'));
ok('reviews: 5 rows', (await page.locator('tbody tr').count()) === 5);
const hidden0 = await page.locator('tbody .adm-badge', { hasText: 'پنهان' }).count();
await page.locator('button:has-text("پنهان کردن")').first().click(); await page.waitForTimeout(400);
ok('reviews: hide', (await page.locator('tbody .adm-badge', { hasText: 'پنهان' }).count()) === hidden0 + 1);

await go('/admin/content', 'content'); ok('content: hero form + 3 sections', (await page.locator('.adm-sec').count()) === 3);
await page.click('role=tab[name="صفحات و قوانین"]'); await page.waitForTimeout(200); await shot('content-pages');
await page.click('tbody tr >> nth=0'); await page.waitForLoadState('networkidle');
await page.fill('textarea', 'متن آزمایشی ارسال'); await page.click('button:has-text("انتشار")'); await page.waitForTimeout(400); await shot('content-edit');
await go('/info/shipping'); ok('content: published page shows in shop', (await text()).includes('متن آزمایشی ارسال'));

await go('/admin/settings/users', 'settings-users'); ok('settings: 4 admin users + matrix', (await page.locator('tbody tr').count()) >= 4 + 6);
await page.click('button:has-text("دعوت کاربر")'); await page.click('.adm-modal button:has-text("ثبت دعوت")'); await page.waitForTimeout(300);
ok('settings: invite validation', (await page.locator('.adm-modal .err').count()) >= 2); await shot('settings-invite');
await page.keyboard.press('Escape');
await page.click('tbody tr >> nth=0 >> button:has-text("ویرایش")'); await page.uncheck('.adm-modal label:has-text("مدیر کل") input'); await page.click('.adm-modal button:has-text("ذخیره")'); await page.waitForTimeout(300);
ok('settings: last-owner protection', (await text()).includes('حداقل یک مدیر کل')); await page.keyboard.press('Escape');
await go('/admin/settings/audit', 'settings-audit'); ok('audit: entries logged', (await page.locator('tbody tr').count()) >= 6);

// Role check: catalog manager
await page.click('button[aria-label="خروج"]'); await page.waitForSelector('.adm-login');
await page.click('.adm-accts button:has-text("مسئول محصولات")'); await page.waitForSelector('.adm-side');
ok('roles: deep link to a forbidden page after login shows no-permission', (await text()).includes('به این بخش دسترسی ندارید'));
await go('/admin'); await page.waitForSelector('.adm-kpis');
ok('roles: catalog manager sees no Orders/Settings nav', !(await page.locator('.adm-side a', { hasText: 'سفارش‌ها' }).count()) && !(await page.locator('.adm-side a', { hasText: 'تنظیمات' }).count()));
await go('/admin/orders', 'no-permission'); ok('roles: no-permission state', (await text()).includes('به این بخش دسترسی ندارید'));

// Shop smoke (unchanged storefront)
await go('/'); ok('shop: home renders, no admin banner', !(await page.locator('.adm-demo').count()) && (await page.locator('header').count()) >= 1);
await go('/women'); ok('shop: draft products hidden from listing', !(await text()).includes('(داده نمونه) draft'));
ok('no JS errors', errors.length === 0); if (errors.length) console.log(errors); console.log(`expected HTTP error responses from negative checks: ${httpErr.length}`);
await b.close();
const f = results.filter(r => !r[1]); console.log(`\n${results.length - f.length}/${results.length} passed`); process.exit(f.length ? 1 : 0);
