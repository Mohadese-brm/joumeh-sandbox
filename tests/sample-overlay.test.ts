// gerdoo-update-2026-10-28: non-destructive sample overlay for the live store (server/sample-overlay.ts). Real catalogue = no prices.
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb, type Db } from '../server/db';
import { createApp } from '../server/app';

let db: Db; let app: ReturnType<typeof createApp>;
const count = async (t: string) => (await db.one<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`))!.n;
beforeEach(async () => { db = await createDb(); app = createApp(db, { demoOtp: true, sampleOverlay: true }); });
const login = async () => { const phone = '09125550000'; const r = await request(app).post('/api/auth/otp/request').send({ phone });
  return (await request(app).post('/api/auth/otp/verify').send({ phone, code: r.body.data.devCode })).body.data.token as string; };

describe('sample overlay (JOUMEH_SAMPLE_OVERLAY=1)', () => {
  it('is OFF by default: the bare catalogue, health says no sample data', async () => {
    const off = createApp(await createDb());
    const h = (await request(off).get('/api/health')).body; expect(h).toMatchObject({ sampleData: false, sampleOverlay: false, ordersBlocked: false });
    const p = (await request(off).get('/api/products?category=women')).body.data; expect(p.every((x: { price: null }) => x.price === null)).toBe(true);
  });
  it('layers labelled sample prices / sizes / reviews over unpriced products WITHOUT writing the catalogue', async () => {
    const before = { prices: await count('prices'), variants: await count('variants'), products: await count('products'), reviews: await count('reviews') };
    expect(before.prices).toBe(0);
    const h = (await request(app).get('/api/health')).body; expect(h).toMatchObject({ sampleData: true, sampleOverlay: true, ordersBlocked: true }); expect(h.notice).toContain('نمونه');
    const list = (await request(app).get('/api/products?category=women')).body;
    expect(list.data.every((x: { price: number; sampleOverlay: number; isSample: number }) => x.price > 0 && x.sampleOverlay === 1 && x.isSample === 1)).toBe(true);
    expect(list.sampleData).toBe(true);
    const asc = (await request(app).get('/api/products?category=women&sort=price-asc')).body.data.map((x: { price: number }) => x.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const slug = list.data[0].slug as string;
    const d = (await request(app).get(`/api/products/${slug}`)).body.data;
    expect(d.variants.length).toBeGreaterThan(0); expect(d.variants.every((v: { id: number }) => v.id < 0)).toBe(true);
    expect(d.variants.find((v: { size: string }) => v.size === 'XXL').available).toBe(0);
    expect(d.rating).toMatchObject({ average: 4.2, count: 128, sample: true }); expect(d.description).toContain('نمونه');
    const rv = (await request(app).get(`/api/products/${slug}/reviews`)).body;
    if (rv.data) expect(JSON.stringify(rv.data)).toContain('(نمونه)');
    expect((await request(app).get('/api/search?q=' + encodeURIComponent(list.data[0].name.split(' ')[0]))).body.data[0].price).toBeGreaterThan(0);
    // sample cart line: in memory only
    const vid = d.variants.find((v: { size: string; available: number }) => v.size === 'M').id;
    const c = await request(app).post('/api/cart/items').send({ variantId: vid, quantity: 2 });
    expect(c.status).toBe(201); expect(c.body.data.items[0]).toMatchObject({ sample: true, quantity: 2 }); expect(c.body.data.totals.payable).toBe(d.price * 2);
    expect(c.body.data.ordersBlocked).toBe(true);
    const cid = c.body.data.cartId;
    expect((await request(app).patch(`/api/cart/${cid}/items/${vid}`).send({ quantity: 3 })).body.data.totals.count).toBe(3);
    expect((await request(app).post('/api/cart/items').send({ variantId: d.variants.find((v: { size: string }) => v.size === 'XXL').id })).status).toBe(409);
    expect({ prices: await count('prices'), variants: await count('variants'), products: await count('products'), reviews: await count('reviews') }).toEqual(before);
    expect(await count('cart_items')).toBe(0);
    // checkout refused while sample mode is on
    const token = await login();
    const address = { recipient: 'تست', phone: '09129999999', province: 'یزد', city: 'یزد', line: 'نمونه', postalCode: '1234567890' };
    const o = await request(app).post('/api/orders').set({ Authorization: `Bearer ${token}` }).send({ cartId: cid, address, shippingMethodId: 'sample-post' });
    expect(o.status).toBe(409); expect(o.body.error).toBe('sample_mode'); expect(await count('orders')).toBe(0);
    expect((await request(app).delete(`/api/cart/${cid}/items/${vid}`)).body.data.items).toHaveLength(0);
  });
  it('a real price saved in the admin takes the product out of the overlay (real data wins)', async () => {
    const slug = (await db.one<{ slug: string; id: number }>('SELECT slug, id FROM products WHERE id=1'))!.slug;
    await db.run('INSERT INTO prices (product_id, amount) VALUES (1, 1234000)');
    const d = (await request(app).get(`/api/products/${slug}`)).body.data;
    expect(d).toMatchObject({ price: 1234000, sampleOverlay: 0 }); expect(d.variants).toEqual([]); expect(d.rating.sample).toBe(false);
  });
});
