import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createDb, type Db } from '../server/db';
import { createApp } from '../server/app';
import { CATALOG, type CatalogProduct } from '../db/catalog';
import { seedCategories, seedCatalog } from '../db/seed';
import { formatPrice, PRICE_ON_REQUEST } from '../src/lib/format';

// Real catalogue (branch catalog-real): placeholder names, NO prices/sizes/stock yet.
describe('real catalogue seed', () => {
  it('loads every CATALOG product, none flagged sample, no price rows, no variants', async () => {
    const db = await createDb();
    expect((await db.all<{ n: number }>('SELECT COUNT(*) n FROM products'))[0].n).toBe(CATALOG.length);
    expect(CATALOG.length).toBe(41);
    expect(await db.all('SELECT id FROM products WHERE is_sample=1')).toHaveLength(0);
    expect(await db.all('SELECT * FROM prices')).toHaveLength(0);
    expect(await db.all('SELECT * FROM variants')).toHaveLength(0);
    expect(CATALOG.every(p => p.price === null && p.salePrice === null && p.stock === null && p.sizes.length === 0)).toBe(true);
  });
  it('every product has ≥1 image and every image + thumb file exists in public/', () => {
    for (const p of CATALOG) {
      expect(p.images.length).toBeGreaterThan(0);
      for (const im of p.images) {
        expect(existsSync(join(process.cwd(), 'public', im.url))).toBe(true);
        expect(existsSync(join(process.cwd(), 'public', im.thumb))).toBe(true);
      }
    }
  });
});

describe('API with null prices', () => {
  const mk = async () => createApp(await createDb(), { demoOtp: false });
  it('lists, sorts and filters without crashing; price is null', async () => {
    const app = await mk();
    for (const sort of ['newest', 'bestseller', 'price-asc', 'price-desc']) {
      const r = await request(app).get(`/api/products?category=women&sort=${sort}`);
      expect(r.status).toBe(200); expect(r.body.total).toBe(36);
      expect(r.body.data[0].price).toBeNull(); expect(r.body.sampleData).toBe(false);
      expect(r.body.data[0].imageThumb).toMatch(/^\/img\/products\/thumb\/\d{3}\.webp$/);
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
    expect(p.body.data.price).toBeNull(); expect(p.body.data.images.length).toBe(17);
    expect(p.body.data.images[0].thumb).toContain('/img/products/thumb/');
    expect((await request(app).get('/api/search?q=' + encodeURIComponent('یزد'))).status).toBe(200);
  });
  it('refuses to add an unpriced product to the cart (409 price_on_request) and never totals it', async () => {
    const db = await createDb(false); seedCategories(db);
    const fake: CatalogProduct = { ...CATALOG[0], sizes: ['M'], colours: [], price: null } as CatalogProduct;
    seedCatalog(db, [fake]);
    const app = createApp(db, { demoOtp: false });
    const v = (await request(app).get('/api/products/p01')).body.data.variants[0];
    const r = await request(app).post('/api/cart/items').send({ variantId: v.id });
    expect(r.status).toBe(409); expect(r.body.error).toBe('price_on_request');
    // even if one slipped into a cart, it is unavailable and excluded from totals
    await db.run('INSERT INTO carts DEFAULT VALUES'); await db.run('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (1, ?, 2)', [v.id]);
    const c = (await request(app).get('/api/cart/1')).body.data;
    expect(c.items[0].available).toBe(false); expect(c.items[0].lineTotal).toBeNull(); expect(c.totals.payable).toBe(0);
  });
  it('health reports real catalogue', async () => {
    expect((await request(await mk()).get('/api/health')).body).toMatchObject({ ok: true, sampleData: false });
  });
});

describe('formatPrice(null)', () => {
  it('shows «قیمت به‌زودی / تماس بگیرید»', () => {
    expect(formatPrice(null)).toBe(PRICE_ON_REQUEST); expect(formatPrice(undefined)).toBe('قیمت به‌زودی / تماس بگیرید');
  });
});
