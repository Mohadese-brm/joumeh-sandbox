// admin-demo API tests (branch admin-demo). DEMO data only.
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb, type Db } from '../server/db';
import { createApp } from '../server/app';
import { DEMO_ADMINS, demoPassword, createAdmin, ADMIN_COOKIE } from '../server/admin';
import { sampleSeed } from './fixtures/sample-seed';

let db: Db; let app: ReturnType<typeof createApp>; let clock = 1_800_000_000_000;
beforeEach(async () => { db = await createDb(sampleSeed); clock = 1_800_000_000_000; app = createApp(db, { now: () => clock, adminDemo: true }); });
const OWNER = DEMO_ADMINS[0].email, BUSINESS = DEMO_ADMINS[1].email;
const tokenOf = (r: { headers: Record<string, unknown> }) => {
  const c = ([] as string[]).concat((r.headers['set-cookie'] as string[] | undefined) ?? []).find(x => x.startsWith(ADMIN_COOKIE + '='));
  return c ? decodeURIComponent(c.split(';')[0].slice(ADMIN_COOKIE.length + 1)) : '';
};
async function login(email = OWNER, a = app) { return tokenOf(await request(a).post('/api/admin/auth/login').send({ email, password: demoPassword(email) })); }
const h = (t: string) => ({ Cookie: `${ADMIN_COOKIE}=${encodeURIComponent(t)}` });

describe('admin auth (v1: e-mail + password, two admins, full access)', () => {
  it('demo accounts are 404 when adminDemo is off (Vercel production) and no demo admin exists there', async () => {
    const off = createApp(await createDb(), { adminDemo: false });
    expect((await request(off).get('/api/admin/demo-accounts')).status).toBe(404);
    expect((await request(off).post('/api/admin/auth/login').send({ email: OWNER, password: demoPassword(OWNER) })).status).toBe(401);
    expect((await request(off).post('/api/admin/auth/demo-login').send({ phone: '09120000001' })).status).toBe(404); // old phone demo login is gone
  });
  it('preview lists exactly the two demo admins (Owner + business owner) with their per-deployment passwords', async () => {
    const r = await request(app).get('/api/admin/demo-accounts'); expect(r.status).toBe(200);
    expect(r.body.data.map((a: { email: string; role: string }) => [a.email, a.role])).toEqual([[OWNER, 'owner'], [BUSINESS, 'admin']]);
    expect(r.body.data[0].password).toBe(demoPassword(OWNER));
  });
  it('signs in with e-mail + password; sets an httpOnly SameSite=Strict cookie; both admins have full access', async () => {
    const r = await request(app).post('/api/admin/auth/login').set('Host', 'preview.example').send({ email: OWNER.toUpperCase(), password: demoPassword(OWNER) }); // non-loopback host → Secure
    expect(r.status).toBe(200); expect(JSON.stringify(r.body)).not.toContain(tokenOf(r));
    const c = String(r.headers['set-cookie']); expect(c).toMatch(/HttpOnly/); expect(c).toMatch(/SameSite=Strict/); expect(c).toMatch(/Path=\/api\/admin/); expect(c).toMatch(/Secure/);
    for (const email of [OWNER, BUSINESS]) {
      const t = await login(email); const me = await request(app).get('/api/admin/me').set(h(t));
      expect(me.status).toBe(200); expect(me.body.data.email).toBe(email); expect(me.body.demo).toBe(true);
      expect(Object.values(me.body.data.permissions).every(v => v === 'edit')).toBe(true);
      for (const path of ['/api/admin/products', '/api/admin/orders', '/api/admin/customers', '/api/admin/users', '/api/admin/audit']) expect((await request(app).get(path).set(h(t))).status).toBe(200);
      expect((await request(app).post('/api/admin/products/1/state').set(h(t)).send({ state: 'published' })).status).toBe(200);
    }
    expect((await request(app).get('/api/admin/me').set({ Authorization: `Bearer ${await login()}` })).status).toBe(401); // cookie only, no bearer tokens
  });
  it('wrong password / unknown e-mail look the same; validation', async () => {
    const a = await request(app).post('/api/admin/auth/login').send({ email: OWNER, password: 'wrong-password' });
    const b = await request(app).post('/api/admin/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password' });
    expect([a.status, b.status]).toEqual([401, 401]); expect(a.body).toEqual(b.body); expect(tokenOf(a)).toBe('');
    expect((await request(app).post('/api/admin/auth/login').send({ email: 'not-an-email', password: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/admin/auth/login').send({ email: OWNER })).status).toBe(400);
  });
  it('rate limit: 5 failures per e-mail per 15 min → 429 (even with the right password); window expires', async () => {
    for (let i = 0; i < 5; i++) expect((await request(app).post('/api/admin/auth/login').send({ email: OWNER, password: 'nope' })).status).toBe(401);
    const r = await request(app).post('/api/admin/auth/login').send({ email: OWNER, password: demoPassword(OWNER) });
    expect(r.status).toBe(429); expect(r.body.error).toBe('rate_limited');
    expect(await login(BUSINESS)).toBeTruthy(); // other account unaffected
    clock += 16 * 60_000; expect(await login(OWNER)).toBeTruthy();
  });
  it('rate limit: 20 failures per IP per 15 min across e-mails → 429', async () => {
    for (let i = 0; i < 20; i++) await request(app).post('/api/admin/auth/login').send({ email: `x${i}@example.com`, password: 'nope' });
    expect((await request(app).post('/api/admin/auth/login').send({ email: BUSINESS, password: demoPassword(BUSINESS) })).status).toBe(429);
  });
  it('customer tokens never work on admin endpoints; logout, idle timeout and max age end the session', async () => {
    expect((await request(app).get('/api/admin/dashboard')).status).toBe(401);
    const t = await login();
    const out = await request(app).post('/api/admin/auth/logout').set(h(t)); expect(out.status).toBe(204); expect(String(out.headers['set-cookie'])).toMatch(/Max-Age=0/);
    expect((await request(app).get('/api/admin/me').set(h(t))).status).toBe(401);
    const t2 = await login(); clock += 61 * 60_000;
    const r = await request(app).get('/api/admin/me').set(h(t2)); expect(r.status).toBe(401); expect(r.body.error).toBe('session_expired');
    const t3 = await login(); for (let i = 0; i < 8; i++) { clock += 55 * 60_000; expect((await request(app).get('/api/admin/me').set(h(t3))).status).toBe(200); } clock += 55 * 60_000;
    expect((await request(app).get('/api/admin/me').set(h(t3))).body.error).toBe('session_expired'); // 8h absolute max, even when active
  });
  it('cross-origin state-changing requests are refused', async () => {
    const t = await login();
    expect((await request(app).post('/api/admin/products/1/state').set(h(t)).set('Origin', 'https://evil.example').send({ state: 'draft' })).status).toBe(403);
    const host = '127.0.0.1:1'; // same-origin is fine
    expect((await request(app).post('/api/admin/products/1/state').set(h(t)).set('Host', host).set('Origin', `http://${host}`).send({ state: 'published' })).status).toBe(200);
  });
  it('the v1 account model: at most two admins, one Owner, unique e-mail; inactive admins cannot sign in', async () => {
    await request(app).get('/api/admin/demo-accounts'); // start-up seed done
    await expect(createAdmin(db, { email: 'third@example.com', name: 'x', password: 'long-enough-pass', role: 'admin' })).rejects.toThrow('admin_limit');
    const fresh = await createDb(false);
    await createAdmin(fresh, { email: 'a@example.com', name: 'A', password: 'long-enough-pass', role: 'owner' });
    await expect(createAdmin(fresh, { email: 'A@example.com', name: 'B', password: 'long-enough-pass', role: 'admin' })).rejects.toThrow('email_exists');
    await expect(createAdmin(fresh, { email: 'b@example.com', name: 'B', password: 'long-enough-pass', role: 'owner' })).rejects.toThrow('owner_exists');
    const hash = (await fresh.one<{ password_hash: string }>('SELECT password_hash FROM admin_users'))!.password_hash;
    expect(hash).toMatch(/^\$2[aby]\$/); expect(hash).not.toContain('long-enough-pass');
    const t = await login(BUSINESS); await db.run(`UPDATE admin_users SET status='inactive' WHERE email=?`, [BUSINESS]);
    expect((await request(app).get('/api/admin/me').set(h(t))).status).toBe(401);
    expect((await request(app).post('/api/admin/auth/login').send({ email: BUSINESS, password: demoPassword(BUSINESS) })).status).toBe(401);
    await fresh.close();
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
    expect(all.body.allCount).toBe(46); // 43 fixture products + 3 demo-only (2 draft, 1 unpublished) expect(all.body.data).toHaveLength(10); expect(all.body.counts.draft).toBe(2);
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
    await db.run('UPDATE variants SET on_hand=NULL WHERE id=?', [v.id]); // the manual flag applies to variants whose stock is not recorded (tracked ones follow inventory)
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
    // admin-v1: demo reviews live on the demo-only products; publish one so the shop endpoint can be checked.
    const target = r.body.data.find((x: { status: string; slug: string }) => x.status === 'published' && x.slug === 'admin-demo-draft-1');
    const d1 = (await request(app).get('/api/admin/products?q=' + encodeURIComponent('پیش‌نویس نمونه ۱')).set(h(t))).body.data[0];
    expect((await request(app).get('/api/products/admin-demo-draft-1')).status).toBe(404); // draft: hidden from the shop
    await request(app).post(`/api/admin/products/${d1.id}/state`).set(h(t)).send({ state: 'published' });
    const before = (await request(app).get('/api/products/admin-demo-draft-1/reviews')).body.data.count;
    await request(app).post(`/api/admin/reviews/${target.id}/status`).set(h(t)).send({ status: 'rejected' });
    expect((await request(app).get('/api/products/admin-demo-draft-1/reviews')).body.data.count).toBe(before - 1);
    await request(app).post(`/api/admin/reviews/${target.id}/status`).set(h(t)).send({ status: 'published' });
    expect((await request(app).get('/api/products/admin-demo-draft-1/reviews')).body.data.count).toBe(before);
    expect((await request(app).delete(`/api/admin/reviews/${target.id}`).set(h(t))).status).toBe(204);
    expect((await request(app).get('/api/products/admin-demo-draft-1/reviews')).body.data.count).toBe(before - 1);
    expect((await request(app).get('/api/admin/reviews?rating=5').set(h(t))).body.data.every((x: { rating: number }) => x.rating === 5)).toBe(true);
  });
  it('r3: list rows carry thumbnail + SKU; date range and author search filter', async () => {
    const t = await login(); const all = (await request(app).get('/api/admin/reviews').set(h(t))).body.data;
    expect(all.length).toBeGreaterThan(0); expect(all[0].sku).toMatch(/\S/); expect('imageUrl' in all[0]).toBe(true);
    expect((await request(app).get('/api/admin/reviews?from=2999-01-01').set(h(t))).body.data).toEqual([]);
    expect((await request(app).get('/api/admin/reviews?to=2999-01-01&from=2000-01-01').set(h(t))).body.data.length).toBe(all.length);
    const who = all[0].author.split(' ')[0];
    expect((await request(app).get(`/api/admin/reviews?q=${encodeURIComponent(who)}`).set(h(t))).body.data.length).toBeGreaterThan(0);
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

describe('settings: admin users (read-only in v1)', () => {
  it('lists the two admins by e-mail with role label; no invite / role-edit endpoints', async () => {
    const t = await login(); const r = await request(app).get('/api/admin/users').set(h(t));
    expect(r.body.data.map((u: { email: string }) => u.email)).toEqual([OWNER, BUSINESS]); expect(r.body.maxAdmins).toBe(2); expect(r.body.access).toBe('full');
    expect(r.body.data[0].roleLabel).toBeTruthy(); expect(r.body.data[0].lastLogin).toBeTruthy(); expect(JSON.stringify(r.body)).not.toMatch(/password/i);
    expect((await request(app).post('/api/admin/users').set(h(t)).send({ email: 'x@example.com', name: 'x' })).status).toBe(404);
    expect((await request(app).put(`/api/admin/users/${r.body.data[1].id}`).set(h(t)).send({ status: 'inactive' })).status).toBe(404);
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

describe('admin-v1: real catalogue (unpriced) + NULL prices', () => {
  it('demo seed runs on the real catalogue without prices and never hides real products', async () => {
    const real = await createDb(); // catalog-real, JOUMEH_SAMPLE_PLACEHOLDERS=0 in tests → no prices, no variants
    const shopBefore = (await request(createApp(await createDb(), { adminDemo: false })).get('/api/products?limit=100')).body;
    const a = createApp(real, { adminDemo: true });
    const t = await login(OWNER, a);
    const list = await request(a).get('/api/admin/products').set(h(t));
    expect(list.status).toBe(200); expect(list.body.allCount).toBe(41 + 3); expect(list.body.counts.draft).toBe(2);
    expect(list.body.data.some((p: { price: number | null }) => p.price === null)).toBe(true);
    expect((await request(a).get('/api/products?limit=100')).body).toEqual(shopBefore); // preview shop == production shop
    expect((await request(a).get('/api/admin/dashboard').set(h(t))).status).toBe(200);
    expect((await request(a).get('/api/admin/orders').set(h(t))).status).toBe(200);
  });
  it('edits an unpriced product without inventing a price, gives it a first price, then clears it', async () => {
    const t = await login();
    const c = await request(app).post('/api/admin/products').set(h(t)).send({ name: 'بدون قیمت', slug: 'no-price', price: '', categoryId: 1, status: 'default' });
    expect(c.status).toBe(201); expect(c.body.data.price).toBeNull();
    const id = c.body.data.id; const d = (await request(app).get(`/api/admin/products/${id}`).set(h(t))).body.data;
    expect(d.price).toBeNull();
    expect((await request(app).put(`/api/admin/products/${id}`).set(h(t)).send({ ...d, price: null, originalPrice: 900 })).body.fields.originalPrice).toBeTruthy();
    expect((await request(app).put(`/api/admin/products/${id}`).set(h(t)).send({ ...d, name: 'بدون قیمت ۲' })).status).toBe(200);
    expect((await request(app).put(`/api/admin/products/${id}`).set(h(t)).send({ ...d, price: 750000 })).body.data.price).toBe(750000);
    expect((await request(app).put(`/api/admin/products/${id}`).set(h(t)).send({ ...d, price: null })).body.data.price).toBeNull();
    expect((await request(app).put(`/api/admin/products/${id}`).set(h(t)).send({ ...d, price: -5 })).body.fields.price).toBeTruthy();
  });
});

describe('admin-v1: demo sessions survive serverless instances (signed demo token)', () => {
  // Only the per-instance in-memory preview signs cookies; with Postgres (shared DB) sessions are plain random tokens.
  it.skipIf(!!process.env.JOUMEH_TEST_PG_URL)('a token from instance A works on a fresh instance B; tampered, logged-out, expired and non-demo cases are refused', async () => {
    const t = await login();
    const b = createApp(await createDb(sampleSeed), { now: () => clock, adminDemo: true }); // second "instance": own in-memory DB, no session row
    expect((await request(b).get('/api/admin/me').set(h(t))).status).toBe(200);
    expect((await request(b).get('/api/admin/dashboard').set(h(t))).status).toBe(200);
    const bad = t.slice(0, -1) + (t.endsWith('0') ? '1' : '0');
    expect((await request(createApp(await createDb(sampleSeed), { now: () => clock, adminDemo: true })).get('/api/admin/me').set(h(bad))).status).toBe(401);
    expect((await request(createApp(await createDb(sampleSeed), { now: () => clock, adminDemo: true })).get('/api/admin/me').set(h('1.1800000000000.' + 'a'.repeat(24) + '.' + 'b'.repeat(64)))).status).toBe(401);
    expect((await request(b).post('/api/admin/auth/logout').set(h(t))).status).toBe(204);
    expect((await request(b).get('/api/admin/me').set(h(t))).status).toBe(401); // logout is final on that instance
    const off = createApp(await createDb(sampleSeed), { now: () => clock, adminDemo: false }); // production: never re-creates sessions
    expect((await request(off).get('/api/admin/me').set(h(t))).status).toBe(401);
    let later = clock + 9 * 3_600_000; const c = createApp(await createDb(sampleSeed), { now: () => later, adminDemo: true });
    expect((await request(c).get('/api/admin/me').set(h(t))).status).toBe(401); later = clock; // older than ADMIN_DEMO_TOKEN_MAX_HOURS
  });
});
