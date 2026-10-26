// admin-v1: inventory (ledger, oversell, audit), product images (MediaStore + alt), silent session check. DEMO data only.
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDb, type Db } from '../server/db';
import { createApp } from '../server/app';
import { DEMO_ADMINS, demoPassword, ADMIN_COOKIE } from '../server/admin';
import { computeRow, LOW_STOCK_DEFAULT } from '../server/inventory';
import { checkImage, sniffImage, MemoryMediaStore, DiskMediaStore, S3MediaStore, mediaFromEnv, MEDIA_MAX_BYTES, type S3Like } from '../server/media';
import { sampleSeed } from './fixtures/sample-seed';

let db: Db; let app: ReturnType<typeof createApp>; let media: MemoryMediaStore;
beforeEach(async () => { db = await createDb(sampleSeed); media = new MemoryMediaStore(); app = createApp(db, { adminDemo: true, media }); });
const OWNER = DEMO_ADMINS[0].email;
async function login() {
  const r = await request(app).post('/api/admin/auth/login').send({ email: OWNER, password: demoPassword(OWNER) });
  const c = ([] as string[]).concat(r.headers['set-cookie'] as unknown as string[]).find(x => x.startsWith(ADMIN_COOKIE + '='))!;
  return { Cookie: c.split(';')[0] };
}
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(32)]);
const GIF = Buffer.from('GIF89a' + 'x'.repeat(40));

describe('silent pre-login session check', () => {
  it('GET /api/admin/auth/session is 200 with data=null before sign-in, and the admin after', async () => {
    const r = await request(app).get('/api/admin/auth/session'); expect(r.status).toBe(200); expect(r.body.data).toBeNull();
    const h = await login(); const s = await request(app).get('/api/admin/auth/session').set(h);
    expect(s.status).toBe(200); expect(s.body.data.email).toBe(OWNER);
  });
});

describe('media validation + drivers', () => {
  it('sniffs JPG/PNG/WebP by magic bytes; rejects GIF, empty and > 5 MB with Persian messages', () => {
    expect([sniffImage(JPG), sniffImage(PNG), sniffImage(WEBP), sniffImage(GIF)]).toEqual(['image/jpeg', 'image/png', 'image/webp', null]);
    expect(checkImage(GIF)).toMatchObject({ error: 'file_type', message: 'فقط تصویر JPG، PNG یا WebP مجاز است' });
    expect(checkImage(Buffer.alloc(0))).toMatchObject({ error: 'file_required' });
    const big = Buffer.concat([PNG, Buffer.alloc(MEDIA_MAX_BYTES)]); expect(checkImage(big)).toMatchObject({ error: 'file_too_large', message: 'حجم تصویر باید حداکثر ۵ مگابایت باشد' });
    expect(checkImage(Buffer.concat([PNG, Buffer.alloc(MEDIA_MAX_BYTES - PNG.length)]))).toEqual({ mime: 'image/png' }); // exactly 5 MB is allowed
  });
  it('memory and disk drivers store/read/delete; keys with .. are refused', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'joumeh-media-'));
    for (const s of [new MemoryMediaStore(), new DiskMediaStore(dir)]) {
      await s.put('products/1/a.png', PNG, 'image/png');
      expect(await s.get('products/1/a.png')).toEqual({ data: PNG, mime: 'image/png' });
      expect(s.url('products/1/a.png')).toBe('/api/media/products/1/a.png');
      await s.delete('products/1/a.png'); expect(await s.get('products/1/a.png')).toBeNull();
      await expect(s.put('../x.png', PNG, 'image/png')).rejects.toThrow('bad_media_key');
    }
    const d = new DiskMediaStore(dir); await d.put('products/2/b.jpg', JPG, 'image/jpeg'); expect(await readFile(join(dir, 'products/2/b.jpg'))).toEqual(JPG);
  });
  it('S3 driver sends Put/Get/Delete commands to the (mock) client; config comes only from MEDIA_* env', async () => {
    const sent: { name: string; input: Record<string, unknown> }[] = []; const objects = new Map<string, Buffer>();
    const client: S3Like = { async send(cmd: any) {
      const name = cmd.constructor.name; sent.push({ name, input: cmd.input });
      if (name === 'PutObjectCommand') objects.set(cmd.input.Key, cmd.input.Body);
      if (name === 'GetObjectCommand') { const b = objects.get(cmd.input.Key); if (!b) throw Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' });
        return { ContentType: 'image/png', Body: { transformToByteArray: async () => new Uint8Array(b) } }; }
      if (name === 'DeleteObjectCommand') objects.delete(cmd.input.Key);
      return {};
    } };
    const s = new S3MediaStore({ bucket: 'b', region: 'us-east-1', accessKeyId: 'k', secretAccessKey: 's', forcePathStyle: true, prefix: 'joumeh/', publicBaseUrl: 'https://cdn.example/media' }, client);
    await s.put('products/1/a.png', PNG, 'image/png');
    expect(sent[0]).toMatchObject({ name: 'PutObjectCommand', input: { Bucket: 'b', Key: 'joumeh/products/1/a.png', ContentType: 'image/png' } });
    expect((await s.get('products/1/a.png'))!.data.equals(PNG)).toBe(true);
    expect(await s.get('products/1/missing.png')).toBeNull();
    expect(s.url('products/1/a.png')).toBe('https://cdn.example/media/joumeh/products/1/a.png');
    await s.delete('products/1/a.png'); expect(objects.size).toBe(0);
    expect(mediaFromEnv({}).driver).toBe('memory');
    expect(() => mediaFromEnv({ MEDIA_DRIVER: 's3', MEDIA_S3_BUCKET: 'b' })).toThrow(/MEDIA_S3_ACCESS_KEY_ID.*MEDIA_S3_SECRET_ACCESS_KEY/);
    expect(() => mediaFromEnv({ MEDIA_DRIVER: 's3', MEDIA_S3_BUCKET: 'b', MEDIA_S3_ACCESS_KEY_ID: 'topsecret-id' })).not.toThrow(/topsecret-id/);
    expect(mediaFromEnv({ MEDIA_DRIVER: 's3', MEDIA_S3_BUCKET: 'b', MEDIA_S3_ACCESS_KEY_ID: 'k', MEDIA_S3_SECRET_ACCESS_KEY: 's' }).driver).toBe('s3');
  });
});

describe('product images API', () => {
  it('uploads with required alt, serves it publicly, edits alt, sets cover, detaches (file kept); audited', async () => {
    const h = await login();
    const up = (buf: Buffer, alt: string, type = 'image/png') => request(app).post(`/api/admin/products/2/images?alt=${encodeURIComponent(alt)}`).set(h).set('Content-Type', type).send(buf);
    const noAlt = await up(PNG, ''); expect(noAlt.status).toBe(400); expect(noAlt.body.fields.alt).toBe('متن جایگزین (alt) الزامی است');
    const gif = await up(GIF, 'x', 'image/png'); expect(gif.status).toBe(400); expect(gif.body.fields.file).toMatch(/JPG، PNG یا WebP/); // header lies → magic bytes win
    const big = await up(Buffer.concat([PNG, Buffer.alloc(MEDIA_MAX_BYTES)]), 'بزرگ'); expect(big.status).toBe(413); expect(big.body.fields.file).toMatch(/۵ مگابایت/);
    expect((await request(app).post('/api/admin/products/2/images?alt=x').set('Content-Type', 'image/png').send(PNG)).status).toBe(401);
    const ok = await up(WEBP, 'مانتو کرم — نمای جلو'); expect(ok.status).toBe(201);
    const img = ok.body.data.at(-1); expect(img).toMatchObject({ alt: 'مانتو کرم — نمای جلو', mime: 'image/webp', bytes: WEBP.length }); expect(img.url).toMatch(/^\/api\/media\/products\/2\/[0-9a-f]{18}\.webp$/);
    const pub = await request(app).get(img.url); expect(pub.status).toBe(200); expect(pub.headers['content-type']).toBe('image/webp'); expect(Buffer.from(pub.body).equals(WEBP)).toBe(true);
    expect((await request(app).put(`/api/admin/products/2/images/${img.id}`).set(h).send({ alt: ' ' })).status).toBe(400);
    const cov = await request(app).put(`/api/admin/products/2/images/${img.id}`).set(h).send({ alt: 'نمای جلو', cover: true }); expect(cov.body.data[0]).toMatchObject({ id: img.id, alt: 'نمای جلو' });
    expect((await request(app).get('/api/products/' + (await db.one<{ slug: string }>('SELECT slug FROM products WHERE id=2'))!.slug)).body.data.images[0].url).toBe(img.url); // shop shows the new cover
    const del = await request(app).delete(`/api/admin/products/2/images/${img.id}`).set(h); expect(del.status).toBe(200); expect(del.body.data.find((i: { id: number }) => i.id === img.id)).toBeUndefined();
    expect((await request(app).get(img.url)).status).toBe(200); // detached only — the stored file is not deleted
    const acts = (await db.all<{ action: string }>('SELECT action FROM audit_log')).map(a => a.action);
    expect(acts).toEqual(expect.arrayContaining(['image:upload', 'image:alt', 'image:cover', 'image:detach']));
  });
  it('adds size × colour variants (new ones start unavailable), validates in Persian', async () => {
    const h = await login();
    const b = await request(app).post('/api/admin/products/2/variants').set(h).send({ sizes: ['Q'], color: '', colorHex: 'red' });
    expect(b.status).toBe(400); expect(b.body.fields).toMatchObject({ sizes: expect.any(String), color: 'نام رنگ الزامی است (حداکثر ۴۰ کاراکتر)', colorHex: expect.any(String) });
    const r = await request(app).post('/api/admin/products/2/variants').set(h).send({ sizes: ['S', 'XL'], color: 'زیتونی', colorHex: '#556b2f' }); expect(r.body.data.created).toBe(2);
    expect((await request(app).post('/api/admin/products/2/variants').set(h).send({ sizes: ['S'], color: 'زیتونی', colorHex: '#556b2f' })).body.data.created).toBe(0);
    const d = (await request(app).get('/api/admin/products/2').set(h)).body.data.variants.filter((v: { color: string }) => v.color === 'زیتونی');
    expect(d.map((v: { available: number; stockStatus: string }) => [v.available, v.stockStatus])).toEqual([[0, 'untracked'], [0, 'untracked']]);
  });
  it('Persian product validation messages', async () => {
    const h = await login();
    const r = await request(app).post('/api/admin/products').set(h).send({ name: '', slug: '', price: -5, categoryId: 999, status: 'x' });
    expect(r.body.fields).toMatchObject({ name: 'نام محصول الزامی است', slug: 'شناسه (نشانی صفحه) الزامی است', price: 'قیمت باید عدد صحیح بیشتر از صفر (تومان) باشد', categoryId: 'دسته را انتخاب کنید' });
  });
});

describe('inventory', () => {
  it('status rules: untracked / ok / low (placeholder threshold) / out / oversold; قابل فروش = فیزیکی − رزرو − تخصیص', () => {
    const base = { variantId: 1, productId: 1, product: 'p', publishState: 'published', size: 'M', color: 'c', colorHex: null, sku: 's', imageUrl: null, lowStockThreshold: null };
    expect(computeRow({ ...base, onHand: null, allocated: 0 }).status).toBe('untracked');
    expect(computeRow({ ...base, onHand: 10, allocated: 3 })).toMatchObject({ available: 7, reserved: 0, status: 'ok', threshold: LOW_STOCK_DEFAULT, thresholdDefault: true });
    expect(computeRow({ ...base, onHand: 4, allocated: 2 }).status).toBe('low');
    expect(computeRow({ ...base, onHand: 2, allocated: 2 }).status).toBe('out');
    expect(computeRow({ ...base, onHand: 1, allocated: 2 })).toMatchObject({ available: -1, status: 'oversold' });
    expect(computeRow({ ...base, onHand: 5, allocated: 0, lowStockThreshold: 5 })).toMatchObject({ status: 'low', thresholdDefault: false });
  });
  it('lists with tabs and counts; demo stock matches the shop flags', async () => {
    const h = await login(); const r = await request(app).get('/api/admin/inventory').set(h);
    expect(r.status).toBe(200); expect(r.body.counts.all).toBeGreaterThan(0); expect(r.body.data).toHaveLength(10);
    const mismatched = await db.all(`SELECT v.id FROM variants v WHERE (v.available=1 AND v.on_hand=0) OR (v.available=0 AND v.on_hand>0)`); expect(mismatched).toEqual([]);
    const low = await request(app).get('/api/admin/inventory?tab=low').set(h); expect(low.body.data.every((x: { status: string }) => x.status === 'low')).toBe(true);
    expect(r.body.stubs.reservation.code).toBe('BD-08'); expect(r.body.stubs.lowStock.code).toBe('ADMIN-PH-LOWSTOCK');
    // search by a full SKU that contains Persian characters (real catalogue SKUs carry sample colour names)
    const sku = 'P99-کرم (نمونه)-M'; await db.run('UPDATE variants SET sku=? WHERE id=?', [sku, r.body.data[0].variantId]); const bySku = await request(app).get(`/api/admin/inventory?q=${encodeURIComponent(sku)}`).set(h);
    expect(bySku.body.data.map((x: { sku: string }) => x.sku)).toContain(sku);
  });
  it('adjust: increase / decrease / count need a reason; ledger + audit row; shop flag follows stock', async () => {
    const h = await login(); const v = (await db.one<{ id: number; on_hand: number }>('SELECT id,on_hand FROM variants WHERE on_hand>0 ORDER BY id'))!;
    const adj = (body: object) => request(app).post(`/api/admin/inventory/${v.id}/adjust`).set(h).send(body);
    const nr = await adj({ mode: 'increase', qty: 6 }); expect(nr.status).toBe(400); expect(nr.body.fields.reason).toBe('دلیل تغییر را انتخاب کنید');
    expect((await adj({ mode: 'increase', qty: 0, reason: 'ورود کالا' })).body.fields.qty).toBeTruthy();
    expect((await adj({ mode: 'increase', qty: 2, reason: 'سایر' })).body.fields.note).toBe('برای «سایر» یادداشت الزامی است');
    const inc = await adj({ mode: 'increase', qty: '۶', reason: 'ورود کالا', note: 'فاکتور خرید شماره ۲۱۴' }); expect(inc.status).toBe(200);
    expect(inc.body.data).toMatchObject({ before: v.on_hand, after: v.on_hand + 6 });
    const over = await adj({ mode: 'decrease', qty: v.on_hand + 7, reason: 'آسیب‌دیدگی / ضایعات' }); expect(over.status).toBe(409); expect(over.body.fields.qty).toMatch(/بیشتر از موجود فیزیکی/);
    const cnt = await adj({ mode: 'count', qty: 0, reason: 'شمارش انبار (مغایرت)' }); expect(cnt.body.data.row.status).toMatch(/out|oversold/);
    expect((await db.one<{ available: number }>('SELECT available FROM variants WHERE id=?', [v.id]))!.available).toBe(0); // the shop now shows ناموجود
    await adj({ mode: 'count', qty: 9, reason: 'شمارش دوره‌ای' }); expect((await db.one<{ available: number }>('SELECT available FROM variants WHERE id=?', [v.id]))!.available).toBe(1);
    const moves = (await request(app).get(`/api/admin/inventory/movements?variant=${v.id}`).set(h)).body.data;
    expect(moves.map((m: { kind: string; delta: number }) => [m.kind, m.delta])).toEqual([['count', 9], ['count', -(v.on_hand + 6)], ['increase', 6], ['count', v.on_hand]]);
    expect(moves[2]).toMatchObject({ reason: 'ورود کالا', note: 'فاکتور خرید شماره ۲۱۴', actor: DEMO_ADMINS[0].name, beforeQty: v.on_hand, afterQty: v.on_hand + 6 });
    const audits = await db.all<{ action: string; entity_id: string }>(`SELECT action, entity_id FROM audit_log WHERE entity='variant'`);
    expect(audits.map(a => a.action)).toEqual(['stock:increase', 'stock:count', 'stock:count']); expect(audits.every(a => a.entity_id === String(v.id))).toBe(true);
  });
  it('a failed change writes nothing (ledger + audit + stock are one transaction); the ledger is append-only in the app', async () => {
    const h = await login(); const v = (await db.one<{ id: number }>('SELECT id FROM variants WHERE on_hand>0 ORDER BY id'))!;
    const n = async () => [(await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM inventory_movements'))!.n, (await db.one<{ n: number }>(`SELECT COUNT(*) AS n FROM audit_log WHERE entity='variant'`))!.n];
    const before = await n(); await request(app).post(`/api/admin/inventory/${v.id}/adjust`).set(h).send({ mode: 'decrease', qty: 999, reason: 'اصلاح خطای ثبت' });
    expect(await n()).toEqual(before);
    const { readFileSync } = await import('node:fs');
    const src = ['server/admin.ts', 'server/inventory.ts'].map(f => readFileSync(f, 'utf8')).join('\n');
    expect(src).not.toMatch(/(UPDATE|DELETE FROM)\s+inventory_movements/i);
  });
  it('in-store sale: by SKU, cannot exceed physical stock; pushing قابل فروش below 0 is recorded and flagged (BD-08), orders are listed, not changed', async () => {
    const h = await login();
    // a paid, unshipped sample order line → allocated stock
    const line = (await db.one<{ variant_id: number; quantity: number; order_id: number }>(`SELECT oi.variant_id, oi.quantity, oi.order_id FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE o.payment_status='paid' AND o.order_status IN ('pending','processing') ORDER BY oi.id`))!;
    const sku = (await db.one<{ sku: string }>('SELECT sku FROM variants WHERE id=?', [line.variant_id]))!.sku;
    await request(app).post(`/api/admin/inventory/${line.variant_id}/adjust`).set(h).send({ mode: 'count', qty: line.quantity, reason: 'شمارش دوره‌ای' }); // فیزیکی = تخصیص → قابل فروش 0
    expect((await request(app).post('/api/admin/inventory/pos-sale').set(h).send({ sku: 'NOPE', qty: 1 })).status).toBe(404);
    expect((await request(app).post('/api/admin/inventory/pos-sale').set(h).send({ sku, qty: line.quantity + 1 })).status).toBe(409);
    const status0 = (await db.one<{ s: string }>('SELECT order_status AS s FROM orders WHERE id=?', [line.order_id]))!.s;
    const r = await request(app).post('/api/admin/inventory/pos-sale').set(h).send({ sku, qty: 1 });
    expect(r.status).toBe(200); expect(r.body.data.oversold).toBe(true); expect(r.body.data.row.status).toBe('oversold'); expect(r.body.data.row.available).toBe(-1);
    expect(r.body.data.affectedOrders.map((o: { id: number }) => o.id)).toContain(line.order_id); expect(r.body.stubs.oversell.code).toBe('BD-08');
    expect((await db.one<{ s: string }>('SELECT order_status AS s FROM orders WHERE id=?', [line.order_id]))!.s).toBe(status0); // resolution is a business decision
    const inv = await request(app).get('/api/admin/inventory?tab=oversold').set(h); expect(inv.body.data.map((x: { variantId: number }) => x.variantId)).toContain(line.variant_id);
    const m = (await request(app).get(`/api/admin/inventory/movements?kind=pos_sale`).set(h)).body.data[0]; expect(m).toMatchObject({ reason: 'فروش حضوری', delta: -1, oversold: 1 });
  });
  it('marking an order «ارسال شده» deducts its tracked lines (ADMIN-PH-STOCK-FLOW) with a ledger row', async () => {
    const h = await login();
    const o = (await db.one<{ id: number; order_number: string }>(`SELECT id, order_number FROM orders WHERE order_status='processing' ORDER BY id`))!;
    const lines = await db.all<{ variant_id: number; quantity: number; on_hand: number }>('SELECT oi.variant_id, oi.quantity, v.on_hand FROM order_items oi JOIN variants v ON v.id=oi.variant_id WHERE oi.order_id=?', [o.id]);
    expect((await request(app).post(`/api/admin/orders/${o.id}/status`).set(h).send({ status: 'shipped' })).status).toBe(200);
    for (const l of lines) expect((await db.one<{ on_hand: number }>('SELECT on_hand FROM variants WHERE id=?', [l.variant_id]))!.on_hand).toBe(l.on_hand - l.quantity);
    const ms = (await request(app).get('/api/admin/inventory/movements?kind=order_shipped').set(h)).body.data;
    expect(ms[0]).toMatchObject({ reason: `ارسال سفارش ${o.order_number}`, orderId: o.id });
  });
  it('the dashboard reports low / out / oversold counts', async () => {
    const r = await request(app).get('/api/admin/dashboard').set(await login());
    expect(typeof r.body.data.lowStock).toBe('number'); expect(r.body.stubs.lowStock.code).toBe('ADMIN-PH-LOWSTOCK');
  });
});
