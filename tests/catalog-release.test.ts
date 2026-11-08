import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createDb, migrate } from '../server/db';
import { createApp } from '../server/app';
import { seedCategories, seedCatalog } from '../db/seed';
import { CATALOG } from '../db/catalog';
import { applyCatalogRelease, existingPriceTargets, NEW_PRODUCTS, NARENJ_SLUG, RELEASE_ID, SHORTS_PRICE, MENS_PRICE, unpublishedExisting } from '../db/catalog-release';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { STORE_ADDRESS, STORE_HOURS, STORE_PHONE_DISPLAY, STORE_PHONE_TEL, VAT_INCLUDED } from '../src/content/store';

describe('catalog release 2026-11', () => {
  it('prices only the listed products, keeps نارنج visible and out of stock, unpublishes the rest, deletes nothing', async () => {
    const db = await createDb();
    const app = createApp(db, { demoOtp: true });
    expect(existingPriceTargets().filter(p => p.kind === 'shorts').map(p => p.slug)).toEqual(['p08']);
    expect(existingPriceTargets().filter(p => p.kind === 'men')).toHaveLength(5);
    expect(unpublishedExisting()).toHaveLength(CATALOG.length - 6);

    const hidden = await db.all<{ slug: string; name: string }>('SELECT slug, name FROM products WHERE publish_state=?', ['unpublished']);
    expect(hidden.map(p => p.slug).sort()).toEqual(unpublishedExisting().map(p => p.slug).sort());
    expect(await db.all('SELECT id FROM products WHERE publish_state=? AND slug=?', ['unpublished', NARENJ_SLUG])).toHaveLength(0);

    const shorts = (await request(app).get('/api/products/p08')).body.data;
    expect(shorts.price).toBe(SHORTS_PRICE);
    expect(shorts.variants.map((v: { size: string }) => v.size)).toEqual(['S', 'M', 'L', 'XL']);
    const men = (await request(app).get('/api/products?category=men')).body;
    expect(men.total).toBe(5);
    expect(men.data.every((p: { price: number }) => p.price === MENS_PRICE)).toBe(true);

    const gelareh = (await request(app).get('/api/products/gelareh')).body.data;
    expect(gelareh).toMatchObject({ name: 'پیراهن بلند «گلاره»', price: 3_790_000 });
    expect(gelareh.images).toHaveLength(2);
    expect(gelareh.variants.filter((v: { color: string }) => v.color === 'صورتی')).toHaveLength(4);
    expect(gelareh.variants.filter((v: { color: string }) => v.color === 'شیری')).toHaveLength(4);
    expect((await request(app).get('/api/products/mahtab')).body.data.price).toBe(1_190_000);

    const narenj = (await request(app).get('/api/products/narenj')).body.data;
    expect(narenj).toMatchObject({ name: 'تاپ «نارنج»', price: null, soldOut: 1 });
    expect(narenj.variants.every((v: { available: number }) => v.available === 0)).toBe(true);
    expect((await request(app).post('/api/cart/items').send({ variantId: narenj.variants[0].id })).body.error).toBe('variant_unavailable');
    const women = (await request(app).get('/api/products?category=women')).body;
    expect(women.data.some((p: { slug: string }) => p.slug === NARENJ_SLUG)).toBe(true);
    expect((await request(app).get('/api/products/p01')).status).toBe(404);

    // priced product can be ordered, and the payment step is the labelled placeholder
    const buy = (await request(app).get('/api/products/sarv')).body.data;
    expect(buy.price).toBe(2_190_000); expect(buy.images[0].url).toMatch(/^\/img\/products\/r-sarv\.webp$/);
    const vid = buy.variants.find((v: { size: string; available: number }) => v.size === 'M' && v.available).id;
    const phone = '09136727262';
    const code = (await request(app).post('/api/auth/otp/request').send({ phone })).body.data.devCode;
    const token = (await request(app).post('/api/auth/otp/verify').send({ phone, code })).body.data.token as string;
    const cart = await request(app).post('/api/cart/items').send({ variantId: vid, quantity: 1 });
    expect(cart.status).toBe(201); expect(cart.body.data.ordersBlocked).toBe(false);
    const address = { recipient: 'تست', phone, province: 'یزد', city: 'یزد', line: 'پاساژ ستاره', postalCode: '8911111111' };
    const order = await request(app).post('/api/orders').set({ Authorization: `Bearer ${token}` }).send({ cartId: cart.body.data.cartId, address, shippingMethodId: 'sample-post' });
    expect(order.status).toBe(201); expect(order.body.data.total).toBe(2_190_000); expect(order.body.data.paymentStatus).toBe('unpaid');
    expect(order.body.stubs.payment.code).toBe('BD-01');
    const pay = await request(app).post(`/api/orders/${order.body.data.id}/payment`).set({ Authorization: `Bearer ${token}` });
    expect(pay.body.stubs.payment.code).toBe('BD-01'); expect(String(pay.body.data.ref)).toMatch(/^MOCK-/);
    const done = await request(app).post('/api/payments/mock/complete').set({ Authorization: `Bearer ${token}` }).send({ ref: pay.body.data.ref, outcome: 'success' });
    expect(done.body.data.paymentStatus).toBe('paid');

    // نارنج stays ناموجود even if the sample overlay is switched on
    const over = createApp(db, { sampleOverlay: true });
    const o = (await request(over).get('/api/products/narenj')).body.data;
    expect(o.price).toBeNull(); expect(o.sampleOverlay).toBe(0); expect(o.soldOut).toBe(1);
  });

  it('is idempotent and does not clobber an admin price, name, or variant set', async () => {
    const db = await createDb();
    const productsBefore = (await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM products'))!.n;
    expect(await applyCatalogRelease(db)).toBe(false); // already recorded by seed
    await db.run('UPDATE prices SET amount=111 WHERE product_id=(SELECT id FROM products WHERE slug=?)', ['p35']);
    await db.run('UPDATE products SET name=? WHERE slug=?', ['نام ویرایش‌شده توسط مدیر', 'p35']);
    await db.run('DELETE FROM schema_migrations WHERE id=?', [RELEASE_ID]);
    expect(await applyCatalogRelease(db)).toBe(true);
    expect((await db.one<{ amount: number }>('SELECT amount FROM prices WHERE product_id=(SELECT id FROM products WHERE slug=?)', ['p35']))!.amount).toBe(111);
    expect((await db.one<{ name: string }>('SELECT name FROM products WHERE slug=?', ['p35']))!.name).toBe('نام ویرایش‌شده توسط مدیر');
    expect((await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM products'))!.n).toBe(productsBefore);
    expect(await db.all('SELECT slug FROM products WHERE slug=?', ['sarv'])).toHaveLength(1);
    expect(await applyCatalogRelease(db)).toBe(false);
  });

  it('applies through migrate() on a database that already has the original catalogue (the live path)', async () => {
    const db = await createDb(false);
    await seedCategories(db); await seedCatalog(db);
    expect(await db.all('SELECT product_id FROM prices')).toHaveLength(0);
    expect(await migrate(db)).toEqual([]); // SQL migrations already applied; the release still runs
    expect((await db.one<{ amount: number }>('SELECT amount FROM prices pr JOIN products p ON p.id=pr.product_id WHERE p.slug=?', ['p08']))!.amount).toBe(SHORTS_PRICE);
    expect((await db.one<{ publish_state: string }>('SELECT publish_state FROM products WHERE slug=?', ['p01']))!.publish_state).toBe('unpublished');
    expect((await db.one<{ publish_state: string; name: string }>('SELECT publish_state, name FROM products WHERE slug=?', [NARENJ_SLUG]))).toMatchObject({ publish_state: 'published', name: 'تاپ «نارنج»' });
    expect(await migrate(db)).toEqual([]);
    expect((await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM products WHERE slug=?', ['sarv']))!.n).toBe(1);
  });

  it('store contact constants are the owner-supplied address and phone', () => {
    expect(STORE_ADDRESS).toBe('یزد، پاساژ ستاره، طبقه اول');
    expect(STORE_PHONE_DISPLAY).toBe('۰۹۱۳۶۷۲۷۲۶۲');
    expect(STORE_PHONE_TEL).toBe('09136727262');
    expect(STORE_HOURS).toBe('۹ صبح - ۱۷ عصر');
    expect(VAT_INCLUDED).toBe('قیمت‌ها با احتساب ۱۰٪ مالیات بر ارزش افزوده می‌باشد.');
    expect(NEW_PRODUCTS.find(p => p.slug === 'mahtab')!.price).toBe(1_190_000);
  });

  it('renames the five men only while they still have the placeholder name', async () => {
    const db = await createDb();
    const names = Object.fromEntries((await db.all<{ slug: string; name: string }>('SELECT slug, name FROM products WHERE slug IN (?,?,?,?,?) ORDER BY slug', ['p35', 'p36', 'p37', 'p38', 'p39'])).map(r => [r.slug, r.name]));
    expect(names).toEqual({ p35: 'پولوشرت مردانه «آرش»', p36: 'پولوشرت مردانه «کیان»', p37: 'پیراهن مردانه «رادین»', p38: 'پولوشرت مردانه «سامان»', p39: 'پیراهن مردانه «نیما»' });
    const sql = readFileSync(join(process.cwd(), 'db/migrations/0005_men_names.sql'), 'utf8');
    await db.run(`UPDATE products SET name=? WHERE slug=?`, ['استودیو – ۳۵', 'p35']);
    await db.run(`UPDATE products SET name=? WHERE slug=?`, ['نام ویرایش‌شده', 'p36']);
    await db.run(sql);
    expect((await db.one<{ name: string }>('SELECT name FROM products WHERE slug=?', ['p35']))!.name).toBe('پولوشرت مردانه «آرش»');
    expect((await db.one<{ name: string }>('SELECT name FROM products WHERE slug=?', ['p36']))!.name).toBe('نام ویرایش‌شده');
    await db.run(sql);
    expect((await db.one<{ name: string }>('SELECT name FROM products WHERE slug=?', ['p35']))!.name).toBe('پولوشرت مردانه «آرش»');
  });
});
