import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb, all } from '../server/db';
import { createApp } from '../server/app';
import { ConsoleSmsAdapter } from '../server/sms';
import type { Database } from 'sql.js';

let db: Database; let app: ReturnType<typeof createApp>; let sms: ConsoleSmsAdapter; let clock = 1_800_000_000_000;
beforeEach(async () => { db = await createDb(); sms = new ConsoleSmsAdapter(); clock = 1_800_000_000_000; app = createApp(db, { sms, now: () => clock }); });
async function login(phone = '09123456789') {
  const r = await request(app).post('/api/auth/otp/request').send({ phone });
  const v = await request(app).post('/api/auth/otp/verify').send({ phone, code: r.body.data.devCode });
  return { token: v.body.data.token as string, user: v.body.data.user };
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
const variant = async (slug: string, size = 'M') => (await request(app).get(`/api/products/${slug}`)).body.data.variants.find((v: { size: string }) => v.size === size).id as number;

describe('catalog', () => {
  it('lists 9 per page with total/totalPages and sample flag', async () => {
    const r = await request(app).get('/api/products?category=women');
    expect(r.status).toBe(200); expect(r.body.data).toHaveLength(9); expect(r.body.total).toBe(27); expect(r.body.totalPages).toBe(3); expect(r.body.sampleData).toBe(true);
    expect(r.body.stubs.stock.code).toBe('BD-16');
  });
  it('paginates without overlap', async () => {
    const a = (await request(app).get('/api/products?category=women&page=1')).body.data.map((p: { id: number }) => p.id);
    const b = (await request(app).get('/api/products?category=women&page=2')).body.data.map((p: { id: number }) => p.id);
    expect(a.filter((x: number) => b.includes(x))).toEqual([]);
  });
  it('sorts by price asc/desc and rejects unknown sort', async () => {
    const asc = (await request(app).get('/api/products?category=men&sort=price-asc')).body.data.map((p: { price: number }) => p.price);
    expect(asc).toEqual([...asc].sort((x, y) => x - y));
    const desc = (await request(app).get('/api/products?category=men&sort=price-desc')).body.data.map((p: { price: number }) => p.price);
    expect(desc).toEqual([...desc].sort((x, y) => y - x));
    expect((await request(app).get('/api/products?sort=drop')).status).toBe(400);
  });
  it('filters by sale, size and colour (Apply model sends all at once)', async () => {
    const s = await request(app).get('/api/products?category=women&sale=1');
    expect(s.body.data.every((p: { status: string }) => p.status === 'sale')).toBe(true); expect(s.body.total).toBeGreaterThan(0);
    const xxl = await request(app).get('/api/products?category=women&size=XXL'); expect(xxl.body.total).toBe(0); // XXL unavailable in sample
    const c = await request(app).get(`/api/products?category=women&color=${encodeURIComponent('مشکی')}`); expect(c.body.total).toBeGreaterThan(0); expect(c.body.total).toBeLessThan(27);
  });
  it('R-1: badge comes from data, default 20 for the decided sample', async () => {
    const p = (await request(app).get('/api/products/women-1')).body.data; expect(p.badgePercent).toBe(20);
  });
  it('product detail returns images, variants, related; 404 for unknown', async () => {
    const r = await request(app).get('/api/products/women-1');
    expect(r.body.data.images.length).toBeGreaterThan(1); expect(r.body.data.variants.length).toBe(10); expect(r.body.data.related).toHaveLength(4);
    expect((await request(app).get('/api/products/nope')).status).toBe(404);
  });
  it('search: min length, matches, cap', async () => {
    expect((await request(app).get('/api/search?q=ک')).body.data).toEqual([]);
    const r = await request(app).get(`/api/search?q=${encodeURIComponent('کتان')}`); expect(r.body.data.length).toBeGreaterThan(0); expect(r.body.data.length).toBeLessThanOrEqual(6);
    expect((await request(app).get(`/api/search?q=${'x'.repeat(65)}`)).status).toBe(400);
  });
  it('filters endpoint lists sizes and colours', async () => {
    const r = await request(app).get('/api/filters?category=women'); expect(r.body.data.sizes).toContain('M'); expect(r.body.data.colors.length).toBeGreaterThan(0);
  });
});

describe('cart', () => {
  it('add / merge / update / remove with totals and stubs', async () => {
    const v1 = await variant('women-1'); const v2 = await variant('women-4');
    let r = await request(app).post('/api/cart/items').send({ variantId: v1 }); expect(r.status).toBe(201);
    const cid = r.body.data.cartId;
    r = await request(app).post('/api/cart/items').send({ cartId: cid, variantId: v1, quantity: 2 }); expect(r.body.data.items[0].quantity).toBe(3);
    r = await request(app).post('/api/cart/items').send({ cartId: cid, variantId: v2 });
    expect(r.body.data.totals).toMatchObject({ count: 4, subtotal: 1850000 * 3 + 980000, discount: 370000 * 3, payable: 1480000 * 3 + 980000, shipping: null, vat: null });
    expect(r.body.data.stubs.shipping.code).toBe('BD-02'); expect(r.body.data.stubs.vat.code).toBe('BD-06');
    const item = r.body.data.items[0].id;
    r = await request(app).patch(`/api/cart/${cid}/items/${item}`).send({ quantity: 1 }); expect(r.body.data.totals.count).toBe(2);
    r = await request(app).delete(`/api/cart/${cid}/items/${item}`); expect(r.body.data.items).toHaveLength(1);
  });
  it('validates input and ownership', async () => {
    expect((await request(app).post('/api/cart/items').send({ variantId: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/cart/items').send({ variantId: 1, quantity: 100 })).status).toBe(400);
    expect((await request(app).post('/api/cart/items').send({ variantId: 999999 })).status).toBe(404);
    expect((await request(app).post('/api/cart/items').send({ variantId: 1, cartId: 9999 })).status).toBe(404);
    expect((await request(app).post('/api/cart/items').send({ variantId: await variant('women-1', 'XXL') })).status).toBe(409);
    expect((await request(app).get('/api/cart/9999')).status).toBe(404);
    expect((await request(app).patch('/api/cart/1/items/1').send({ quantity: 0 })).status).toBe(400);
  });
  it('rejects malformed JSON with 400', async () => {
    const r = await request(app).post('/api/cart/items').set('Content-Type', 'application/json').send('{bad'); expect(r.status).toBe(400); expect(r.body.error).toBe('invalid_json');
  });
});

describe('auth — e-mail OTP mock (BD-21 stub) and filters (round 1)', () => {
  it('e-mail sign-in works only for an existing account e-mail; 6-digit code', async () => {
    expect((await request(app).post('/api/auth/email/request').send({ email: 'nobody@example.com' })).status).toBe(404);
    expect((await request(app).post('/api/auth/email/request').send({ email: 'bad' })).status).toBe(400);
    const r = await request(app).post('/api/auth/email/request').send({ email: 'Sara@example.com' });
    expect(r.status).toBe(201); expect(r.body.data.devCode).toMatch(/^\d{6}$/); expect(r.body.stubs.emailOtp.code).toBe('BD-21');
    const v = await request(app).post('/api/auth/email/verify').send({ email: 'sara@example.com', code: r.body.data.devCode });
    expect(v.status).toBe(200); expect(v.body.data.user.phone).toBe('09123456789');
  });
  it('filters expose sample types + price bounds; type and price filters narrow results', async () => {
    const f = (await request(app).get('/api/filters?category=women')).body;
    expect(f.data.types).toContain('مانتو'); expect(f.data.price.min).toBeLessThan(f.data.price.max); expect(f.stubs.taxonomy.code).toBe('BD-18');
    const all = (await request(app).get('/api/products?category=women')).body.total;
    const t = (await request(app).get('/api/products?category=women&type=' + encodeURIComponent('مانتو'))).body;
    expect(t.total).toBeGreaterThan(0); expect(t.total).toBeLessThan(all); expect(t.data.every((p: { type: string }) => p.type === 'مانتو')).toBe(true);
    const pr = (await request(app).get('/api/products?category=women&minPrice=1000000&maxPrice=1500000')).body;
    expect(pr.total).toBeGreaterThan(0); expect(pr.data.every((p: { price: number }) => p.price >= 1000000 && p.price <= 1500000)).toBe(true);
  });
});

describe('signup (round 2, 107:773)', () => {
  it('new phone + names creates the account with names; existing names are never overwritten', async () => {
    const r = await request(app).post('/api/auth/otp/request').send({ phone: '09125555555' });
    const v = await request(app).post('/api/auth/otp/verify').send({ phone: '09125555555', code: r.body.data.devCode, firstName: ' نگار ', lastName: 'رضایی' });
    expect(v.status).toBe(200); expect(v.body.data.user.firstName).toBe('نگار'); expect(v.body.data.user.lastName).toBe('رضایی');
    const r2 = await request(app).post('/api/auth/otp/request').send({ phone: '09123456789' });
    const v2 = await request(app).post('/api/auth/otp/verify').send({ phone: '09123456789', code: r2.body.data.devCode, firstName: 'دیگر', lastName: 'نام' });
    expect(v2.body.data.user.firstName).toBe('سارا');
  });
});

describe('auth (mock SMS OTP)', () => {
  it('requests and verifies, accepts Persian digits, creates session', async () => {
    const r = await request(app).post('/api/auth/otp/request').send({ phone: '۰۹۱۲۰۰۰۰۰۰۰' });
    expect(r.status).toBe(201); expect(r.body.data.devCode).toMatch(/^\d{6}$/); expect(sms.sent).toHaveLength(1); expect(r.body.stubs.sms.code).toBe('BD-13');
    const v = await request(app).post('/api/auth/otp/verify').send({ phone: '09120000000', code: r.body.data.devCode });
    expect(v.status).toBe(200); const me = await request(app).get('/api/me').set(auth(v.body.data.token)); expect(me.body.data.phone).toBe('09120000000');
  });
  it('stores only hashes (no plain OTP or token in DB)', async () => {
    const r = await request(app).post('/api/auth/otp/request').send({ phone: '09120000000' });
    const rows = all<{ code_hash: string }>(db, 'SELECT code_hash FROM otp_requests'); expect(rows[0].code_hash).not.toContain(r.body.data.devCode); expect(rows[0].code_hash).toHaveLength(64);
  });
  it('rejects bad phone, wrong code, expired code, too many attempts, reuse', async () => {
    expect((await request(app).post('/api/auth/otp/request').send({ phone: '123' })).status).toBe(400);
    const r = await request(app).post('/api/auth/otp/request').send({ phone: '09120000000' }); const code = r.body.data.devCode as string;
    const wrong = code === '000000' ? '111111' : '000000';
    expect((await request(app).post('/api/auth/otp/verify').send({ phone: '09120000000', code: wrong })).body.error).toBe('wrong_code');
    for (let i = 0; i < 4; i++) await request(app).post('/api/auth/otp/verify').send({ phone: '09120000000', code: wrong });
    expect((await request(app).post('/api/auth/otp/verify').send({ phone: '09120000000', code })).status).toBe(429);
    const r2 = await request(app).post('/api/auth/otp/request').send({ phone: '09120000000' });
    clock += 121_000;
    expect((await request(app).post('/api/auth/otp/verify').send({ phone: '09120000000', code: r2.body.data.devCode })).status).toBe(410);
  });
  it('code cannot be reused', async () => {
    const r = await request(app).post('/api/auth/otp/request').send({ phone: '09120000000' });
    expect((await request(app).post('/api/auth/otp/verify').send({ phone: '09120000000', code: r.body.data.devCode })).status).toBe(200);
    expect((await request(app).post('/api/auth/otp/verify').send({ phone: '09120000000', code: r.body.data.devCode })).status).toBe(400);
  });
  it('rate-limits requests per window', async () => {
    for (let i = 0; i < 3; i++) expect((await request(app).post('/api/auth/otp/request').send({ phone: '09120000000' })).status).toBe(201);
    expect((await request(app).post('/api/auth/otp/request').send({ phone: '09120000000' })).status).toBe(429);
    clock += 601_000; expect((await request(app).post('/api/auth/otp/request').send({ phone: '09120000000' })).status).toBe(201);
  });
  it('protects private routes and logs out', async () => {
    for (const p of ['/api/me', '/api/orders', '/api/addresses', '/api/favorites', '/api/returns']) expect((await request(app).get(p)).status).toBe(401);
    const { token } = await login(); expect((await request(app).post('/api/auth/logout').set(auth(token))).status).toBe(204);
    expect((await request(app).get('/api/me').set(auth(token))).status).toBe(401);
  });
  it('updates profile with validation', async () => {
    const { token } = await login();
    expect((await request(app).patch('/api/me').set(auth(token)).send({ firstName: '', lastName: 'x', email: 'bad' })).body.fields).toMatchObject({ firstName: expect.any(String), email: expect.any(String) });
    const r = await request(app).patch('/api/me').set(auth(token)).send({ firstName: 'سارا', lastName: 'احمدی', email: 'new@example.com' });
    expect(r.body.data).toMatchObject({ firstName: 'سارا', email: 'new@example.com', emailVerified: 0 });
  });
});

describe('account data', () => {
  it('sample user sees seeded orders newest first, another user sees none and cannot read them', async () => {
    const { token } = await login(); const r = await request(app).get('/api/orders').set(auth(token));
    expect(r.body.data.map((o: { orderNumber: string }) => o.orderNumber)).toEqual(['10124', '10108', '10091', '10076', '10042']);
    expect(r.body.data[0]).toMatchObject({ orderStatus: 'processing', paymentStatus: 'paid', fulfilmentStatus: 'unfulfilled', shippingFee: null, vatAmount: null });
    const other = await login('09129999999');
    expect((await request(app).get('/api/orders').set(auth(other.token))).body.data).toEqual([]);
    expect((await request(app).get('/api/orders/10124').set(auth(other.token))).status).toBe(404);
    expect((await request(app).get('/api/returns/1').set(auth(other.token))).status).toBe(404);
  });
  it('addresses: create (first = default), validate, edit, set default, delete, ownership', async () => {
    const { token } = await login('09129999999');
    const bad = await request(app).post('/api/addresses').set(auth(token)).send({ recipient: '', phone: '1', postalCode: '12' });
    expect(bad.status).toBe(400); expect(Object.keys(bad.body.fields)).toEqual(expect.arrayContaining(['recipient', 'phone', 'province', 'city', 'line', 'postalCode']));
    const a = { recipient: 'تست', phone: '09129999999', province: 'یزد', city: 'یزد', line: 'خیابان نمونه', postalCode: '۱۲۳۴۵۶۷۸۹۰' };
    let r = await request(app).post('/api/addresses').set(auth(token)).send(a); expect(r.status).toBe(201); expect(r.body.data[0]).toMatchObject({ isDefault: 1, postalCode: '1234567890' });
    r = await request(app).post('/api/addresses').set(auth(token)).send({ ...a, city: 'میبد' }); const second = r.body.data.find((x: { city: string }) => x.city === 'میبد');
    expect(second.isDefault).toBe(0);
    r = await request(app).post(`/api/addresses/${second.id}/default`).set(auth(token)); expect(r.body.data[0].city).toBe('میبد');
    r = await request(app).put(`/api/addresses/${second.id}`).set(auth(token)).send({ ...a, city: 'اردکان' }); expect(r.body.data.some((x: { city: string }) => x.city === 'اردکان')).toBe(true);
    const sample = await login(); expect((await request(app).delete(`/api/addresses/${second.id}`).set(auth(sample.token))).status).toBe(404);
    r = await request(app).delete(`/api/addresses/${second.id}`).set(auth(token)); expect(r.body.data).toHaveLength(1);
  });
  it('favourites add/remove idempotently', async () => {
    const { token } = await login('09129999999');
    await request(app).put('/api/favorites/3').set(auth(token)); const r = await request(app).put('/api/favorites/3').set(auth(token)); expect(r.body.data).toHaveLength(1);
    expect((await request(app).put('/api/favorites/99999').set(auth(token))).status).toBe(404);
    expect((await request(app).delete('/api/favorites/3').set(auth(token))).body.data).toEqual([]);
  });
  it('returns list/detail are read-only with BD-04 stub', async () => {
    const { token } = await login(); const r = await request(app).get('/api/returns').set(auth(token));
    expect(r.body.data).toHaveLength(2); expect(r.body.stubs.returns.code).toBe('BD-04');
  });
});

describe('checkout + mock payment', () => {
  it('creates an order from the cart (no shipping/VAT values), empties cart, pays via MockProvider', async () => {
    const { token } = await login('09129999999');
    const c = await request(app).post('/api/cart/items').send({ variantId: await variant('women-1'), quantity: 2 }); const cartId = c.body.data.cartId;
    const address = { recipient: 'تست', phone: '09129999999', province: 'یزد', city: 'یزد', line: 'نمونه', postalCode: '1234567890' };
    expect((await request(app).post('/api/orders').send({ cartId, address, shippingMethodId: 'sample-post' })).status).toBe(401); // BD-07
    const bad = await request(app).post('/api/orders').set(auth(token)).send({ cartId, address: {}, shippingMethodId: 'x' }); expect(bad.body.fields.shippingMethodId).toBeTruthy();
    const o = await request(app).post('/api/orders').set(auth(token)).send({ cartId, address, shippingMethodId: 'sample-post' });
    expect(o.status).toBe(201); expect(o.body.data).toMatchObject({ orderStatus: 'pending', paymentStatus: 'unpaid', fulfilmentStatus: 'unfulfilled', shippingFee: null, vatAmount: null, total: 2960000, discount: 740000 });
    expect(o.body.data.orderNumber).toMatch(/^\d{5,}$/); expect(o.body.stubs.orderNumber.code).toBe('BD-11');
    expect((await request(app).get(`/api/cart/${cartId}`)).body.data.items).toEqual([]);
    expect((await request(app).post('/api/orders').set(auth(token)).send({ cartId, address, shippingMethodId: 'sample-post' })).status).toBe(409);
    const id = o.body.data.id;
    const f = await request(app).post(`/api/orders/${id}/payment`).set(auth(token)); expect(f.body.data.ref).toMatch(/^MOCK-/);
    expect((await request(app).post('/api/payments/mock/complete').set(auth(token)).send({ ref: f.body.data.ref, outcome: 'failure' })).body.data.paymentStatus).toBe('failed');
    const s = await request(app).post(`/api/orders/${id}/payment`).set(auth(token));
    expect((await request(app).post('/api/payments/mock/complete').set(auth(token)).send({ ref: s.body.data.ref, outcome: 'success' })).body.data.paymentStatus).toBe('paid');
    const after = await request(app).get(`/api/orders/${id}`).set(auth(token)); expect(after.body.data).toMatchObject({ paymentStatus: 'paid', orderStatus: 'processing' });
    expect((await request(app).post(`/api/orders/${id}/payment`).set(auth(token))).status).toBe(409);
    expect((await request(app).post('/api/payments/mock/complete').set(auth(token)).send({ ref: s.body.data.ref, outcome: 'success' })).status).toBe(404); // ref single-use
  });
  it('shipping methods are labelled samples with null fees', async () => {
    const r = await request(app).get('/api/shipping-methods'); expect(r.body.sampleData).toBe(true); expect(r.body.data.every((m: { fee: null }) => m.fee === null)).toBe(true);
  });
  it('unknown API path → 404 JSON', async () => { const r = await request(app).get('/api/nope'); expect(r.status).toBe(404); expect(r.body.error).toBe('not_found'); });
});
