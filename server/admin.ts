// CLI-002 Joumeh ADMIN — DEMO (branch admin-demo). In-memory sample data that resets on restart («داده نمونه»).
// Figma: ADMIN — INTERACTIVE PROTOTYPE 304:82401 · roles 166:14637 · permission matrix 166:14722.
// Every business rule here is a labelled PLACEHOLDER (BD-xx) until the CEO decides it.
import type { Express, Request, Response, NextFunction } from 'express';
import type { Database } from 'sql.js';
import { createHash, randomBytes } from 'node:crypto';
import { all } from './db.js';
import { stub } from './stubs.js';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const one = <T = Record<string, unknown>>(db: Database, sql: string, p: unknown[] = []) => all<T>(db, sql, p)[0];
const lastId = (db: Database) => one<{ id: number }>(db, 'SELECT last_insert_rowid() AS id')!.id;
const toLatin = (s: unknown) => String(s ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s+/g, '');
const PHONE_RE = /^09\d{9}$/;

// ---- Roles & permissions: PLACEHOLDER (BD-19). Keys/labels from Figma 166:14637; levels simplified from 166:14722. ----
export const ROLES = {
  owner: 'مدیر کل (مالک)', catalog: 'مسئول محصولات', orders: 'مسئول سفارش‌ها', inventory: 'مسئول انبار', finance: 'مسئول مالی', support: 'پشتیبان',
} as const;
export type Role = keyof typeof ROLES;
export type Module = 'dashboard' | 'products' | 'orders' | 'customers' | 'reviews' | 'content' | 'settings';
type Level = 'none' | 'view' | 'edit';
export const PERMISSIONS: Record<Role, Record<Module, Level>> = {
  owner:     { dashboard: 'edit', products: 'edit', orders: 'edit', customers: 'edit', reviews: 'edit', content: 'edit', settings: 'edit' },
  catalog:   { dashboard: 'view', products: 'edit', orders: 'none', customers: 'none', reviews: 'edit', content: 'edit', settings: 'none' },
  orders:    { dashboard: 'view', products: 'view', orders: 'edit', customers: 'view', reviews: 'none', content: 'none', settings: 'none' },
  inventory: { dashboard: 'view', products: 'view', orders: 'view', customers: 'none', reviews: 'none', content: 'none', settings: 'none' },
  finance:   { dashboard: 'view', products: 'none', orders: 'view', customers: 'view', reviews: 'none', content: 'none', settings: 'none' },
  support:   { dashboard: 'view', products: 'view', orders: 'view', customers: 'view', reviews: 'edit', content: 'none', settings: 'none' },
};
const RANK: Record<Level, number> = { none: 0, view: 1, edit: 2 };
const levelFor = (roles: Role[], m: Module): Level => roles.reduce<Level>((b, r) => (RANK[PERMISSIONS[r]?.[m] ?? 'none'] > RANK[b] ? PERMISSIONS[r][m] : b), 'none');

// ---- Order transitions: PLACEHOLDER (BD-05 cancellation, BD-23 fulfilment). Uses the existing schema enums only. ----
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [],
};
// Admin session idle timeout: engineering PLACEHOLDER (Figma 166:15288 "N minutes [BD]").
export const ADMIN_IDLE_MINUTES = 60;
// Cancel reasons: SAMPLE list (first item from Figma 180:30099). The real list is a business decision (BD-05).
export const CANCEL_REASONS = ['درخواست مشتری', 'ناموجود بودن کالا', 'پرداخت انجام نشد', 'سایر'];

export const ADMIN_STUBS = { roles: stub('BD-19'), cancellation: stub('BD-05'), fulfilment: stub('BD-23'), payment: stub('BD-01'), shipping: stub('BD-02'),
  vat: stub('BD-06'), pricing: stub('BD-10'), taxonomy: stub('BD-18'), reviews: stub('BD-15'), sms: stub('BD-13'), content: stub('BD-14') };

const DEMO_ADMINS: [string, string, string, string][] = [ // Figma 184:42330 sample rows
  ['09120000001', 'مدیر فروشگاه', 'owner,finance', 'active'],
  ['09130000002', 'همکار فروشگاه', 'orders,inventory,support', 'active'],
  ['09150000003', 'همکار اینستاگرام', 'support', 'invited'],
  ['09170000004', 'مسئول محصولات (نمونه)', 'catalog', 'active'],
];
const PAGES: [string, string, string][] = [
  ['shipping', 'ارسال و تحویل', 'BD-02/BD-03'], ['returns', 'بازگشت کالا', 'BD-04'], ['story', 'قصه‌ی ما', 'BD-14'],
  ['careers', 'همکاری', 'BD-14'], ['blog', 'وبلاگ', 'BD-14'], ['privacy', 'حریم خصوصی', 'BD-14'], ['terms', 'قوانین و مقررات', 'BD-14'],
];
const PLACEHOLDER_BODY = 'متن نمونه — محتوای نهایی این صفحه پس از تصمیم کسب‌وکار جایگزین می‌شود. (داده نمونه)';

/** Content rows + admin users. Content pages start unpublished, so the shop keeps its current placeholders. */
export function seedAdminBase(db: Database) {
  if (one(db, 'SELECT 1 AS x FROM admin_users LIMIT 1')) return;
  for (const [phone, name, roles, status] of DEMO_ADMINS) db.run('INSERT INTO admin_users (phone,name,roles,status) VALUES (?,?,?,?)', [phone, name, roles, status]);
  for (const [slug, title, bd] of PAGES) db.run('INSERT INTO content_pages (slug,title,body,published,bd) VALUES (?,?,?,0,?)', [slug, title, PLACEHOLDER_BODY, bd]);
  db.run(`INSERT INTO content_home (id,hero_title,hero_cta,hero_link,hero_alt,sections_json) VALUES (1,'کالکشن پاییزه جومه','مشاهده کالکشن','/women','مدل با مانتو کتان کرم در فضای کویری (نمونه)',?)`,
    [JSON.stringify([{ key: 'newest', title: 'جدیدترین‌ها', visible: true }, { key: 'categories', title: 'دسته‌بندی‌های ویژه (زنانه / مردانه)', visible: true }, { key: 'bestsellers', title: 'پرفروش‌ها', visible: true }])]);
}

/** Extra SAMPLE customers, orders and reviews for the demo admin only (keeps the shop's own seed and tests unchanged). */
export function seedAdminDemo(db: Database) {
  if (one(db, `SELECT 1 AS x FROM users WHERE phone='09121110001'`)) return;
  const people: [string, string, string][] = [['09121110001', 'نگار', 'رضایی'], ['09121110002', 'مریم', 'کریمی'], ['09121110003', 'علی', 'حسینی'], ['09121110004', 'الهام', 'سعیدی'], ['09121110005', 'رضا', 'محمدی']];
  const ids: number[] = [];
  for (const [ph, f, l] of people) { db.run('INSERT INTO users (phone,first_name,last_name) VALUES (?,?,?)', [ph, f, l]); ids.push(lastId(db)); }
  const addr = (n: string, ph: string) => JSON.stringify({ recipient: n, phone: ph, province: 'یزد', city: 'یزد', line: 'خیابان نمونه، پلاک ۱۲ (داده نمونه)', postalCode: '8915600000' });
  const orders: [number, number, string, string, string, string, [number, number][]][] = [
    [10123, 0, 'processing', 'paid', 'unfulfilled', '2026-10-22 09:50:00', [[2, 1]]],
    [10122, 1, 'pending', 'unpaid', 'unfulfilled', '2026-10-22 09:12:00', [[3, 1], [6, 2]]],
    [10121, 2, 'cancelled', 'failed', 'unfulfilled', '2026-10-21 18:30:00', [[28, 1]]],
    [10120, 3, 'shipped', 'paid', 'shipped', '2026-10-21 11:05:00', [[7, 1], [9, 1]]],
    [10119, 4, 'delivered', 'paid', 'delivered', '2026-10-18 16:40:00', [[29, 2]]],
  ];
  for (const [oid, who, os, ps, fs, at, items] of orders) {
    let sub = 0, disc = 0;
    for (const [pid, q] of items) { const r = one<{ a: number; o: number | null }>(db, 'SELECT amount AS a, original_amount AS o FROM prices WHERE product_id=?', [pid])!; sub += (r.o ?? r.a) * q; disc += ((r.o ?? r.a) - r.a) * q; }
    const [ph, f, l] = people[who];
    db.run(`INSERT INTO orders (id,user_id,order_number,order_status,payment_status,fulfilment_status,subtotal,discount,total,address_json,is_sample,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)`,
      [oid, ids[who], String(oid), os, ps, fs, sub, disc, sub - disc, addr(`${f} ${l}`, ph), at]);
    for (const [pid, q] of items) {
      const v = one<{ name: string; amount: number; id: number; size: string; color: string }>(db, `SELECT p.name, pr.amount, v.id, v.size, v.color FROM products p JOIN prices pr ON pr.product_id=p.id JOIN variants v ON v.product_id=p.id WHERE p.id=? AND v.size='S' LIMIT 1`, [pid])!;
      db.run('INSERT INTO order_items (order_id,product_id,variant_id,name,size,color,unit_price,quantity) VALUES (?,?,?,?,?,?,?,?)', [oid, pid, v.id, v.name, v.size, v.color, v.amount, q]);
    }
    db.run('INSERT INTO order_events (order_id,status,actor,created_at) VALUES (?,?,?,?)', [oid, 'placed', 'مشتری', at]);
  }
  db.run(`INSERT INTO order_events (order_id,status,actor,created_at) VALUES (10124,'placed','مشتری','2026-10-04 12:00:00'),(10124,'processing','مدیر فروشگاه','2026-10-04 12:24:00')`);
  db.run(`UPDATE products SET publish_state='draft' WHERE id IN (26,27)`);
  db.run(`UPDATE products SET publish_state='unpublished' WHERE id=43`);
  const revs: [number, number, number, string, string][] = [
    [1, ids[0], 5, 'جنس پارچه خیلی خوب بود و سایز دقیق. (داده نمونه)', 'published'],
    [1, ids[1], 4, 'رنگش کمی روشن‌تر از عکس بود. (داده نمونه)', 'published'],
    [2, ids[2], 2, 'دیر رسید ولی کیفیت قابل قبول. (داده نمونه)', 'published'],
    [28, ids[3], 5, 'عالی، دوباره خرید می‌کنم. (داده نمونه)', 'published'],
    [5, ids[4], 1, 'متن نمونه‌ی نامناسب که پنهان شده است. (داده نمونه)', 'rejected'],
  ];
  for (const r of revs) db.run('INSERT INTO reviews (product_id,user_id,rating,body,status) VALUES (?,?,?,?,?)', r);
}

type AReq = Request & { admin?: { id: number; name: string; phone: string; roles: Role[] } };

/** Demo admin login gate. ALWAYS off in Vercel production. On for Vercel preview deployments, or when JOUMEH_ADMIN_DEMO=1 (local). */
export function adminDemoAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL_ENV === 'production') return false;
  return env.VERCEL_ENV === 'preview' || env.JOUMEH_ADMIN_DEMO === '1';
}
export function mountAdmin(app: Express, db: Database, opts: { adminDemo: boolean; now: () => number }) {
  seedAdminBase(db);
  if (opts.adminDemo) seedAdminDemo(db);
  const bad = (res: Response, error: string, fields?: Record<string, string>) => res.status(400).json({ error, fields });
  const audit = (req: AReq, action: string, entity: string, id: unknown, detail?: string) =>
    db.run('INSERT INTO audit_log (admin_id,action,entity,entity_id,detail) VALUES (?,?,?,?,?)', [req.admin?.id ?? null, action, entity, id == null ? null : String(id), detail ?? null]);

  // Public: published content pages for the shop (unpublished → 404, shop keeps its placeholder).
  app.get('/api/content/:slug', (req, res) => {
    const p = one(db, 'SELECT slug,title,body FROM content_pages WHERE slug=? AND published=1', [req.params.slug]);
    if (!p) return res.status(404).json({ error: 'not_found' });
    res.json({ data: p });
  });

  const admin = (mod: Module, need: Level = 'view') => (req: AReq, res: Response, next: NextFunction) => {
    const t = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const s = t && one<{ admin_id: number; last_seen: number }>(db, 'SELECT admin_id,last_seen FROM admin_sessions WHERE token_hash=?', [sha(t)]);
    if (!s) return res.status(401).json({ error: 'unauthorized' });
    if (opts.now() - s.last_seen > ADMIN_IDLE_MINUTES * 60_000) { db.run('DELETE FROM admin_sessions WHERE token_hash=?', [sha(t)]); return res.status(401).json({ error: 'session_expired' }); }
    const a = one<{ id: number; name: string; phone: string; roles: string; status: string }>(db, 'SELECT * FROM admin_users WHERE id=?', [s.admin_id]);
    if (!a || a.status !== 'active') return res.status(401).json({ error: 'unauthorized' });
    db.run('UPDATE admin_sessions SET last_seen=? WHERE token_hash=?', [opts.now(), sha(t)]);
    req.admin = { id: a.id, name: a.name, phone: a.phone, roles: a.roles.split(',') as Role[] };
    if (RANK[levelFor(req.admin.roles, mod)] < RANK[need]) return res.status(403).json({ error: 'forbidden' });
    next();
  };
  const me = (a: NonNullable<AReq['admin']>) => ({ ...a, roleLabels: a.roles.map(r => ROLES[r]),
    permissions: Object.fromEntries((['dashboard', 'products', 'orders', 'customers', 'reviews', 'content', 'settings'] as Module[]).map(m => [m, levelFor(a.roles, m)])) });

  // ---------- Auth: DEMO login (no SMS). Only when adminDemo is on (local); otherwise 404. ----------
  app.post('/api/admin/auth/demo-login', (req: AReq, res) => {
    if (!opts.adminDemo) return res.status(404).json({ error: 'not_found' });
    const phone = toLatin(req.body?.phone);
    if (!PHONE_RE.test(phone)) return bad(res, 'invalid_phone', { phone: 'شماره موبایل معتبر نیست' });
    const a = one<{ id: number; status: string }>(db, 'SELECT id,status FROM admin_users WHERE phone=?', [phone]);
    // Figma 184:44433 / 166:15288: same message whether or not a customer account exists.
    if (!a || a.status !== 'active') return res.status(403).json({ error: 'no_admin_access' });
    const token = randomBytes(24).toString('hex');
    db.run('INSERT INTO admin_sessions (token_hash,admin_id,created_at,last_seen) VALUES (?,?,?,?)', [sha(token), a.id, opts.now(), opts.now()]);
    db.run(`UPDATE admin_users SET last_login=datetime('now') WHERE id=?`, [a.id]);
    req.admin = { id: a.id } as AReq['admin']; audit(req, 'login', 'admin_user', a.id, 'demo login (no SMS)');
    res.json({ data: { token }, demo: true, stubs: { sms: stub('BD-13') } });
  });
  app.get('/api/admin/demo-accounts', (_q, res) => {
    if (!opts.adminDemo) return res.status(404).json({ error: 'not_found' });
    res.json({ data: all<{ phone: string; name: string; roles: string }>(db, `SELECT phone,name,roles FROM admin_users WHERE status='active' ORDER BY id`)
      .map(a => ({ ...a, roleLabels: a.roles.split(',').map(r => ROLES[r as Role]) })) });
  });
  app.get('/api/admin/me', admin('dashboard'), (req: AReq, res) => res.json({ data: me(req.admin!), demo: opts.adminDemo, idleMinutes: ADMIN_IDLE_MINUTES,
    // Sidebar count pill (Figma 175:14193): open orders = pending + processing (definition = placeholder, ADMIN-PH-KPI)
    counts: { openOrders: one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM orders WHERE order_status IN ('pending','processing')`)!.n } }));
  app.post('/api/admin/auth/logout', admin('dashboard'), (req: AReq, res) => {
    db.run('DELETE FROM admin_sessions WHERE token_hash=?', [sha((req.headers.authorization ?? '').slice(7))]); res.status(204).end();
  });

  // ---------- Dashboard ----------
  app.get('/api/admin/dashboard', admin('dashboard'), (_q, res) => {
    const n = (sql: string, p: unknown[] = []) => one<{ n: number }>(db, sql, p)!.n ?? 0;
    const today = `date(created_at)=(SELECT date(MAX(created_at)) FROM orders)`; // demo "today" = latest sample order date
    res.json({ data: {
      salesToday: n(`SELECT COALESCE(SUM(total),0) AS n FROM orders WHERE payment_status='paid' AND ${today}`),
      paidToday: n(`SELECT COUNT(*) AS n FROM orders WHERE payment_status='paid' AND ${today}`),
      ordersToday: n(`SELECT COUNT(*) AS n FROM orders WHERE ${today}`),
      awaitingPayment: n(`SELECT COUNT(*) AS n FROM orders WHERE payment_status='unpaid' AND order_status='pending'`),
      processing: n(`SELECT COUNT(*) AS n FROM orders WHERE order_status='processing'`),
      shipped: n(`SELECT COUNT(*) AS n FROM orders WHERE order_status='shipped'`),
      openReturns: n(`SELECT COUNT(*) AS n FROM returns WHERE status='reviewing'`),
      unavailableVariants: n(`SELECT COUNT(*) AS n FROM variants WHERE available=0`),
      reviews: n(`SELECT COUNT(*) AS n FROM reviews`),
      avgOrder: n(`SELECT COALESCE(CAST(AVG(total) AS INTEGER),0) AS n FROM orders WHERE payment_status='paid'`),
      recentOrders: all(db, `SELECT o.id, o.order_number AS orderNumber, o.order_status AS orderStatus, o.payment_status AS paymentStatus, o.total, o.created_at AS createdAt,
        COALESCE(u.first_name || ' ' || substr(u.last_name,1,1) || '.', 'مهمان') AS customer, (SELECT SUM(quantity) FROM order_items WHERE order_id=o.id) AS items
        FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 5`),
      topProducts: all(db, `SELECT p.name, SUM(oi.quantity) AS sold FROM order_items oi JOIN products p ON p.id=oi.product_id GROUP BY p.id ORDER BY sold DESC, p.id LIMIT 3`),
    }, sampleData: true, stubs: { kpis: stub('ADMIN-PH-KPI'), ...ADMIN_STUBS } });
  });

  // ---------- Products ----------
  const pSql = `SELECT p.id, p.slug, p.name, p.status, p.publish_state AS publishState, p.badge_percent AS badgePercent, p.description, c.id AS categoryId, c.name AS categoryName,
    pr.amount AS price, pr.original_amount AS originalPrice, (SELECT url FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageUrl,
    (SELECT COUNT(*) FROM variants v WHERE v.product_id=p.id) AS variantCount, (SELECT COUNT(*) FROM variants v WHERE v.product_id=p.id AND v.available=0) AS unavailableCount
    FROM products p JOIN prices pr ON pr.product_id=p.id JOIN categories c ON c.id=p.category_id`;
  app.get('/api/admin/products', admin('products'), (req, res) => {
    const { q = '', state = '', category = '' } = req.query as Record<string, string>;
    const page = Math.max(1, Number(req.query.page ?? 1) | 0); const size = 10;
    const w: string[] = []; const p: unknown[] = [];
    if (q) { w.push('(p.name LIKE ? OR p.slug LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
    if (state) { w.push('p.publish_state=?'); p.push(state); }
    if (category) { w.push('c.id=?'); p.push(Number(category)); }
    const ws = w.length ? ' WHERE ' + w.join(' AND ') : '';
    const total = one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM products p JOIN prices pr ON pr.product_id=p.id JOIN categories c ON c.id=p.category_id${ws}`, p)!.n;
    const counts = Object.fromEntries(all<{ s: string; n: number }>(db, 'SELECT publish_state AS s, COUNT(*) AS n FROM products GROUP BY s').map(r => [r.s, r.n]));
    res.json({ data: all(db, `${pSql}${ws} ORDER BY p.id LIMIT ? OFFSET ?`, [...p, size, (page - 1) * size]), page, pageSize: size, total, counts,
      allCount: one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM products')!.n, sampleData: true });
  });
  app.get('/api/admin/products/:id', admin('products'), (req, res) => {
    const p = one(db, pSql + ' WHERE p.id=?', [Number(req.params.id)]);
    if (!p) return res.status(404).json({ error: 'not_found' });
    res.json({ data: { ...p, variants: all(db, 'SELECT id,size,color,color_hex AS colorHex,sku,available FROM variants WHERE product_id=? ORDER BY id', [p.id]),
      images: all(db, 'SELECT url,alt FROM images WHERE product_id=? ORDER BY position', [p.id]) }, stubs: { pricing: stub('BD-10'), stock: stub('BD-16'), media: stub('ADMIN-PH-MEDIA') } });
  });
  const validateProduct = (b: Record<string, unknown>) => {
    const f: Record<string, string> = {};
    const name = String(b.name ?? '').trim(); const slug = String(b.slug ?? '').trim();
    if (!name || name.length > 120) f.name = 'نام محصول الزامی است';
    if (!/^[a-z0-9-]{2,80}$/.test(slug)) f.slug = 'شناسه فقط حروف لاتین کوچک، عدد و خط تیره';
    const price = Number(b.price); if (!Number.isInteger(price) || price <= 0) f.price = 'قیمت معتبر نیست';
    const orig = b.originalPrice == null || b.originalPrice === '' ? null : Number(b.originalPrice);
    if (orig !== null && (!Number.isInteger(orig) || orig <= price)) f.originalPrice = 'قیمت قبل از تخفیف باید بیشتر از قیمت باشد';
    if (!one(db, 'SELECT id FROM categories WHERE id=?', [Number(b.categoryId)])) f.categoryId = 'دسته را انتخاب کنید';
    if (!['default', 'sale', 'new'].includes(String(b.status))) f.status = 'نوع نمایش معتبر نیست';
    return { f, name, slug, price, orig };
  };
  app.post('/api/admin/products', admin('products', 'edit'), (req: AReq, res) => {
    const b = req.body ?? {}; const { f, name, slug, price, orig } = validateProduct(b);
    if (!f.slug && one(db, 'SELECT id FROM products WHERE slug=?', [slug])) f.slug = 'این شناسه قبلاً استفاده شده';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    db.run(`INSERT INTO products (slug,name,category_id,status,description,sort_rank,publish_state,is_sample) VALUES (?,?,?,?,?,999,'draft',1)`, [slug, name, Number(b.categoryId), b.status, String(b.description ?? '')]);
    const id = lastId(db);
    db.run('INSERT INTO prices (product_id,amount,original_amount) VALUES (?,?,?)', [id, price, orig]);
    for (const s of ['S', 'M', 'L']) db.run('INSERT INTO variants (product_id,size,color,color_hex,sku,available) VALUES (?,?,?,?,?,1)', [id, s, 'کرم', '#FDF7DB', `SAMPLE-${id}-NEW-${s}`]);
    audit(req, 'create', 'product', id, name);
    res.status(201).json({ data: one(db, pSql + ' WHERE p.id=?', [id]) });
  });
  app.put('/api/admin/products/:id', admin('products', 'edit'), (req: AReq, res) => {
    const id = Number(req.params.id); if (!one(db, 'SELECT id FROM products WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    const b = req.body ?? {}; const { f, name, slug, price, orig } = validateProduct(b);
    if (!f.slug && one(db, 'SELECT id FROM products WHERE slug=? AND id<>?', [slug, id])) f.slug = 'این شناسه قبلاً استفاده شده';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    db.run('UPDATE products SET name=?,slug=?,category_id=?,status=?,description=? WHERE id=?', [name, slug, Number(b.categoryId), b.status, String(b.description ?? ''), id]);
    db.run('UPDATE prices SET amount=?,original_amount=? WHERE product_id=?', [price, orig, id]);
    if (Array.isArray(b.variants)) for (const v of b.variants as { id: number; available: boolean }[])
      db.run('UPDATE variants SET available=? WHERE id=? AND product_id=?', [v.available ? 1 : 0, Number(v.id), id]);
    audit(req, 'update', 'product', id, name);
    res.json({ data: one(db, pSql + ' WHERE p.id=?', [id]) });
  });
  app.post('/api/admin/products/:id/state', admin('products', 'edit'), (req: AReq, res) => {
    const id = Number(req.params.id); const s = String(req.body?.state);
    if (!['draft', 'published', 'unpublished', 'archived'].includes(s)) return bad(res, 'invalid_state');
    if (!one(db, 'SELECT id FROM products WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    db.run('UPDATE products SET publish_state=? WHERE id=?', [s, id]); audit(req, 'state:' + s, 'product', id);
    res.json({ data: one(db, pSql + ' WHERE p.id=?', [id]) });
  });
  // Categories (BD-18 taxonomy placeholder: rename/create only, no delete).
  app.get('/api/admin/categories', admin('products'), (_q, res) => res.json({ data: all(db, `SELECT c.id,c.slug,c.name,c.parent_id AS parentId,(SELECT name FROM categories x WHERE x.id=c.parent_id) AS parentName,(SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS products FROM categories c ORDER BY COALESCE(c.parent_id,c.id), c.parent_id IS NOT NULL, c.id`), stubs: { taxonomy: stub('BD-18') } }));
  app.post('/api/admin/categories', admin('products', 'edit'), (req: AReq, res) => {
    const name = String(req.body?.name ?? '').trim(); const slug = String(req.body?.slug ?? '').trim();
    if (!name || !/^[a-z0-9-]{2,40}$/.test(slug)) return bad(res, 'validation', { name: name ? '' : 'نام الزامی است', slug: 'شناسه لاتین معتبر نیست' });
    if (one(db, 'SELECT id FROM categories WHERE slug=?', [slug])) return bad(res, 'validation', { slug: 'این شناسه قبلاً استفاده شده' });
    const parentId = req.body?.parentId ? Number(req.body.parentId) : null;
    if (parentId && !one(db, 'SELECT id FROM categories WHERE id=? AND parent_id IS NULL', [parentId])) return bad(res, 'validation', { parentId: 'والد معتبر نیست' }); // one level only (placeholder, BD-18)
    db.run('INSERT INTO categories (slug,name,parent_id) VALUES (?,?,?)', [slug, name, parentId]); const id = lastId(db); audit(req, 'create', 'category', id, name);
    res.status(201).json({ data: one(db, 'SELECT id,slug,name FROM categories WHERE id=?', [id]) });
  });
  app.put('/api/admin/categories/:id', admin('products', 'edit'), (req: AReq, res) => {
    const name = String(req.body?.name ?? '').trim(); const id = Number(req.params.id);
    if (!name) return bad(res, 'validation', { name: 'نام الزامی است' });
    if (!one(db, 'SELECT id FROM categories WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    db.run('UPDATE categories SET name=? WHERE id=?', [name, id]); audit(req, 'rename', 'category', id, name);
    res.json({ data: one(db, 'SELECT id,slug,name FROM categories WHERE id=?', [id]) });
  });

  // ---------- Orders ----------
  const oSql = `SELECT o.id, o.order_number AS orderNumber, o.order_status AS orderStatus, o.payment_status AS paymentStatus, o.fulfilment_status AS fulfilmentStatus,
    o.shipping_method AS shippingMethod, o.shipping_fee AS shippingFee, o.vat_amount AS vatAmount, o.subtotal, o.discount, o.total, o.address_json AS addressJson,
    o.created_at AS createdAt, o.user_id AS userId, u.phone, COALESCE(u.first_name || ' ' || u.last_name, 'مهمان') AS customer,
    (SELECT SUM(quantity) FROM order_items WHERE order_id=o.id) AS items FROM orders o LEFT JOIN users u ON u.id=o.user_id`;
  app.get('/api/admin/orders', admin('orders'), (req, res) => {
    const { q = '', status = '' } = req.query as Record<string, string>;
    const w: string[] = []; const p: unknown[] = [];
    if (status) { w.push('o.order_status=?'); p.push(status); }
    if (q) { w.push(`(o.order_number LIKE ? OR u.phone LIKE ? OR (u.first_name || ' ' || u.last_name) LIKE ?)`); p.push(`%${toLatin(q)}%`, `%${toLatin(q)}%`, `%${q}%`); }
    const ws = w.length ? ' WHERE ' + w.join(' AND ') : '';
    const counts = Object.fromEntries(all<{ s: string; n: number }>(db, 'SELECT order_status AS s, COUNT(*) AS n FROM orders GROUP BY s').map(r => [r.s, r.n]));
    res.json({ data: all<{ addressJson?: string }>(db, `${oSql}${ws} ORDER BY o.created_at DESC`, p).map(({ addressJson: _a, ...r }) => r), counts, transitions: ORDER_TRANSITIONS, sampleData: true });
  });
  const orderDetail = (id: number) => {
    const o = one<Record<string, unknown> & { addressJson: string; orderStatus: string }>(db, oSql + ' WHERE o.id=?', [id]); if (!o) return null;
    const { addressJson, ...rest } = o;
    return { ...rest, address: JSON.parse(addressJson), allowed: ORDER_TRANSITIONS[o.orderStatus] ?? [],
      lines: all(db, `SELECT oi.id, oi.product_id AS productId, oi.name, oi.size, oi.color, oi.unit_price AS unitPrice, oi.quantity, v.sku,
        (SELECT url FROM images i WHERE i.product_id=oi.product_id ORDER BY position LIMIT 1) AS imageUrl FROM order_items oi LEFT JOIN variants v ON v.id=oi.variant_id WHERE oi.order_id=?`, [id]),
      notes: all(db, 'SELECT n.id, n.body, n.created_at AS createdAt, a.name AS author FROM order_notes n LEFT JOIN admin_users a ON a.id=n.admin_id WHERE n.order_id=? ORDER BY n.id DESC', [id]),
      events: all(db, 'SELECT status, actor, created_at AS createdAt FROM order_events WHERE order_id=? ORDER BY id', [id]) };
  };
  app.get('/api/admin/orders/:id', admin('orders'), (req, res) => {
    const o = orderDetail(Number(req.params.id)); if (!o) return res.status(404).json({ error: 'not_found' });
    res.json({ data: o, cancelReasons: CANCEL_REASONS, stubs: { cancellation: stub('BD-05'), shipping: stub('BD-02'), vat: stub('BD-06'), payment: stub('BD-01'), fulfilment: stub('BD-23'), invoice: stub('ADMIN-PH-INVOICE') } });
  });
  app.post('/api/admin/orders/:id/status', admin('orders', 'edit'), (req: AReq, res) => {
    const id = Number(req.params.id); const to = String(req.body?.status ?? ''); const reason = String(req.body?.reason ?? '').trim();
    const o = one<{ order_status: string; payment_status: string }>(db, 'SELECT order_status, payment_status FROM orders WHERE id=?', [id]);
    if (!o) return res.status(404).json({ error: 'not_found' });
    if (!(ORDER_TRANSITIONS[o.order_status] ?? []).includes(to)) return res.status(409).json({ error: 'invalid_transition', from: o.order_status, allowed: ORDER_TRANSITIONS[o.order_status] });
    if (to === 'cancelled' && !reason) return bad(res, 'validation', { reason: 'دلیل لغو الزامی است' });
    const ful = to === 'shipped' ? 'shipped' : to === 'delivered' ? 'delivered' : null;
    db.run('UPDATE orders SET order_status=?, fulfilment_status=COALESCE(?, fulfilment_status) WHERE id=?', [to, ful, id]);
    db.run('INSERT INTO order_events (order_id,status,actor) VALUES (?,?,?)', [id, to, req.admin!.name]);
    if (reason) db.run('INSERT INTO order_notes (order_id,admin_id,body) VALUES (?,?,?)', [id, req.admin!.id, `لغو سفارش: ${reason}`]);
    audit(req, 'status:' + to, 'order', id, reason || undefined);
    // Refund on cancel is NOT automatic: BD-01/BD-05 placeholder.
    res.json({ data: orderDetail(id), stubs: { refund: stub('BD-01'), cancellation: stub('BD-05') } });
  });
  app.post('/api/admin/orders/:id/notes', admin('orders', 'edit'), (req: AReq, res) => {
    const id = Number(req.params.id); const body = String(req.body?.body ?? '').trim();
    if (!one(db, 'SELECT id FROM orders WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    if (!body || body.length > 1000) return bad(res, 'validation', { body: 'یادداشت ۱ تا ۱۰۰۰ کاراکتر' });
    db.run('INSERT INTO order_notes (order_id,admin_id,body) VALUES (?,?,?)', [id, req.admin!.id, body]); audit(req, 'note', 'order', id);
    res.status(201).json({ data: orderDetail(id) });
  });

  // ---------- Customers ----------
  app.get('/api/admin/customers', admin('customers'), (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const w = q ? `WHERE u.phone LIKE ? OR (u.first_name || ' ' || u.last_name) LIKE ?` : ''; const p = q ? [`%${toLatin(q)}%`, `%${q}%`] : [];
    res.json({ data: all(db, `SELECT u.id, u.phone, u.first_name AS firstName, u.last_name AS lastName, u.email, u.created_at AS createdAt,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS orders, (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id=u.id AND o.payment_status='paid') AS spent,
      (SELECT MAX(created_at) FROM orders o WHERE o.user_id=u.id) AS lastOrder FROM users u ${w} ORDER BY u.id`, p), sampleData: true, stubs: { block: stub('ADMIN-PH-PRIVACY'), export: stub('ADMIN-PH-PRIVACY') } });
  });
  app.get('/api/admin/customers/:id', admin('customers'), (req, res) => {
    const id = Number(req.params.id);
    const u = one(db, 'SELECT id, phone, first_name AS firstName, last_name AS lastName, email, created_at AS createdAt FROM users WHERE id=?', [id]);
    if (!u) return res.status(404).json({ error: 'not_found' });
    res.json({ data: { ...u,
      orders: all(db, 'SELECT id, order_number AS orderNumber, order_status AS orderStatus, payment_status AS paymentStatus, total, created_at AS createdAt FROM orders WHERE user_id=? ORDER BY created_at DESC', [id]),
      addresses: all(db, 'SELECT id, recipient, province, city, line, postal_code AS postalCode, is_default AS isDefault FROM addresses WHERE user_id=?', [id]),
      reviews: all(db, 'SELECT r.id, r.rating, r.status, p.name AS product FROM reviews r JOIN products p ON p.id=r.product_id WHERE r.user_id=?', [id]),
      notes: all(db, 'SELECT n.id, n.body, n.created_at AS createdAt, a.name AS author FROM customer_notes n LEFT JOIN admin_users a ON a.id=n.admin_id WHERE n.user_id=? ORDER BY n.id DESC', [id]) },
      stubs: { block: stub('ADMIN-PH-PRIVACY'), export: stub('ADMIN-PH-PRIVACY') } });
  });

  app.post('/api/admin/customers/:id/notes', admin('customers', 'edit'), (req: AReq, res) => {
    const id = Number(req.params.id); const body = String(req.body?.body ?? '').trim();
    if (!one(db, 'SELECT id FROM users WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    if (!body || body.length > 1000) return bad(res, 'validation', { body: 'یادداشت ۱ تا ۱۰۰۰ کاراکتر' });
    db.run('INSERT INTO customer_notes (user_id,admin_id,body) VALUES (?,?,?)', [id, req.admin!.id, body]); audit(req, 'note', 'customer', id);
    res.status(201).json({ data: all(db, 'SELECT n.id, n.body, n.created_at AS createdAt, a.name AS author FROM customer_notes n LEFT JOIN admin_users a ON a.id=n.admin_id WHERE n.user_id=? ORDER BY n.id DESC', [id]) });
  });

  // ---------- Reviews (NO FIGMA DESIGN — admin table pattern, pending design). Moderation policy BD-15 open; shop auto-publishes. ----------
  const rSql = `SELECT r.id, r.rating, r.body, r.status, r.created_at AS createdAt, p.id AS productId, p.name AS product, p.slug,
    (SELECT url FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageUrl, (SELECT MIN(sku) FROM variants v WHERE v.product_id=p.id) AS sku,
    u.id AS userId, COALESCE(u.first_name || ' ' || u.last_name, 'کاربر جومه') AS author, u.phone FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id`;
  app.get('/api/admin/reviews', admin('reviews'), (req, res) => {
    const { q = '', status = '', rating = '', from = '', to = '' } = req.query as Record<string, string>;
    const w: string[] = []; const p: unknown[] = [];
    if (status) { w.push('r.status=?'); p.push(status); }
    if (rating) { w.push('r.rating=?'); p.push(Number(rating)); }
    if (q) { w.push("(p.name LIKE ? OR r.body LIKE ? OR (u.first_name || ' ' || u.last_name) LIKE ?)"); p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { w.push('date(r.created_at)>=?'); p.push(from); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { w.push('date(r.created_at)<=?'); p.push(to); }
    const counts = Object.fromEntries(all<{ s: string; n: number }>(db, 'SELECT status AS s, COUNT(*) AS n FROM reviews GROUP BY s').map(r => [r.s, r.n]));
    res.json({ data: all(db, `${rSql}${w.length ? ' WHERE ' + w.join(' AND ') : ''} ORDER BY r.created_at DESC, r.id DESC`, p), counts, pendingDesign: true, stubs: { moderation: stub('BD-15') } });
  });
  app.post('/api/admin/reviews/:id/status', admin('reviews', 'edit'), (req: AReq, res) => {
    const id = Number(req.params.id); const s = String(req.body?.status);
    if (!['published', 'rejected'].includes(s)) return bad(res, 'invalid_status');
    if (!one(db, 'SELECT id FROM reviews WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    db.run('UPDATE reviews SET status=? WHERE id=?', [s, id]); audit(req, s === 'rejected' ? 'hide' : 'unhide', 'review', id);
    res.json({ data: one(db, rSql + ' WHERE r.id=?', [id]) });
  });
  app.delete('/api/admin/reviews/:id', admin('reviews', 'edit'), (req: AReq, res) => {
    const id = Number(req.params.id); if (!one(db, 'SELECT id FROM reviews WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    db.run('DELETE FROM reviews WHERE id=?', [id]); audit(req, 'delete', 'review', id, 'demo data'); res.status(204).end();
  });

  // ---------- Content ----------
  app.get('/api/admin/content', admin('content'), (_q, res) => {
    const h = one<{ sections_json: string } & Record<string, unknown>>(db, 'SELECT hero_title AS heroTitle, hero_cta AS heroCta, hero_link AS heroLink, hero_alt AS heroAlt, sections_json, updated_at AS updatedAt FROM content_home WHERE id=1')!;
    const { sections_json, ...home } = h;
    res.json({ data: { home: { ...home, sections: JSON.parse(sections_json) }, pages: all(db, 'SELECT slug,title,published,bd,updated_at AS updatedAt FROM content_pages ORDER BY rowid') },
      stubs: { content: stub('BD-14'), heroWiring: stub('ADMIN-PH-HERO') } });
  });
  app.put('/api/admin/content/home', admin('content', 'edit'), (req: AReq, res) => {
    const b = req.body ?? {}; const f: Record<string, string> = {};
    for (const k of ['heroTitle', 'heroCta', 'heroLink', 'heroAlt']) if (!String(b[k] ?? '').trim()) f[k] = 'الزامی است';
    if (!String(b.heroLink ?? '').startsWith('/')) f.heroLink = 'لینک باید با / شروع شود';
    if (!Array.isArray(b.sections)) f.sections = 'invalid';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    db.run(`UPDATE content_home SET hero_title=?,hero_cta=?,hero_link=?,hero_alt=?,sections_json=?,updated_at=datetime('now') WHERE id=1`,
      [b.heroTitle.trim(), b.heroCta.trim(), b.heroLink.trim(), b.heroAlt.trim(), JSON.stringify(b.sections)]);
    audit(req, 'update', 'content', 'home'); res.json({ data: { ok: true } });
  });
  app.get('/api/admin/content/pages/:slug', admin('content'), (req, res) => {
    const p = one(db, 'SELECT slug,title,body,published,bd,updated_at AS updatedAt FROM content_pages WHERE slug=?', [req.params.slug]);
    if (!p) return res.status(404).json({ error: 'not_found' }); res.json({ data: p });
  });
  app.put('/api/admin/content/pages/:slug', admin('content', 'edit'), (req: AReq, res) => {
    const s = req.params.slug; const title = String(req.body?.title ?? '').trim(); const body = String(req.body?.body ?? '').trim();
    if (!one(db, 'SELECT slug FROM content_pages WHERE slug=?', [s])) return res.status(404).json({ error: 'not_found' });
    const f: Record<string, string> = {}; if (!title) f.title = 'عنوان الزامی است'; if (!body || body.length > 20000) f.body = 'متن الزامی است';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    db.run(`UPDATE content_pages SET title=?,body=?,published=?,updated_at=datetime('now') WHERE slug=?`, [title, body, req.body?.published ? 1 : 0, s]);
    audit(req, req.body?.published ? 'publish' : 'save-draft', 'page', s);
    res.json({ data: one(db, 'SELECT slug,title,body,published,bd FROM content_pages WHERE slug=?', [s]) });
  });

  // ---------- Settings: admin users & roles, audit log ----------
  app.get('/api/admin/users', admin('settings'), (_q, res) => res.json({ data: all<{ roles: string }>(db, 'SELECT id,phone,name,roles,status,last_login AS lastLogin FROM admin_users ORDER BY id')
    .map(a => ({ ...a, roles: a.roles.split(','), roleLabels: a.roles.split(',').map(r => ROLES[r as Role]) })), roles: ROLES, permissions: PERMISSIONS, stubs: { roles: stub('BD-19') } }));
  const activeOwners = (exceptId?: number) => all<{ id: number; roles: string }>(db, `SELECT id,roles FROM admin_users WHERE status='active'`).filter(a => a.id !== exceptId && a.roles.split(',').includes('owner')).length;
  const cleanRoles = (r: unknown) => Array.isArray(r) ? [...new Set(r.map(String))].filter(x => x in ROLES) : [];
  app.post('/api/admin/users', admin('settings', 'edit'), (req: AReq, res) => {
    const phone = toLatin(req.body?.phone); const name = String(req.body?.name ?? '').trim(); const roles = cleanRoles(req.body?.roles);
    const f: Record<string, string> = {}; if (!PHONE_RE.test(phone)) f.phone = 'شماره موبایل معتبر نیست'; if (!name) f.name = 'نام الزامی است'; if (!roles.length) f.roles = 'حداقل یک نقش';
    if (!f.phone && one(db, 'SELECT id FROM admin_users WHERE phone=?', [phone])) f.phone = 'این شماره قبلاً دعوت شده';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    // Invite SMS is NOT sent (BD-13). In the demo the invite is accepted by an Owner activating the user.
    db.run(`INSERT INTO admin_users (phone,name,roles,status) VALUES (?,?,?,'invited')`, [phone, name, roles.join(',')]); const id = lastId(db);
    audit(req, 'invite', 'admin_user', id, roles.join(','));
    res.status(201).json({ data: { id }, stubs: { sms: stub('BD-13') } });
  });
  app.put('/api/admin/users/:id', admin('settings', 'edit'), (req: AReq, res) => {
    const id = Number(req.params.id); const a = one<{ id: number; roles: string; status: string }>(db, 'SELECT * FROM admin_users WHERE id=?', [id]);
    if (!a) return res.status(404).json({ error: 'not_found' });
    const roles = req.body?.roles !== undefined ? cleanRoles(req.body.roles) : a.roles.split(',');
    const status = String(req.body?.status ?? a.status);
    if (!roles.length) return bad(res, 'validation', { roles: 'حداقل یک نقش' });
    if (!['active', 'invited', 'inactive'].includes(status)) return bad(res, 'invalid_status');
    const remainsOwner = roles.includes('owner') && status === 'active';
    if (a.roles.split(',').includes('owner') && a.status === 'active' && !remainsOwner && activeOwners(id) === 0)
      return res.status(409).json({ error: 'last_owner' }); // Figma 166:15288: at least one active Owner at all times
    db.run('UPDATE admin_users SET roles=?, status=? WHERE id=?', [roles.join(','), status, id]);
    if (status !== 'active') db.run('DELETE FROM admin_sessions WHERE admin_id=?', [id]); // inactive users lose sessions immediately
    audit(req, 'update', 'admin_user', id, `${roles.join(',')} · ${status}`);
    res.json({ data: { ok: true } });
  });
  app.get('/api/admin/audit', admin('settings'), (_q, res) => res.json({ data: all(db, `SELECT l.id, l.action, l.entity, l.entity_id AS entityId, l.detail, l.created_at AS createdAt, a.name AS actor
    FROM audit_log l LEFT JOIN admin_users a ON a.id=l.admin_id ORDER BY l.id DESC LIMIT 200`) }));
}
