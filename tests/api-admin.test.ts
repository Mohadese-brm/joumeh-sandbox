// admin-demo API tests (branch admin-demo). DEMO data only.
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb } from '../server/db';
import { createApp } from '../server/app';
import type { Database } from 'sql.js';

let db: Database; let app: ReturnType<typeof createApp>; let clock = 1_800_000_000_000;
beforeEach(async () => { db = await createDb(); clock = 1_800_000_000_000; app = createApp(db, { now: () => clock, adminDemo: true }); });
const OWNER = '09120000001', STAFF = '09130000002', CATALOG = '09170000004', INVITED = '09150000003';
async function login(phone = OWNER) { const r = await request(app).post('/api/admin/auth/demo-login').send({ phone }); return r.body.data?.token as string; }
const h = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('admin auth (demo, no SMS)', () => {
  it('demo login is 404 when adminDemo is off (Vercel default)', async () => {
    const off = createApp(await createDb(), { adminDemo: false });
    expect((await request(off).post('/api/admin/auth/demo-login').send({ phone: OWNER })).status).toBe(404);
    expect((await request(off).get('/api/admin/demo-accounts')).status).toBe(404);
  });
  it('active admin signs in; unknown / invited numbers get no_admin_access', async () => {
    const t = await login(); expect(t).toMatch(/^[0-9a-f]{48}$/);
    const me = await request(app).get('/api/admin/me').set(h(t));
    expect(me.body.data.roles).toEqual(['owner', 'finance']); expect(me.body.demo).toBe(true);
    for (const phone of ['09123456789', INVITED]) { const r = await request(app).post('/api/admin/auth/demo-login').send({ phone }); expect(r.status).toBe(403); expect(r.body.error).toBe('no_admin_access'); }
    expect((await request(app).post('/api/admin/auth/demo-login').send({ phone: '123' })).status).toBe(400);
  });
  it('customer tokens never work on admin endpoints; logout and idle timeout end the session', async () => {
    expect((await request(app).get('/api/admin/dashboard')).status).toBe(401);
    const t = await login();
    expect((await request(app).post('/api/admin/auth/logout').set(h(t))).status).toBe(204);
    expect((await request(app).get('/api/admin/me').set(h(t))).status).toBe(401);
    const t2 = await login(); clock += 61 * 60_000;
    const r = await request(app).get('/api/admin/me').set(h(t2)); expect(r.status).toBe(401); expect(r.body.error).toBe('session_expired');
  });
  it('role permissions: catalog manager cannot see orders or settings', async () => {
    const t = await login(CATALOG);
    expect((await request(app).get('/api/admin/products').set(h(t))).status).toBe(200);
    expect((await request(app).get('/api/admin/orders').set(h(t))).status).toBe(403);
    expect((await request(app).get('/api/admin/users').set(h(t))).status).toBe(403);
    const s = await login(STAFF); // orders+inventory+support: products view only
    expect((await request(app).post('/api/admin/products/1/state').set(h(s)).send({ state: 'archived' })).status).toBe(403);
  });
});

describe('dashboard', () => {
  it('returns sample KPIs and recent orders', async () => {
    const r = await request(app).get('/api/admin/dashboard').set(h(await login()));
    expect(r.status).toBe(200); expect(r.body.sampleData).toBe(true);
    expect(r.body.data.recentOrders).toHaveLength(5); expect(r.body.data.ordersToday).toBeGreaterThan(0);
    expect(r.body.stubs.kpis.status).toBe('STUB');
  });
});

describe('products', () => {
  it('lists with search, state tabs and paging', async () => {
    const t = await login();
    const all = await request(app).get('/api/admin/products').set(h(t));
    expect(all.body.allCount).toBe(43); expect(all.body.data).toHaveLength(10); expect(all.body.counts.draft).toBe(2);
    const q = await request(app).get('/api/admin/products?q=' + encodeURIComponent('کیمونو')).set(h(t));
    expect(q.body.data.every((p: { name: string }) => p.name.includes('کیمونو'))).toBe(true);
    expect((await request(app).get('/api/admin/products?state=draft').set(h(t))).body.total).toBe(2);
  });
  it('creates a draft (hidden from shop), validates, publishes, then archives', async () => {
    const t = await login();
    const badR = await request(app).post('/api/admin/products').set(h(t)).send({ name: '', slug: 'X Y', price: 0, categoryId: 9, status: 'x' });
    expect(badR.status).toBe(400); expect(Object.keys(badR.body.fields)).toEqual(expect.arrayContaining(['name', 'slug', 'price', 'categoryId', 'status']));
    const dup = await request(app).post('/api/admin/products').set(h(t)).send({ name: 'n', slug: 'women-1', price: 1000, categoryId: 1, status: 'default' });
    expect(dup.body.fields.slug).toBeTruthy();
    const c = await request(app).post('/api/admin/products').set(h(t)).send({ name: 'مانتو تست', slug: 'test-manto', price: 990000, originalPrice: 1200000, categoryId: 1, status: 'sale' });
    expect(c.status).toBe(201); expect(c.body.data.publishState).toBe('draft');
    expect((await request(app).get('/api/products/test-manto')).status).toBe(404);
    await request(app).post(`/api/admin/products/${c.body.data.id}/state`).set(h(t)).send({ state: 'published' });
    expect((await request(app).get('/api/products/test-manto')).status).toBe(200);
    await request(app).post(`/api/admin/products/${c.body.data.id}/state`).set(h(t)).send({ state: 'archived' });
    expect((await request(app).get('/api/products/test-manto')).status).toBe(404);
    expect((await request(app).get('/api/admin/audit').set(h(t))).body.data.map((a: { action: string }) => a.action)).toEqual(expect.arrayContaining(['create', 'state:published', 'state:archived']));
  });
  it('edits price and variant availability; the shop reflects it', async () => {
    const t = await login(); const d = (await request(app).get('/api/admin/products/2').set(h(t))).body.data;
    const v = d.variants[0];
    const r = await request(app).put('/api/admin/products/2').set(h(t)).send({ ...d, price: 1111000, originalPrice: null, variants: [{ id: v.id, available: false }] });
    expect(r.status).toBe(200);
    const shop = (await request(app).get(`/api/products/${d.slug}`)).body.data;
    expect(shop.price).toBe(1111000); expect(shop.variants.find((x: { id: number }) => x.id === v.id).available).toBe(0);
    expect((await request(app).put('/api/admin/products/2').set(h(t)).send({ ...d, originalPrice: 5 })).body.fields.originalPrice).toBeTruthy();
  });
  it('categories: create and rename', async () => {
    const t = await login();
    const c = await request(app).post('/api/admin/categories').set(h(t)).send({ name: 'بچگانه', slug: 'kids' }); expect(c.status).toBe(201);
    expect((await request(app).put(`/api/admin/categories/${c.body.data.id}`).set(h(t)).send({ name: 'کودک' })).body.data.name).toBe('کودک');
    expect((await request(app).post('/api/admin/categories').set(h(t)).send({ name: 'x', slug: 'women' })).status).toBe(400);
  });
});

describe('orders', () => {
  it('lists, filters by status and searches by number', async () => {
    const t = await login(); const r = await request(app).get('/api/admin/orders').set(h(t));
    expect(r.body.data.length).toBe(10);
    expect((await request(app).get('/api/admin/orders?status=processing').set(h(t))).body.data.every((o: { orderStatus: string }) => o.orderStatus === 'processing')).toBe(true);
    expect((await request(app).get('/api/admin/orders?q=10124').set(h(t))).body.data[0].orderNumber).toBe('10124');
  });
  it('allowed transitions only; cancel needs a reason; notes + timeline', async () => {
    const t = await login();
    const bad = await request(app).post('/api/admin/orders/10124/status').set(h(t)).send({ status: 'delivered' });
    expect(bad.status).toBe(409); expect(bad.body.allowed).toEqual(['shipped', 'cancelled']);
    expect((await request(app).post('/api/admin/orders/10124/status').set(h(t)).send({ status: 'cancelled' })).status).toBe(400);
    const ok = await request(app).post('/api/admin/orders/10124/status').set(h(t)).send({ status: 'shipped' });
    expect(ok.body.data.orderStatus).toBe('shipped'); expect(ok.body.data.fulfilmentStatus).toBe('shipped');
    expect(ok.body.data.events.at(-1).status).toBe('shipped');
    const n = await request(app).post('/api/admin/orders/10124/notes').set(h(t)).send({ body: 'تماس با مشتری' });
    expect(n.status).toBe(201); expect(n.body.data.notes[0].body).toBe('تماس با مشتری');
    const c = await request(app).post('/api/admin/orders/10122/status').set(h(t)).send({ status: 'cancelled', reason: 'درخواست مشتری' });
    expect(c.body.data.orderStatus).toBe('cancelled'); expect(c.body.stubs.refund.status).toBe('STUB');
  });
  it('customer view of the order updates after the admin change', async () => {
    const t = await login(); await request(app).post('/api/admin/orders/10124/status').set(h(t)).send({ status: 'shipped' });
    const o = (await request(app).get('/api/admin/orders/10124').set(h(t))).body.data; expect(o.allowed).toEqual(['delivered']);
  });
});

describe('customers', () => {
  it('lists customers with order counts and shows a profile', async () => {
    const t = await login(); const r = await request(app).get('/api/admin/customers').set(h(t));
    expect(r.body.data.length).toBe(6); const sara = r.body.data.find((u: { phone: string }) => u.phone === '09123456789'); expect(sara.orders).toBe(5);
    const p = await request(app).get(`/api/admin/customers/${sara.id}`).set(h(t)); expect(p.body.data.addresses).toHaveLength(2);
    expect((await request(app).get('/api/admin/customers?q=نگار').set(h(t))).body.data).toHaveLength(1);
  });
});

describe('reviews (pending design)', () => {
  it('hide removes a review from the shop, unhide restores it, delete removes it', async () => {
    const t = await login(); const r = await request(app).get('/api/admin/reviews').set(h(t));
    expect(r.body.pendingDesign).toBe(true); expect(r.body.data).toHaveLength(5);
    const target = r.body.data.find((x: { status: string; slug: string }) => x.status === 'published' && x.slug === 'women-1');
    const before = (await request(app).get('/api/products/women-1/reviews')).body.data.count;
    await request(app).post(`/api/admin/reviews/${target.id}/status`).set(h(t)).send({ status: 'rejected' });
    expect((await request(app).get('/api/products/women-1/reviews')).body.data.count).toBe(before - 1);
    await request(app).post(`/api/admin/reviews/${target.id}/status`).set(h(t)).send({ status: 'published' });
    expect((await request(app).get('/api/products/women-1/reviews')).body.data.count).toBe(before);
    expect((await request(app).delete(`/api/admin/reviews/${target.id}`).set(h(t))).status).toBe(204);
    expect((await request(app).get('/api/products/women-1/reviews')).body.data.count).toBe(before - 1);
    expect((await request(app).get('/api/admin/reviews?rating=5').set(h(t))).body.data.every((x: { rating: number }) => x.rating === 5)).toBe(true);
  });
});

describe('content', () => {
  it('pages start unpublished (shop 404) and become public once published', async () => {
    const t = await login();
    expect((await request(app).get('/api/content/shipping')).status).toBe(404);
    const r = await request(app).put('/api/admin/content/pages/shipping').set(h(t)).send({ title: 'ارسال', body: 'متن آزمایشی', published: true });
    expect(r.body.data.published).toBe(1);
    expect((await request(app).get('/api/content/shipping')).body.data.body).toBe('متن آزمایشی');
    expect((await request(app).put('/api/admin/content/pages/shipping').set(h(t)).send({ title: '', body: '' })).status).toBe(400);
  });
  it('homepage hero + sections save with validation', async () => {
    const t = await login(); const c = (await request(app).get('/api/admin/content').set(h(t))).body.data;
    expect(c.home.sections).toHaveLength(3);
    expect((await request(app).put('/api/admin/content/home').set(h(t)).send({ ...c.home, heroLink: 'http://x' })).status).toBe(400);
    expect((await request(app).put('/api/admin/content/home').set(h(t)).send({ ...c.home, heroTitle: 'تازه' })).status).toBe(200);
    expect((await request(app).get('/api/admin/content').set(h(t))).body.data.home.heroTitle).toBe('تازه');
  });
});

describe('settings: admin users & roles', () => {
  it('invites, activates, deactivates (sessions dropped) and protects the last Owner', async () => {
    const t = await login();
    const inv = await request(app).post('/api/admin/users').set(h(t)).send({ phone: '09190000009', name: 'تست', roles: ['support', 'bogus'] });
    expect(inv.status).toBe(201);
    expect((await request(app).post('/api/admin/users').set(h(t)).send({ phone: '09190000009', name: 'x', roles: ['support'] })).status).toBe(400);
    const list = (await request(app).get('/api/admin/users').set(h(t))).body.data; const u = list.find((x: { phone: string }) => x.phone === '09190000009');
    expect(u.roles).toEqual(['support']); expect(u.status).toBe('invited');
    await request(app).put(`/api/admin/users/${u.id}`).set(h(t)).send({ status: 'active' });
    const ut = await login('09190000009'); expect(ut).toBeTruthy();
    await request(app).put(`/api/admin/users/${u.id}`).set(h(t)).send({ status: 'inactive' });
    expect((await request(app).get('/api/admin/me').set(h(ut))).status).toBe(401);
    const owner = list.find((x: { phone: string }) => x.phone === OWNER);
    const last = await request(app).put(`/api/admin/users/${owner.id}`).set(h(t)).send({ roles: ['finance'] });
    expect(last.status).toBe(409); expect(last.body.error).toBe('last_owner');
  });
});

describe('r2 additions', () => {
  it('sub-categories (one level), customer notes, sidebar open-order count, cancel reasons list', async () => {
    const t = await login();
    const sub = await request(app).post('/api/admin/categories').set(h(t)).send({ name: 'مانتو', slug: 'women-manto', parentId: 1 }); expect(sub.status).toBe(201);
    expect((await request(app).post('/api/admin/categories').set(h(t)).send({ name: 'x', slug: 'deep', parentId: sub.body.data.id })).status).toBe(400);
    const list = (await request(app).get('/api/admin/categories').set(h(t))).body.data;
    expect(list.map((c: { slug: string }) => c.slug).slice(0, 2)).toEqual(['women', 'women-manto']); expect(list[1].parentName).toBe('زنانه');
    const n = await request(app).post('/api/admin/customers/1/notes').set(h(t)).send({ body: 'یادداشت مشتری' }); expect(n.status).toBe(201); expect(n.body.data[0].body).toBe('یادداشت مشتری');
    expect((await request(app).get('/api/admin/customers/1').set(h(t))).body.data.notes).toHaveLength(1);
    expect((await request(app).get('/api/admin/me').set(h(t))).body.counts.openOrders).toBe(3);
    expect((await request(app).get('/api/admin/orders/10124').set(h(t))).body.cancelReasons[0]).toBe('درخواست مشتری');
  });
});
