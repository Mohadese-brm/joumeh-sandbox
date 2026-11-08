import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createDb, type Db } from '../server/db';
import { createApp } from '../server/app';
import { CATALOG, type CatalogProduct } from '../db/catalog';
import { NEW_PRODUCTS } from '../db/catalog-release';
import { seedCategories, seedCatalog } from '../db/seed';
import { formatPrice, PRICE_ON_REQUEST } from '../src/lib/format';

// The photo catalogue in db/catalog.ts still has no prices of its own. The 2026-11 release (db/catalog-release.ts)
// prices the shorts product and the men's products, adds the named pieces, and unpublishes the rest.
describe('real catalogue seed', () => {
  it('keeps the original photo catalogue unpriced in the source file, and stores the release on top', async () => {
    const db = await createDb();
    expect(CATALOG.length).toBe(41);
    expect(CATALOG.every(p => p.price === null && p.salePrice === null && p.stock === null && p.sizes.length === 0)).toBe(true);
    expect((await db.all<{ n: number }>('SELECT COUNT(*) n FROM products'))[0].n).toBe(CATALOG.length + NEW_PRODUCTS.length);
    expect(await db.all('SELECT id FROM products WHERE is_sample=1')).toHaveLength(0);
  });
  it('every catalogue photo and every release photo + thumb exists in public/', () => {
    for (const p of CATALOG) {
      expect(p.images.length).toBeGreaterThan(0);
      for (const im of p.images) {
        expect(existsSync(join(process.cwd(), 'public', im.url))).toBe(true);
        expect(existsSync(join(process.cwd(), 'public', im.thumb))).toBe(true);
      }
    }
    for (const p of NEW_PRODUCTS) for (const im of p.images) {
      expect(existsSync(join(process.cwd(), 'public/img/products', im.file))).toBe(true);
      expect(existsSync(join(process.cwd(), 'public/img/products/thumb', im.file))).toBe(true);
    }
    expect(existsSync(join(process.cwd(), 'public/img/size-guide.webp'))).toBe(true);
  });
});

describe('API after the catalogue release', () => {
  const mk = async () => createApp(await createDb(), { demoOtp: false });
  it('lists, sorts and filters without crashing; price is null', async () => {
    const app = await mk();
    for (const sort of ['newest', 'bestseller', 'price-asc', 'price-desc']) {
      const r = await request(app).get(`/api/products?category=women&sort=${sort}`);
      expect(r.status).toBe(200); expect(r.body.total).toBe(12);
      expect(r.body.data[0].price).toBeGreaterThan(0); expect(r.body.sampleData).toBe(false);
      expect(r.body.data[0].imageThumb).toMatch(/^\/img\/products\/thumb\/.+\.webp$/);
    }
    expect((await request(app).get('/api/products?category=women&sort=bogus')).status).toBe(400);
    expect((await request(app).get('/api/products?category=men')).body.total).toBe(5);
    const f = await request(app).get('/api/products?category=women&minPrice=100&maxPrice=999999999');
    expect(f.status).toBe(200);
    const fl = await request(app).get('/api/filters?category=women'); expect(fl.status).toBe(200);
  });
  it('product page and search return price null', async () => {
    const app = await mk();
    const p = await request(app).get('/api/products/p08'); expect(p.status).toBe(200);
    expect(p.body.data.price).toBe(1_390_000); expect(p.body.data.images.length).toBe(17);
    expect(p.body.data.images[0].thumb).toContain('/img/products/thumb/');
    expect((await request(app).get('/api/search?q=' + encodeURIComponent('یزد'))).status).toBe(200);
  });
  it('refuses to add an unpriced product to the cart (409 price_on_request) and never totals it', async () => {
    const db = await createDb(false); await seedCategories(db);
    const fake: CatalogProduct = { ...CATALOG[0], sizes: ['M'], colours: [], price: null } as CatalogProduct;
    await seedCatalog(db, [fake]);
    const app = createApp(db, { demoOtp: false });
    const v = (await request(app).get('/api/products/p01')).body.data.variants[0];
    const r = await request(app).post('/api/cart/items').send({ variantId: v.id });
    expect(r.status).toBe(409); expect(r.body.error).toBe('price_on_request');
    // even if one slipped into a cart, it is unavailable and excluded from totals
    await db.run('INSERT INTO carts DEFAULT VALUES'); await db.run('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (1, ?, 2)', [v.id]);
    const c = (await request(app).get('/api/cart/1')).body.data;
    expect(c.items[0].available).toBe(false); expect(c.items[0].lineTotal).toBeNull(); expect(c.totals.payable).toBe(0);
  });
  it('health reports real catalogue, and an unpublished sample row does not flip the flag', async () => {
    const db = await createDb();
    await db.run(`INSERT INTO products (slug,name,category_id,status,description,sort_rank,is_sample,publish_state) VALUES ('hidden-sample','نمونه پنهان',1,'default','',999,1,'unpublished')`);
    const body = (await request(createApp(db)).get('/api/health')).body;
    expect(body).toMatchObject({ ok: true, sampleData: false, sampleOverlay: false, ordersBlocked: false, catalog: 'real catalogue' });
  });
});

describe('formatPrice(null)', () => {
  it('shows «قیمت به‌زودی / تماس بگیرید»', () => {
    expect(formatPrice(null)).toBe(PRICE_ON_REQUEST); expect(formatPrice(undefined)).toBe('قیمت به‌زودی / تماس بگیرید');
  });
});
