import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb } from '../server/db';
import { createApp } from '../server/app';
let app: ReturnType<typeof createApp>;
beforeEach(async () => { app = createApp(await createDb()); });
describe('API', () => {
  it('GET /api/products lists seeded sample products with stubs', async () => {
    const r = await request(app).get('/api/products');
    expect(r.status).toBe(200); expect(r.body.data).toHaveLength(3);
    expect(r.body.data[0]).toMatchObject({ name: 'مانتو کتان کویری', status: 'sale', price: 1480000, originalPrice: 1850000, badgePercent: 20, isSample: 1 });
    expect(r.body.stubs.shipping).toMatch(/BD-02/);
  });
  it('GET /api/products/:id returns product + variants', async () => {
    const r = await request(app).get('/api/products/1');
    expect(r.status).toBe(200); expect(r.body.data.variants[0].sku).toBe('SAMPLE-1-M');
  });
  it('GET /api/products/:id 404 / 400', async () => {
    expect((await request(app).get('/api/products/999')).status).toBe(404);
    expect((await request(app).get('/api/products/abc')).status).toBe(400);
  });
  it('POST /api/cart/items creates cart and merges quantity', async () => {
    const a = await request(app).post('/api/cart/items').send({ variantId: 1, quantity: 1 });
    expect(a.status).toBe(201);
    const b = await request(app).post('/api/cart/items').send({ cartId: a.body.data.cartId, variantId: 1, quantity: 2 });
    expect(b.body.data.items).toEqual([{ variantId: 1, quantity: 3 }]);
    expect(b.body.stubs.reservation).toMatch(/BD-08/);
  });
  it('POST /api/cart/items validates input', async () => {
    expect((await request(app).post('/api/cart/items').send({ variantId: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/cart/items').send({ variantId: 1, quantity: 0 })).status).toBe(400);
    expect((await request(app).post('/api/cart/items').send({ variantId: 999 })).status).toBe(404);
    expect((await request(app).post('/api/cart/items').send({ cartId: 999, variantId: 1 })).status).toBe(404);
  });
});
