// CLI-002 Joumeh ADMIN (branch admin-v1). Figma: ADMIN — INTERACTIVE PROTOTYPE 304:82401.
// v1 decisions (CEO, 2026-10-26): e-mail + password sign-in; exactly TWO admins with the SAME full access (Owner = Mohadeseh, plus the
// business owner). Every other business rule here is a labelled PLACEHOLDER (BD-xx) until the CEO decides it.
import type { Express, Request, Response, NextFunction } from 'express';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Db } from './db.js';
import express from 'express';
import { stub } from './stubs.js';
import { checkImage, MEDIA_MAX_BYTES, MEDIA_TYPES, type MediaStore } from './media.js';
import { changeStock, deductForShipment, INVENTORY_STUBS, LOW_STOCK_DEFAULT, MOVE_SQL, productStock, seedDemoStock, stockRow, stockRows, STOCK_REASONS, StockError, type AdjustMode } from './inventory.js';

const nextDay = (d: string) => new Date(Date.parse(d + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const toLatin = (s: unknown) => String(s ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s+/g, '');

// ---- v1 access model: two admins, both full access. `role` is a label only (who is the Owner); it never limits access. ----
export const ADMIN_ROLES = { owner: 'مالک (Owner)', admin: 'مدیر فروشگاه' } as const;
export type AdminRole = keyof typeof ADMIN_ROLES;
export const MAX_ADMINS = 2;
export type Module = 'dashboard' | 'products' | 'orders' | 'customers' | 'reviews' | 'content' | 'settings';
export const MODULES: Module[] = ['dashboard', 'products', 'orders', 'customers', 'reviews', 'content', 'settings'];
/** Every admin gets this (the UI still reads a per-module map). */
export const FULL_ACCESS = Object.fromEntries(MODULES.map(m => [m, 'edit'])) as Record<Module, 'edit'>;

// ---- Order transitions: PLACEHOLDER (BD-05 cancellation, BD-23 fulfilment). Uses the existing schema enums only. ----
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [],
};
// ---- Session + login limits: engineering PLACEHOLDERS (Figma 166:15288 "N minutes [BD]"), not business rules. ----
export const ADMIN_IDLE_MINUTES = 60;
export const ADMIN_SESSION_MAX_HOURS = 8;
export const LOGIN_LIMITS = { windowMinutes: 15, perEmail: 5, perIp: 20 };
export const ADMIN_COOKIE = 'joumeh_admin';
/** bcrypt cost. 12 by default; tests lower it with JOUMEH_BCRYPT_COST. */
const bcryptCost = () => Math.min(15, Math.max(4, Number(process.env.JOUMEH_BCRYPT_COST) || 12));
export const hashPassword = (pw: string) => bcrypt.hash(pw, bcryptCost());
/** Password rule for the setup script: engineering PLACEHOLDER (length only). */
export const PASSWORD_MIN = 12;
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

// PREVIEW-ONLY serverless fix: on Vercel each function instance has its own in-memory SQLite, so a session created on one
// instance is unknown to the next. On the in-memory preview the session cookie value is therefore signed:
// `<adminId>.<issuedMs>.<rand>.<hmac>`, and an instance that has never seen it re-creates the session row when the signature is
// valid. With a real shared database (Postgres) sessions are plain random tokens and this path is off.
const DEMO_KEY = process.env.JOUMEH_ADMIN_DEMO_SECRET || process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || randomBytes(16).toString('hex');
const demoMac = (body: string) => createHmac('sha256', DEMO_KEY).update(body).digest('hex');
export const signDemoToken = (adminId: number, issued: number) => { const body = `${adminId}.${issued}.${randomBytes(12).toString('hex')}`; return `${body}.${demoMac(body)}`; };
export function verifyDemoToken(t: string, now: number): { adminId: number; issued: number } | null {
  const m = /^(\d+)\.(\d+)\.([0-9a-f]{24})\.([0-9a-f]{64})$/.exec(t); if (!m) return null;
  const want = Buffer.from(demoMac(`${m[1]}.${m[2]}.${m[3]}`), 'hex'), got = Buffer.from(m[4], 'hex');
  if (!timingSafeEqual(want, got)) return null;
  const issued = Number(m[2]); if (issued > now + 60_000 || now - issued > ADMIN_SESSION_MAX_HOURS * 3_600_000) return null;
  return { adminId: Number(m[1]), issued };
}
// Cancel reasons: SAMPLE list (first item from Figma 180:30099). The real list is a business decision (BD-05).
export const CANCEL_REASONS = ['درخواست مشتری', 'ناموجود بودن کالا', 'پرداخت انجام نشد', 'سایر'];

export const ADMIN_STUBS = { cancellation: stub('BD-05'), fulfilment: stub('BD-23'), payment: stub('BD-01'), shipping: stub('BD-02'),
  vat: stub('BD-06'), pricing: stub('BD-10'), taxonomy: stub('BD-18'), reviews: stub('BD-15'), sms: stub('BD-13'), content: stub('BD-14') };

// PREVIEW-ONLY demo admins (never on production / a real database). Demo e-mails use the reserved .invalid domain.
// Their passwords are NOT in the code: derived per deployment from DEMO_KEY and shown only on the preview login page.
export const DEMO_ADMINS: { email: string; name: string; role: AdminRole }[] = [
  { email: 'owner.demo@joumeh.invalid', name: 'محدثه (Owner · نمونه)', role: 'owner' },
  { email: 'business.demo@joumeh.invalid', name: 'صاحب کسب‌وکار (نمونه)', role: 'admin' },
];
export const demoPassword = (email: string) => `demo-${demoMac(`password:${email}`).slice(0, 12)}`;

const PAGES: [string, string, string][] = [
  ['shipping', 'ارسال و تحویل', 'BD-02/BD-03'], ['returns', 'بازگشت کالا', 'BD-04'], ['story', 'قصه‌ی ما', 'BD-14'],
  ['careers', 'همکاری', 'BD-14'], ['blog', 'وبلاگ', 'BD-14'], ['privacy', 'حریم خصوصی', 'BD-14'], ['terms', 'قوانین و مقررات', 'BD-14'],
];
const PLACEHOLDER_BODY = 'متن نمونه — محتوای نهایی این صفحه پس از تصمیم کسب‌وکار جایگزین می‌شود. (داده نمونه)';

/** Creates one admin account. Enforces the v1 model: at most two admins, at most one Owner, unique e-mail. */
export async function createAdmin(db: Db, a: { email: string; name: string; password: string; role: AdminRole; isDemo?: boolean }): Promise<number> {
  const email = a.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error('invalid_email');
  if (!a.name.trim()) throw new Error('invalid_name');
  if (!(a.role in ADMIN_ROLES)) throw new Error('invalid_role');
  const hash = await hashPassword(a.password); // outside the transaction (bcrypt yields to the event loop)
  return db.tx(async t => {
    const rows = await t.all<{ email: string; role: string }>('SELECT email, role FROM admin_users');
    if (rows.length >= MAX_ADMINS) throw new Error('admin_limit');
    if (rows.some(r => r.email === email)) throw new Error('email_exists');
    if (a.role === 'owner' && rows.some(r => r.role === 'owner')) throw new Error('owner_exists');
    return t.insert('INSERT INTO admin_users (email,name,password_hash,role,status,is_demo) VALUES (?,?,?,?,?,?)',
      [email, a.name.trim(), hash, a.role, 'active', a.isDemo ? 1 : 0]);
  });
}

/** Content rows (base data, every environment). Content pages start unpublished, so the shop keeps its current placeholders. */
export async function seedAdminBase(db: Db) {
  if (await db.one('SELECT 1 AS x FROM content_home WHERE id=1')) return;
  for (const [i, [slug, title, bd]] of PAGES.entries()) await db.run('INSERT INTO content_pages (slug,title,body,published,bd,position) VALUES (?,?,?,0,?,?)', [slug, title, PLACEHOLDER_BODY, bd, i]);
  await db.run(`INSERT INTO content_home (id,hero_title,hero_cta,hero_link,hero_alt,sections_json) VALUES (1,'کالکشن پاییزه جومه','مشاهده کالکشن','/women','مدل با مانتو کتان کرم در فضای کویری (نمونه)',?)`,
    [JSON.stringify([{ key: 'newest', title: 'جدیدترین‌ها', visible: true }, { key: 'categories', title: 'دسته‌بندی‌های ویژه (زنانه / مردانه)', visible: true }, { key: 'bestsellers', title: 'پرفروش‌ها', visible: true }])]);
}

/** PREVIEW-ONLY: the two demo admins plus extra SAMPLE customers, orders and reviews (keeps the shop's own seed and tests unchanged). */
export async function seedAdminDemo(db: Db) {
  for (const d of DEMO_ADMINS)
    if (!(await db.one('SELECT id FROM admin_users WHERE email=?', [d.email]))) await createAdmin(db, { ...d, password: demoPassword(d.email), isDemo: true });
  if (await db.one(`SELECT 1 AS x FROM users WHERE phone='09121110001'`)) return;
  const people: [string, string, string][] = [['09121110001', 'نگار', 'رضایی'], ['09121110002', 'مریم', 'کریمی'], ['09121110003', 'علی', 'حسینی'], ['09121110004', 'الهام', 'سعیدی'], ['09121110005', 'رضا', 'محمدی']];
  const ids: number[] = [];
  for (const [ph, f, l] of people) ids.push(await db.insert('INSERT INTO users (phone,first_name,last_name) VALUES (?,?,?)', [ph, f, l]));
  const addr = (n: string, ph: string) => JSON.stringify({ recipient: n, phone: ph, province: 'یزد', city: 'یزد', line: 'خیابان نمونه، پلاک ۱۲ (داده نمونه)', postalCode: '8915600000' });
  const orders: [number, number, string, string, string, string, [number, number][]][] = [
    [10123, 0, 'processing', 'paid', 'unfulfilled', '2026-10-22 09:50:00', [[2, 1]]],
    [10122, 1, 'pending', 'unpaid', 'unfulfilled', '2026-10-22 09:12:00', [[3, 1], [6, 2]]],
    [10121, 2, 'cancelled', 'failed', 'unfulfilled', '2026-10-21 18:30:00', [[28, 1]]],
    [10120, 3, 'shipped', 'paid', 'shipped', '2026-10-21 11:05:00', [[7, 1], [9, 1]]],
    [10119, 4, 'delivered', 'paid', 'delivered', '2026-10-18 16:40:00', [[29, 2]]],
  ];
  type Line = { q: number; v: { pid: number; name: string; a: number; o: number | null; id: number; size: string; color: string } };
  for (const [oid, who, os, ps, fs, at, items] of orders) {
    // admin-v1: only lines whose product has a price and a variant (the real catalogue may have neither); skip an order with no usable line.
    const lines: Line[] = [];
    for (const [pid, q] of items) {
      const v = await db.one<Line['v']>(`SELECT p.id AS pid, p.name, pr.amount AS a, pr.original_amount AS o, v.id, v.size, v.color FROM products p JOIN prices pr ON pr.product_id=p.id JOIN variants v ON v.product_id=p.id WHERE p.id=? ORDER BY v.size<>'S', v.id LIMIT 1`, [pid]);
      if (v) lines.push({ q, v });
    }
    if (!lines.length) continue;
    let sub = 0, disc = 0;
    for (const { q, v } of lines) { sub += (v.o ?? v.a) * q; disc += ((v.o ?? v.a) - v.a) * q; }
    const [ph, f, l] = people[who];
    await db.run(`INSERT INTO orders (id,user_id,order_number,order_status,payment_status,fulfilment_status,subtotal,discount,total,address_json,is_sample,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)`,
      [oid, ids[who], String(oid), os, ps, fs, sub, disc, sub - disc, addr(`${f} ${l}`, ph), at]);
    for (const { q, v } of lines)
      await db.run('INSERT INTO order_items (order_id,product_id,variant_id,name,size,color,unit_price,quantity) VALUES (?,?,?,?,?,?,?,?)', [oid, v.pid, v.id, v.name, v.size, v.color, v.a, q]);
    await db.run('INSERT INTO order_events (order_id,status,actor,created_at) VALUES (?,?,?,?)', [oid, 'placed', 'مشتری', at]);
  }
  if (await db.one('SELECT 1 AS x FROM orders WHERE id=10124')) // the shop's sample order exists only in the test fixture
    await db.run(`INSERT INTO order_events (order_id,status,actor,created_at) VALUES (10124,'placed','مشتری','2026-10-04 12:00:00'),(10124,'processing','مدیر فروشگاه','2026-10-04 12:24:00')`);
  // admin-v1: draft / unpublished examples are EXTRA demo-only products (never the real catalogue), so the preview shop shows exactly what production shows.
  // No price row (NULL price), one sample variant: shows the admin's «بدون قیمت» handling.
  const demoProducts: [string, string, string][] = [['admin-demo-draft-1', 'پیش‌نویس نمونه ۱ (فقط پنل)', 'draft'], ['admin-demo-draft-2', 'پیش‌نویس نمونه ۲ (فقط پنل)', 'draft'], ['admin-demo-unpublished', 'محصول متوقف‌شده‌ی نمونه (فقط پنل)', 'unpublished']];
  const dp: number[] = [];
  for (const [slug, name, st] of demoProducts) {
    const id = await db.insert(`INSERT INTO products (slug,name,category_id,status,description,sort_rank,publish_state,is_sample) VALUES (?,?,1,'default','داده نمونه‌ی پنل مدیریت؛ در فروشگاه دیده نمی‌شود.',999,?,1)`, [slug, name, st]);
    await db.run(`INSERT INTO variants (product_id,size,color,color_hex,sku,available) VALUES (?,'S','کرم','#FDF7DB',?,1)`, [id, `SAMPLE-${slug.toUpperCase()}-S`]);
    dp.push(id);
  }
  // admin-v1: demo reviews sit on the demo-only products too, so real product pages on the preview match production.
  const [d1, d2, u1] = dp;
  const revs: [number, number, number, string, string][] = [
    [d1, ids[0], 5, 'جنس پارچه خیلی خوب بود و سایز دقیق. (داده نمونه)', 'published'],
    [d1, ids[1], 4, 'رنگش کمی روشن‌تر از عکس بود. (داده نمونه)', 'published'],
    [d2, ids[2], 2, 'دیر رسید ولی کیفیت قابل قبول. (داده نمونه)', 'published'],
    [u1, ids[3], 5, 'عالی، دوباره خرید می‌کنم. (داده نمونه)', 'published'],
    [d2, ids[4], 1, 'متن نمونه‌ی نامناسب که پنهان شده است. (داده نمونه)', 'rejected'],
  ];
  for (const r of revs) await db.run('INSERT INTO reviews (product_id,user_id,rating,body,status) VALUES (?,?,?,?,?)', r);
  await db.syncIds(); // explicit order ids above
}

type Admin = { id: number; name: string; email: string; role: AdminRole };
type AReq = Request & { admin?: Admin; adminToken?: string };

/** Demo admin gate. ALWAYS off in Vercel production. On for Vercel preview deployments, or when JOUMEH_ADMIN_DEMO=1 (local). */
export function adminDemoAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL_ENV === 'production') return false;
  return env.VERCEL_ENV === 'preview' || env.JOUMEH_ADMIN_DEMO === '1';
}
const readCookie = (req: Request, name: string) => {
  for (const part of String(req.headers.cookie ?? '').split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim()); }
  return '';
};
const isLoopback = (req: Request) => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(String(req.headers.host ?? ''));
const clientIp = (req: Request) => String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
let dummyHash: Promise<string> | null = null; // equal work for unknown e-mails (no account enumeration by timing)

/** Registers the admin API. Returns a promise for the start-up seed (awaited by createApp before any request). */
export function mountAdmin(app: Express, db: Db, opts: { adminDemo: boolean; now: () => number; media: MediaStore }): Promise<void> {
  // Demo admins + sample orders go ONLY into a throwaway database (never into DATABASE_URL, even on a preview).
  const ready = (async () => { await seedAdminBase(db); if (opts.adminDemo && db.ephemeral) { await seedAdminDemo(db); await seedDemoStock(db); } })();
  const signed = opts.adminDemo && db.dialect === 'sqlite'; // per-instance in-memory preview only
  const bad = (res: Response, error: string, fields?: Record<string, string>) => res.status(400).json({ error, fields });
  const audit = (req: AReq, action: string, entity: string, id: unknown, detail?: string) =>
    db.run('INSERT INTO audit_log (admin_id,action,entity,entity_id,detail) VALUES (?,?,?,?,?)', [req.admin?.id ?? null, action, entity, id == null ? null : String(id), detail ?? null]);
  const setCookie = (req: Request, res: Response, value: string, maxAgeSec: number) =>
    res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${encodeURIComponent(value)}; HttpOnly;${isLoopback(req) ? '' : ' Secure;'} SameSite=Strict; Path=/api/admin; Max-Age=${maxAgeSec}`);

  // Public: published content pages for the shop (unpublished → 404, shop keeps its placeholder).
  app.get('/api/content/:slug', async (req, res) => {
    const p = await db.one('SELECT slug,title,body FROM content_pages WHERE slug=? AND published=1', [req.params.slug]);
    if (!p) return res.status(404).json({ error: 'not_found' });
    res.json({ data: p });
  });

  // Public: product images stored by the MediaStore (memory/disk/S3 drivers). Keys are random, immutable → long cache.
  app.get('/api/media/*', async (req, res) => {
    const key = String((req.params as Record<string, string>)[0] ?? '');
    let o; try { o = await opts.media.get(key); } catch { o = null; }
    if (!o) return res.status(404).json({ error: 'not_found' });
    res.setHeader('Content-Type', o.mime); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(o.data);
  });
  // CSRF: the cookie is SameSite=Strict; additionally a state-changing admin request from another origin is refused.
  app.use('/api/admin', (req, res, next) => {
    const origin = req.headers.origin;
    if (req.method !== 'GET' && req.method !== 'HEAD' && origin) {
      let host = ''; try { host = new URL(String(origin)).host; } catch { /* malformed */ }
      if (host !== req.headers.host) return res.status(403).json({ error: 'bad_origin' });
    }
    next();
  });

  const revoked = new Set<string>(); // logged-out / expired signed tokens are never re-created on this instance
  /** Resolves the admin from the session cookie; returns an error code (and never writes a response) when there is no valid session. */
  const authenticate = async (req: AReq, res: Response): Promise<string | null> => {
    const t = readCookie(req, ADMIN_COOKIE); const h = t ? sha(t) : '';
    let s = t ? await db.one<{ admin_id: number; created_at: number; last_seen: number }>('SELECT admin_id,created_at,last_seen FROM admin_sessions WHERE token_hash=?', [h]) : undefined;
    if (!s && t && signed && !revoked.has(h)) { // preview only: cookie signed by another serverless instance → re-create the session here
      const v = verifyDemoToken(t, opts.now());
      if (v && await db.one('SELECT id FROM admin_users WHERE id=?', [v.adminId])) {
        await db.run('INSERT OR IGNORE INTO admin_sessions (token_hash,admin_id,created_at,last_seen) VALUES (?,?,?,?)', [h, v.adminId, v.issued, opts.now()]);
        s = { admin_id: v.adminId, created_at: v.issued, last_seen: opts.now() };
      }
    }
    if (!s) return 'unauthorized';
    if (opts.now() - s.last_seen > ADMIN_IDLE_MINUTES * 60_000 || opts.now() - s.created_at > ADMIN_SESSION_MAX_HOURS * 3_600_000) {
      revoked.add(h); await db.run('DELETE FROM admin_sessions WHERE token_hash=?', [h]); setCookie(req, res, '', 0);
      return 'session_expired';
    }
    const a = await db.one<Admin & { status: string }>('SELECT id,name,email,role,status FROM admin_users WHERE id=?', [s.admin_id]);
    if (!a || a.status !== 'active') return 'unauthorized';
    await db.run('UPDATE admin_sessions SET last_seen=? WHERE token_hash=?', [opts.now(), h]);
    req.admin = { id: a.id, name: a.name, email: a.email, role: a.role }; req.adminToken = t;
    return null;
  };
  const requireAdmin = async (req: AReq, res: Response, next: NextFunction) => {
    const e = await authenticate(req, res); if (e) return res.status(401).json({ error: e });
    next();
  };
  const me = (a: Admin) => ({ ...a, roleLabel: ADMIN_ROLES[a.role], roles: [a.role], roleLabels: [ADMIN_ROLES[a.role]], permissions: FULL_ACCESS });

  // ---------- Auth: e-mail + password (v1). Rate limited per e-mail and per IP; failures look identical. ----------
  app.post('/api/admin/auth/login', async (req: AReq, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase(); const password = String(req.body?.password ?? '');
    if (!EMAIL_RE.test(email) || !password || password.length > 200) return bad(res, 'validation', { ...(EMAIL_RE.test(email) ? {} : { email: 'ایمیل معتبر نیست' }), ...(password ? {} : { password: 'رمز عبور را وارد کنید' }) });
    const ip = clientIp(req); const since = opts.now() - LOGIN_LIMITS.windowMinutes * 60_000;
    const fails = async (col: 'email' | 'ip', v: string) => (await db.one<{ n: number }>(`SELECT COUNT(*) AS n FROM admin_login_attempts WHERE ${col}=? AND ok=0 AND at>?`, [v, since]))!.n;
    if (await fails('email', email) >= LOGIN_LIMITS.perEmail || await fails('ip', ip) >= LOGIN_LIMITS.perIp)
      return res.status(429).json({ error: 'rate_limited', retryAfterMinutes: LOGIN_LIMITS.windowMinutes });
    const a = await db.one<{ id: number; password_hash: string; status: string }>('SELECT id,password_hash,status FROM admin_users WHERE email=?', [email]);
    dummyHash ??= bcrypt.hash('not-a-password', bcryptCost());
    const ok = await bcrypt.compare(password, a?.password_hash ?? await dummyHash) && !!a && a.status === 'active';
    await db.run('INSERT INTO admin_login_attempts (email,ip,ok,at) VALUES (?,?,?,?)', [email, ip, ok ? 1 : 0, opts.now()]);
    if (!ok || !a) return res.status(401).json({ error: 'invalid_credentials' });
    const token = signed ? signDemoToken(a.id, opts.now()) : randomBytes(32).toString('hex');
    await db.run('INSERT INTO admin_sessions (token_hash,admin_id,created_at,last_seen) VALUES (?,?,?,?)', [sha(token), a.id, opts.now(), opts.now()]);
    await db.run(`UPDATE admin_users SET last_login=datetime('now') WHERE id=?`, [a.id]);
    req.admin = { id: a.id } as Admin; await audit(req, 'login', 'admin_user', a.id);
    setCookie(req, res, token, ADMIN_SESSION_MAX_HOURS * 3600);
    res.json({ data: { ok: true }, demo: opts.adminDemo });
  });
  // PREVIEW ONLY: the demo accounts shown on the login page. 404 everywhere else (production, real database).
  app.get('/api/admin/demo-accounts', async (_q, res) => {
    if (!opts.adminDemo) return res.status(404).json({ error: 'not_found' });
    res.json({ data: (await db.all<{ email: string; name: string; role: AdminRole }>(`SELECT email,name,role FROM admin_users WHERE is_demo=1 AND status='active' ORDER BY id`))
      .map(a => ({ ...a, roleLabel: ADMIN_ROLES[a.role], password: demoPassword(a.email) })), demo: true });
  });
  app.get('/api/admin/me', requireAdmin, async (req: AReq, res) => res.json({ data: me(req.admin!), demo: opts.adminDemo, idleMinutes: ADMIN_IDLE_MINUTES,
    // Sidebar count pill (Figma 175:14193): open orders = pending + processing (definition = placeholder, ADMIN-PH-KPI)
    counts: { openOrders: (await db.one<{ n: number }>(`SELECT COUNT(*) AS n FROM orders WHERE order_status IN ('pending','processing')`))!.n } }));
  // Pre-login session check (AdminApp start-up): always 200 so the browser console shows no 401 before sign-in. data=null → show the login page.
  app.get('/api/admin/auth/session', async (req: AReq, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const e = await authenticate(req, res);
    res.json({ data: e ? null : me(req.admin!), expired: e === 'session_expired', demo: opts.adminDemo, idleMinutes: ADMIN_IDLE_MINUTES });
  });
  app.post('/api/admin/auth/logout', requireAdmin, async (req: AReq, res) => {
    const h = sha(req.adminToken!); revoked.add(h); await db.run('DELETE FROM admin_sessions WHERE token_hash=?', [h]); setCookie(req, res, '', 0); res.status(204).end();
  });


  // ---------- Dashboard ----------
  app.get('/api/admin/dashboard', requireAdmin, async (_q, res) => {
    const n = async (sql: string, p: unknown[] = []) => (await db.one<{ n: number }>(sql, p))!.n ?? 0;
    const today = `substr(created_at,1,10)=(SELECT substr(MAX(created_at),1,10) FROM orders)`; // demo "today" = latest sample order date
    res.json({ data: {
      salesToday: await n(`SELECT COALESCE(SUM(total),0) AS n FROM orders WHERE payment_status='paid' AND ${today}`),
      paidToday: await n(`SELECT COUNT(*) AS n FROM orders WHERE payment_status='paid' AND ${today}`),
      ordersToday: await n(`SELECT COUNT(*) AS n FROM orders WHERE ${today}`),
      awaitingPayment: await n(`SELECT COUNT(*) AS n FROM orders WHERE payment_status='unpaid' AND order_status='pending'`),
      processing: await n(`SELECT COUNT(*) AS n FROM orders WHERE order_status='processing'`),
      shipped: await n(`SELECT COUNT(*) AS n FROM orders WHERE order_status='shipped'`),
      openReturns: await n(`SELECT COUNT(*) AS n FROM returns WHERE status='reviewing'`),
      unavailableVariants: await n(`SELECT COUNT(*) AS n FROM variants WHERE available=0`),
      ...await (async () => { const rows = (await stockRows(db, "p.publish_state<>'archived'")); return {
        lowStock: rows.filter(r => r.status === 'low').length, outOfStock: rows.filter(r => r.status === 'out').length, oversold: rows.filter(r => r.status === 'oversold').length,
        lowStockItems: rows.filter(r => r.status === 'low' || r.status === 'out' || r.status === 'oversold').sort((a, b) => (a.available ?? 0) - (b.available ?? 0)).slice(0, 4) }; })(),
      reviews: await n(`SELECT COUNT(*) AS n FROM reviews`),
      avgOrder: Math.trunc(Number(await n(`SELECT COALESCE(AVG(total),0) AS n FROM orders WHERE payment_status='paid'`))),
      recentOrders: await db.all(`SELECT o.id, o.order_number AS orderNumber, o.order_status AS orderStatus, o.payment_status AS paymentStatus, o.total, o.created_at AS createdAt,
        COALESCE(u.first_name || ' ' || substr(u.last_name,1,1) || '.', 'مهمان') AS customer, (SELECT SUM(quantity) FROM order_items WHERE order_id=o.id) AS items
        FROM orders o LEFT JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 5`),
      topProducts: await db.all(`SELECT p.name, SUM(oi.quantity) AS sold FROM order_items oi JOIN products p ON p.id=oi.product_id GROUP BY p.id ORDER BY sold DESC, p.id LIMIT 3`),
    }, sampleData: true, stubs: { kpis: stub('ADMIN-PH-KPI'), lowStock: stub('ADMIN-PH-LOWSTOCK'), ...ADMIN_STUBS } });
  });

  // ---------- Products ----------
  const pSql = `SELECT p.id, p.slug, p.name, p.status, p.publish_state AS publishState, p.badge_percent AS badgePercent, p.description, c.id AS categoryId, c.name AS categoryName,
    pr.amount AS price, pr.original_amount AS originalPrice, (SELECT url FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageUrl,
    (SELECT COUNT(*) FROM variants v WHERE v.product_id=p.id) AS variantCount, (SELECT COUNT(*) FROM variants v WHERE v.product_id=p.id AND v.available=0) AS unavailableCount
    FROM products p LEFT JOIN prices pr ON pr.product_id=p.id JOIN categories c ON c.id=p.category_id`; // admin-v1: LEFT JOIN, real-catalogue products may have no price yet (NULL)
  app.get('/api/admin/products', requireAdmin, async (req, res) => {
    const { q = '', state = '', category = '' } = req.query as Record<string, string>;
    const page = Math.max(1, Number(req.query.page ?? 1) | 0); const size = 10;
    const w: string[] = []; const p: unknown[] = [];
    if (q) { w.push('(p.name LIKE ? OR p.slug LIKE ?)'); p.push(`%${q}%`, `%${q}%`); }
    if (state) { w.push('p.publish_state=?'); p.push(state); }
    if (category) { w.push('(c.id=? OR c.parent_id=?)'); p.push(Number(category), Number(category)); }
    // «تاریخ ایجاد» range from the Jalali Date Picker (sent as Gregorian YYYY-MM-DD, Tehran days → UTC bounds are close enough for a filter)
    const { from = '', to = '' } = req.query as Record<string, string>;
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { w.push('p.created_at>=?'); p.push(from); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { w.push('p.created_at<?'); p.push(nextDay(to)); }
    const ws = w.length ? ' WHERE ' + w.join(' AND ') : '';
    const total = (await db.one<{ n: number }>(`SELECT COUNT(*) AS n FROM products p LEFT JOIN prices pr ON pr.product_id=p.id JOIN categories c ON c.id=p.category_id${ws}`, p))!.n;
    const counts = Object.fromEntries((await db.all<{ s: string; n: number }>('SELECT publish_state AS s, COUNT(*) AS n FROM products GROUP BY s')).map(r => [r.s, r.n]));
    const rows = await db.all<{ id: number }>(`${pSql}${ws} ORDER BY p.id LIMIT ? OFFSET ?`, [...p, size, (page - 1) * size]);
    const st = await productStock(db, rows.map(r => r.id));
    res.json({ data: rows.map(r => ({ ...r, stock: st[r.id] ?? null })), page, pageSize: size, total, counts,
      allCount: (await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM products'))!.n, sampleData: true });
  });
  app.get('/api/admin/products/:id', requireAdmin, async (req, res) => {
    const p = await db.one(pSql + ' WHERE p.id=?', [Number(req.params.id)]);
    if (!p) return res.status(404).json({ error: 'not_found' });
    const stock = Object.fromEntries((await stockRows(db, 'v.product_id=?', [p.id])).map(r => [r.variantId, r]));
    res.json({ data: { ...p, variants: (await db.all<{ id: number }>('SELECT id,size,color,color_hex AS colorHex,sku,available FROM variants WHERE product_id=? ORDER BY id', [p.id]))
        .map(v => ({ ...v, onHand: stock[v.id]?.onHand ?? null, allocated: stock[v.id]?.allocated ?? 0, stockAvailable: stock[v.id]?.available ?? null, stockStatus: stock[v.id]?.status ?? 'untracked', threshold: stock[v.id]?.threshold ?? LOW_STOCK_DEFAULT })),
      images: await db.all('SELECT id,url,alt,mime,bytes,position FROM images WHERE product_id=? ORDER BY position, id', [p.id]) },
      media: { maxBytes: MEDIA_MAX_BYTES, types: Object.keys(MEDIA_TYPES), driver: opts.media.driver },
      stubs: { pricing: stub('BD-10'), stock: stub('BD-16'), media: stub('ADMIN-PH-MEDIA'), sku: stub('ADMIN-PH-SKU'), publishRules: stub('ADMIN-PH-PUBLISH-RULES'), ...INVENTORY_STUBS } });
  });
  const validateProduct = async (b: Record<string, unknown>) => {
    const f: Record<string, string> = {};
    const name = String(b.name ?? '').trim(); const slug = String(b.slug ?? '').trim();
    if (!name) f.name = 'نام محصول الزامی است'; else if (name.length > 120) f.name = 'نام محصول حداکثر ۱۲۰ کاراکتر';
    if (!slug) f.slug = 'شناسه (نشانی صفحه) الزامی است'; else if (!/^[a-z0-9-]{2,80}$/.test(slug)) f.slug = 'شناسه فقط حروف لاتین کوچک، عدد و خط تیره (۲ تا ۸۰ کاراکتر)';
    if (String(b.description ?? '').length > 5000) f.description = 'توضیحات حداکثر ۵۰۰۰ کاراکتر';
    // admin-v1 (catalog-real): price may be left empty = no price yet (NULL; the shop shows «قیمت به‌زودی / تماس بگیرید» and the product can't be bought).
    const price = b.price == null || b.price === '' ? null : Number(b.price); if (price !== null && (!Number.isInteger(price) || price <= 0)) f.price = 'قیمت باید عدد صحیح بیشتر از صفر (تومان) باشد';
    const orig = b.originalPrice == null || b.originalPrice === '' ? null : Number(b.originalPrice);
    if (orig !== null && price === null) f.originalPrice = 'بدون قیمت، قیمت قبل از تخفیف معنی ندارد';
    else if (orig !== null && (!Number.isInteger(orig) || orig <= (price as number))) f.originalPrice = 'قیمت قبل از تخفیف باید بیشتر از قیمت باشد';
    if (!await db.one('SELECT id FROM categories WHERE id=?', [Number(b.categoryId)])) f.categoryId = 'دسته را انتخاب کنید';
    if (!['default', 'sale', 'new'].includes(String(b.status))) f.status = 'نوع نمایش معتبر نیست';
    return { f, name, slug, price, orig };
  };
  // prices keeps amount NOT NULL: no price = no row (same rule as db/seed.ts). Upsert, so a never-priced product can get its first price.
  const savePrice = async (id: number, price: number | null, orig: number | null) => {
    if (price === null) await db.run('DELETE FROM prices WHERE product_id=?', [id]);
    else await db.run('INSERT INTO prices (product_id,amount,original_amount) VALUES (?,?,?) ON CONFLICT(product_id) DO UPDATE SET amount=excluded.amount, original_amount=excluded.original_amount', [id, price, orig]);
  };
  app.post('/api/admin/products', requireAdmin, async (req: AReq, res) => {
    const b = req.body ?? {}; const { f, name, slug, price, orig } = await validateProduct(b);
    if (!f.slug && await db.one('SELECT id FROM products WHERE slug=?', [slug])) f.slug = 'این شناسه قبلاً استفاده شده';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    const id = await db.insert(`INSERT INTO products (slug,name,category_id,status,description,sort_rank,publish_state,is_sample) VALUES (?,?,?,?,?,999,'draft',1)`, [slug, name, Number(b.categoryId), b.status, String(b.description ?? '')]);
    await savePrice(id, price, orig);
    for (const s of ['S', 'M', 'L']) await db.run('INSERT INTO variants (product_id,size,color,color_hex,sku,available) VALUES (?,?,?,?,?,1)', [id, s, 'کرم', '#FDF7DB', `SAMPLE-${id}-NEW-${s}`]);
    await audit(req, 'create', 'product', id, name);
    res.status(201).json({ data: await db.one(pSql + ' WHERE p.id=?', [id]) });
  });
  app.put('/api/admin/products/:id', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); if (!await db.one('SELECT id FROM products WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    const b = req.body ?? {}; const { f, name, slug, price, orig } = await validateProduct(b);
    if (!f.slug && await db.one('SELECT id FROM products WHERE slug=? AND id<>?', [slug, id])) f.slug = 'این شناسه قبلاً استفاده شده';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    await db.run('UPDATE products SET name=?,slug=?,category_id=?,status=?,description=? WHERE id=?', [name, slug, Number(b.categoryId), b.status, String(b.description ?? ''), id]);
    await savePrice(id, price, orig);
    if (Array.isArray(b.variants)) for (const v of b.variants as { id: number; available: boolean }[])
      // tracked variants follow their stock (inventory); the manual flag is only for variants whose stock is not recorded yet
      await db.run('UPDATE variants SET available=? WHERE id=? AND product_id=? AND on_hand IS NULL', [v.available ? 1 : 0, Number(v.id), id]);
    await audit(req, 'update', 'product', id, name);
    res.json({ data: await db.one(pSql + ' WHERE p.id=?', [id]) });
  });
  app.post('/api/admin/products/:id/state', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); const s = String(req.body?.state);
    if (!['draft', 'published', 'unpublished', 'archived'].includes(s)) return bad(res, 'invalid_state');
    if (!await db.one('SELECT id FROM products WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    await db.run('UPDATE products SET publish_state=? WHERE id=?', [s, id]); await audit(req, 'state:' + s, 'product', id);
    res.json({ data: await db.one(pSql + ' WHERE p.id=?', [id]) });
  });

  // ---------- Product images (Figma 178:18759 «تصاویر»): upload through the MediaStore adapter, alt text REQUIRED. No hard delete of products. ----------
  // Raw body (not multipart): the browser sends the File itself; ?alt= carries the alt text. Type is checked by magic bytes, not by the header.
  const rawImage = express.raw({ type: () => true, limit: MEDIA_MAX_BYTES + 1024 });
  const imgBody = (req: Request, res: Response, next: NextFunction) => rawImage(req, res, (err?: { type?: string }) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'file_too_large', fields: { file: 'حجم تصویر باید حداکثر ۵ مگابایت باشد' } });
    if (err) return next(err); next();
  });
  const imgList = (id: number) => db.all('SELECT id,url,alt,mime,bytes,position FROM images WHERE product_id=? ORDER BY position, id', [id]);
  const cleanAlt = (v: unknown) => String(v ?? '').trim();
  const altErr = (alt: string) => !alt ? 'متن جایگزین (alt) الزامی است' : alt.length > 200 ? 'متن جایگزین حداکثر ۲۰۰ کاراکتر' : null;
  app.post('/api/admin/products/:id/images', requireAdmin, imgBody, async (req: AReq, res) => {
    const id = Number(req.params.id); if (!await db.one('SELECT id FROM products WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    const alt = cleanAlt(req.query.alt); const ae = altErr(alt);
    const c = checkImage(Buffer.isBuffer(req.body) ? req.body : undefined);
    const fields: Record<string, string> = {}; if (ae) fields.alt = ae; if ('error' in c) fields.file = c.message;
    if (Object.keys(fields).length) return res.status('error' in c && c.error === 'file_too_large' ? 413 : 400).json({ error: 'validation', fields });
    const mime = (c as { mime: keyof typeof MEDIA_TYPES }).mime;
    const key = `products/${id}/${randomBytes(9).toString('hex')}.${MEDIA_TYPES[mime]}`;
    await opts.media.put(key, req.body as Buffer, mime);
    const pos = (await db.one<{ n: number }>('SELECT COALESCE(MAX(position),-1)+1 AS n FROM images WHERE product_id=?', [id]))!.n;
    const imgId = await db.insert('INSERT INTO images (product_id,url,alt,position,storage_key,mime,bytes) VALUES (?,?,?,?,?,?,?)', [id, opts.media.url(key), alt, pos, key, mime, (req.body as Buffer).length]);
    await audit(req, 'image:upload', 'product', id, `image ${imgId} (${mime}, ${(req.body as Buffer).length} B)`);
    res.status(201).json({ data: await imgList(id) });
  });
  app.put('/api/admin/products/:id/images/:imageId', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); const imageId = Number(req.params.imageId);
    if (!await db.one('SELECT id FROM images WHERE id=? AND product_id=?', [imageId, id])) return res.status(404).json({ error: 'not_found' });
    if (req.body?.alt !== undefined) { const alt = cleanAlt(req.body.alt); const ae = altErr(alt); if (ae) return bad(res, 'validation', { alt: ae });
      await db.run('UPDATE images SET alt=? WHERE id=?', [alt, imageId]); await audit(req, 'image:alt', 'product', id, `image ${imageId}`); }
    if (req.body?.cover === true) { // «تصویر اصلی»: move to the front, keep the others' order
      const ids = (await db.all<{ id: number }>('SELECT id FROM images WHERE product_id=? ORDER BY position, id', [id])).map(r => r.id).filter(x => x !== imageId);
      await db.tx(async t => { let i = 0; for (const x of [imageId, ...ids]) await t.run('UPDATE images SET position=? WHERE id=?', [i++, x]); });
      await audit(req, 'image:cover', 'product', id, `image ${imageId}`);
    }
    res.json({ data: await imgList(id) });
  });
  // «حذف از محصول» detaches the image row only. The stored file is NOT deleted (no deletions without CEO approval; cleanup = later ops task).
  app.delete('/api/admin/products/:id/images/:imageId', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); const imageId = Number(req.params.imageId);
    const r = await db.run('DELETE FROM images WHERE id=? AND product_id=?', [imageId, id]); if (!r.changes) return res.status(404).json({ error: 'not_found' });
    await audit(req, 'image:detach', 'product', id, `image ${imageId}`); res.json({ data: await imgList(id) });
  });
  // New variants (Figma «سایزها» + «رنگ‌ها»): creates the missing size×colour combinations; SKU format is a placeholder (ADMIN-PH-SKU).
  const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'فری‌سایز'];
  app.post('/api/admin/products/:id/variants', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); if (!await db.one('SELECT id FROM products WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    const sizes = Array.isArray(req.body?.sizes) ? [...new Set((req.body.sizes as unknown[]).map(String))] : [];
    const color = String(req.body?.color ?? '').trim(); const hex = String(req.body?.colorHex ?? '').trim();
    const f: Record<string, string> = {};
    if (!sizes.length || sizes.some(x => !SIZES.includes(x))) f.sizes = 'حداقل یک سایز معتبر انتخاب کنید';
    if (!color || color.length > 40) f.color = 'نام رنگ الزامی است (حداکثر ۴۰ کاراکتر)';
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) f.colorHex = 'کد رنگ باید به شکل ‎#RRGGBB باشد';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    const made: number[] = [];
    await db.tx(async t => {
      for (const sz of sizes) {
        if (await t.one('SELECT id FROM variants WHERE product_id=? AND size=? AND color=?', [id, sz, color])) continue;
        const n = (await t.one<{ n: number }>('SELECT COUNT(*) AS n FROM variants WHERE product_id=?', [id]))!.n + 1;
        made.push(await t.insert('INSERT INTO variants (product_id,size,color,color_hex,sku,available) VALUES (?,?,?,?,?,0)', [id, sz, color, hex.toUpperCase(), `P${id}-${sz === 'فری‌سایز' ? 'FREE' : sz}-${n}`]));
      }
    });
    if (made.length) await audit(req, 'variants:add', 'product', id, `${made.length} × ${color}`);
    res.status(201).json({ data: { created: made.length } });
  });

  // ---------- Inventory (Figma 179:21565 list · 179:22434 ledger · 179:23739 adjust · 179:23929 in-store sale · 179:23985 oversell) ----------
  const actor = (req: AReq) => ({ adminId: req.admin!.id, name: req.admin!.name });
  const stockErr = (res: Response, e: unknown) => { if (e instanceof StockError) return res.status(e.status).json({ error: e.code, fields: e.fields, ...e.extra }); throw e; };
  const auditIn = (t: Db, req: AReq, action: string, id: unknown, detail: string) =>
    t.run('INSERT INTO audit_log (admin_id,action,entity,entity_id,detail) VALUES (?,?,?,?,?)', [req.admin!.id, action, 'variant', String(id), detail]);
  const TABS = ['all', 'low', 'out', 'oversold', 'untracked'] as const;
  app.get('/api/admin/inventory', requireAdmin, async (req, res) => {
    const tab = (TABS as readonly string[]).includes(String(req.query.tab)) ? String(req.query.tab) : 'all';
    const q = String(req.query.q ?? '').trim(); const page = Math.max(1, Number(req.query.page ?? 1) | 0); const size = Math.min(50, Math.max(5, Number(req.query.size ?? 10) | 0));
    const w = ["p.publish_state<>'archived'"]; const p: unknown[] = [];
    if (q) { w.push('(p.name LIKE ? OR v.sku LIKE ? OR v.sku LIKE ?)'); p.push(`%${q}%`, `%${q}%`, `%${toLatin(q)}%`); }
    const rows = await stockRows(db, w.join(' AND '), p);
    const is = (t: string) => (r: (typeof rows)[number]) => t === 'all' || (t === 'out' ? r.status === 'out' || r.status === 'oversold' : r.status === t);
    const counts = Object.fromEntries(TABS.map(t => [t, rows.filter(is(t)).length]));
    const list = rows.filter(is(tab)); if (tab === 'low' || tab === 'out') list.sort((a, b) => (a.available ?? 0) - (b.available ?? 0));
    res.json({ data: list.slice((page - 1) * size, page * size), page, pageSize: size, total: list.length, counts, lowStockDefault: LOW_STOCK_DEFAULT, reasons: STOCK_REASONS,
      oversold: rows.filter(r => r.status === 'oversold'), sampleData: db.ephemeral, stubs: INVENTORY_STUBS });
  });
  app.get('/api/admin/inventory/movements', requireAdmin, async (req, res) => {
    const { q = '', kind = '', from = '', to = '', variant = '' } = req.query as Record<string, string>;
    const page = Math.max(1, Number(req.query.page ?? 1) | 0); const size = 20;
    const w: string[] = []; const p: unknown[] = [];
    if (q) { w.push('(p.name LIKE ? OR v.sku LIKE ? OR v.sku LIKE ? OR m.reason LIKE ? OR m.actor LIKE ?)'); p.push(`%${q}%`, `%${q}%`, `%${toLatin(q)}%`, `%${q}%`, `%${q}%`); }
    if (['increase', 'decrease', 'count', 'pos_sale', 'order_shipped'].includes(kind)) { w.push('m.kind=?'); p.push(kind); }
    if (/^\d+$/.test(variant)) { w.push('m.variant_id=?'); p.push(Number(variant)); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { w.push('m.created_at>=?'); p.push(from); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { w.push('m.created_at<?'); p.push(nextDay(to)); }
    const ws = w.length ? ' WHERE ' + w.join(' AND ') : '';
    const total = (await db.one<{ n: number }>(`SELECT COUNT(*) AS n FROM inventory_movements m JOIN variants v ON v.id=m.variant_id JOIN products p ON p.id=v.product_id${ws}`, p))!.n;
    res.json({ data: await db.all(`${MOVE_SQL}${ws} ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?`, [...p, size, (page - 1) * size]), page, pageSize: size, total, stubs: INVENTORY_STUBS });
  });
  app.get('/api/admin/inventory/:variantId', requireAdmin, async (req, res) => {
    const r = await stockRow(db, Number(req.params.variantId)); if (!r) return res.status(404).json({ error: 'not_found' });
    res.json({ data: r, reasons: STOCK_REASONS, stubs: INVENTORY_STUBS });
  });
  app.post('/api/admin/inventory/:variantId/adjust', requireAdmin, async (req: AReq, res) => {
    const vid = Number(req.params.variantId); const mode = String(req.body?.mode) as AdjustMode;
    try {
      const r = await changeStock(db, vid, { mode, qty: req.body?.qty, reason: req.body?.reason, note: req.body?.note }, actor(req),
        (t, m) => auditIn(t, req, 'stock:' + mode, vid, `${m.before ?? '—'} → ${m.after} · ${String(req.body?.reason ?? '')}`));
      res.json({ data: r });
    } catch (e) { stockErr(res, e); }
  });
  // «ثبت سریع فروش حضوری» — by SKU (search) or variant id.
  app.post('/api/admin/inventory/pos-sale', requireAdmin, async (req: AReq, res) => {
    const sku = String(req.body?.sku ?? '').trim();
    const v = req.body?.variantId ? { id: Number(req.body.variantId) } : sku ? await db.one<{ id: number }>('SELECT id FROM variants WHERE sku=?', [sku]) : undefined;
    if (!v) return res.status(404).json({ error: 'not_found', fields: { sku: 'کالایی با این SKU پیدا نشد' } });
    try {
      const r = await changeStock(db, v.id, { mode: 'pos_sale', qty: req.body?.qty, note: req.body?.note }, actor(req),
        (t, m) => auditIn(t, req, 'stock:pos_sale', v.id, `${m.before} → ${m.after}${m.oversold ? ' · OVERSOLD (BD-08)' : ''}`));
      // Oversell (Figma 179:23985): the sale is recorded; the paid online orders that now can't all be fulfilled are LISTED for review — nothing is changed on them (BD-08).
      const affected = r.oversold ? await db.all(`SELECT DISTINCT o.id, o.order_number AS orderNumber FROM orders o JOIN order_items oi ON oi.order_id=o.id
        WHERE oi.variant_id=? AND o.payment_status='paid' AND o.order_status IN ('pending','processing') ORDER BY o.id`, [v.id]) : [];
      res.json({ data: { ...r, affectedOrders: affected }, stubs: { oversell: stub('BD-08'), posTiming: stub('BD-09') } });
    } catch (e) { stockErr(res, e); }
  });
  // Categories (BD-18 taxonomy placeholder: rename/create only, no delete).
  app.get('/api/admin/categories', requireAdmin, async (_q, res) => res.json({ data: await db.all(`SELECT c.id,c.slug,c.name,c.parent_id AS parentId,(SELECT name FROM categories x WHERE x.id=c.parent_id) AS parentName,(SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS products FROM categories c ORDER BY COALESCE(c.parent_id,c.id), c.parent_id IS NOT NULL, c.id`), stubs: { taxonomy: stub('BD-18') } }));
  app.post('/api/admin/categories', requireAdmin, async (req: AReq, res) => {
    const name = String(req.body?.name ?? '').trim(); const slug = String(req.body?.slug ?? '').trim();
    const cf: Record<string, string> = {};
    if (!name) cf.name = 'نام دسته الزامی است'; else if (name.length > 60) cf.name = 'نام دسته حداکثر ۶۰ کاراکتر';
    if (!slug) cf.slug = 'شناسه لاتین الزامی است'; else if (!/^[a-z0-9-]{2,40}$/.test(slug)) cf.slug = 'شناسه فقط حروف لاتین کوچک، عدد و خط تیره (۲ تا ۴۰ کاراکتر)';
    if (Object.keys(cf).length) return bad(res, 'validation', cf);
    if (await db.one('SELECT id FROM categories WHERE slug=?', [slug])) return bad(res, 'validation', { slug: 'این شناسه قبلاً استفاده شده' });
    const parentId = req.body?.parentId ? Number(req.body.parentId) : null;
    if (parentId && !await db.one('SELECT id FROM categories WHERE id=? AND parent_id IS NULL', [parentId])) return bad(res, 'validation', { parentId: 'والد معتبر نیست' }); // one level only (placeholder, BD-18)
    const id = await db.insert('INSERT INTO categories (slug,name,parent_id) VALUES (?,?,?)', [slug, name, parentId]); await audit(req, 'create', 'category', id, name);
    res.status(201).json({ data: await db.one('SELECT id,slug,name FROM categories WHERE id=?', [id]) });
  });
  app.put('/api/admin/categories/:id', requireAdmin, async (req: AReq, res) => {
    const name = String(req.body?.name ?? '').trim(); const id = Number(req.params.id);
    if (!name || name.length > 60) return bad(res, 'validation', { name: name ? 'نام دسته حداکثر ۶۰ کاراکتر' : 'نام دسته الزامی است' });
    if (!await db.one('SELECT id FROM categories WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    await db.run('UPDATE categories SET name=? WHERE id=?', [name, id]); await audit(req, 'rename', 'category', id, name);
    res.json({ data: await db.one('SELECT id,slug,name FROM categories WHERE id=?', [id]) });
  });

  // ---------- Orders ----------
  const oSql = `SELECT o.id, o.order_number AS orderNumber, o.order_status AS orderStatus, o.payment_status AS paymentStatus, o.fulfilment_status AS fulfilmentStatus,
    o.shipping_method AS shippingMethod, o.shipping_fee AS shippingFee, o.vat_amount AS vatAmount, o.subtotal, o.discount, o.total, o.address_json AS addressJson,
    o.created_at AS createdAt, o.user_id AS userId, u.phone, COALESCE(u.first_name || ' ' || u.last_name, 'مهمان') AS customer,
    (SELECT SUM(quantity) FROM order_items WHERE order_id=o.id) AS items FROM orders o LEFT JOIN users u ON u.id=o.user_id`;
  app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    const { q = '', status = '' } = req.query as Record<string, string>;
    const w: string[] = []; const p: unknown[] = [];
    if (status) { w.push('o.order_status=?'); p.push(status); }
    if (q) { w.push(`(o.order_number LIKE ? OR u.phone LIKE ? OR (u.first_name || ' ' || u.last_name) LIKE ?)`); p.push(`%${toLatin(q)}%`, `%${toLatin(q)}%`, `%${q}%`); }
    const ws = w.length ? ' WHERE ' + w.join(' AND ') : '';
    const counts = Object.fromEntries((await db.all<{ s: string; n: number }>('SELECT order_status AS s, COUNT(*) AS n FROM orders GROUP BY s')).map(r => [r.s, r.n]));
    res.json({ data: (await db.all<{ addressJson?: string }>(`${oSql}${ws} ORDER BY o.created_at DESC`, p)).map(({ addressJson: _a, ...r }) => r), counts, transitions: ORDER_TRANSITIONS, sampleData: true });
  });
  const orderDetail = async (id: number) => {
    const o = await db.one<Record<string, unknown> & { addressJson: string; orderStatus: string }>(oSql + ' WHERE o.id=?', [id]); if (!o) return null;
    const { addressJson, ...rest } = o;
    return { ...rest, address: JSON.parse(addressJson), allowed: ORDER_TRANSITIONS[o.orderStatus] ?? [],
      lines: await db.all(`SELECT oi.id, oi.product_id AS productId, oi.name, oi.size, oi.color, oi.unit_price AS unitPrice, oi.quantity, v.sku,
        (SELECT url FROM images i WHERE i.product_id=oi.product_id ORDER BY position LIMIT 1) AS imageUrl FROM order_items oi LEFT JOIN variants v ON v.id=oi.variant_id WHERE oi.order_id=?`, [id]),
      notes: await db.all('SELECT n.id, n.body, n.created_at AS createdAt, a.name AS author FROM order_notes n LEFT JOIN admin_users a ON a.id=n.admin_id WHERE n.order_id=? ORDER BY n.id DESC', [id]),
      events: await db.all('SELECT status, actor, created_at AS createdAt FROM order_events WHERE order_id=? ORDER BY id', [id]) };
  };
  app.get('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const o = await orderDetail(Number(req.params.id)); if (!o) return res.status(404).json({ error: 'not_found' });
    res.json({ data: o, cancelReasons: CANCEL_REASONS, stubs: { cancellation: stub('BD-05'), shipping: stub('BD-02'), vat: stub('BD-06'), payment: stub('BD-01'), fulfilment: stub('BD-23'), invoice: stub('ADMIN-PH-INVOICE') } });
  });
  app.post('/api/admin/orders/:id/status', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); const to = String(req.body?.status ?? ''); const reason = String(req.body?.reason ?? '').trim();
    const o = await db.one<{ order_status: string; payment_status: string }>('SELECT order_status, payment_status FROM orders WHERE id=?', [id]);
    if (!o) return res.status(404).json({ error: 'not_found' });
    if (!(ORDER_TRANSITIONS[o.order_status] ?? []).includes(to)) return res.status(409).json({ error: 'invalid_transition', from: o.order_status, allowed: ORDER_TRANSITIONS[o.order_status] });
    if (to === 'cancelled' && !reason) return bad(res, 'validation', { reason: 'دلیل لغو الزامی است' });
    const ful = to === 'shipped' ? 'shipped' : to === 'delivered' ? 'delivered' : null;
    await db.run('UPDATE orders SET order_status=?, fulfilment_status=COALESCE(?, fulfilment_status) WHERE id=?', [to, ful, id]);
    await db.run('INSERT INTO order_events (order_id,status,actor) VALUES (?,?,?)', [id, to, req.admin!.name]);
    if (to === 'shipped') { // ADMIN-PH-STOCK-FLOW placeholder: shipped = leaves the warehouse → deduct tracked stock (ledger «ارسال سفارش»)
      const num = (await db.one<{ n: string }>('SELECT order_number AS n FROM orders WHERE id=?', [id]))!.n;
      const k = await deductForShipment(db, id, num, { adminId: req.admin!.id, name: req.admin!.name });
      if (k) await audit(req, 'stock:order_shipped', 'order', id, `${k} line(s)`);
    }
    if (reason) await db.run('INSERT INTO order_notes (order_id,admin_id,body) VALUES (?,?,?)', [id, req.admin!.id, `لغو سفارش: ${reason}`]);
    await audit(req, 'status:' + to, 'order', id, reason || undefined);
    // Refund on cancel is NOT automatic: BD-01/BD-05 placeholder.
    res.json({ data: await orderDetail(id), stubs: { refund: stub('BD-01'), cancellation: stub('BD-05') } });
  });
  app.post('/api/admin/orders/:id/notes', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); const body = String(req.body?.body ?? '').trim();
    if (!await db.one('SELECT id FROM orders WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    if (!body || body.length > 1000) return bad(res, 'validation', { body: 'یادداشت ۱ تا ۱۰۰۰ کاراکتر' });
    await db.run('INSERT INTO order_notes (order_id,admin_id,body) VALUES (?,?,?)', [id, req.admin!.id, body]); await audit(req, 'note', 'order', id);
    res.status(201).json({ data: await orderDetail(id) });
  });

  // ---------- Customers ----------
  app.get('/api/admin/customers', requireAdmin, async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const w = q ? `WHERE u.phone LIKE ? OR (u.first_name || ' ' || u.last_name) LIKE ?` : ''; const p = q ? [`%${toLatin(q)}%`, `%${q}%`] : [];
    res.json({ data: await db.all(`SELECT u.id, u.phone, u.first_name AS firstName, u.last_name AS lastName, u.email, u.created_at AS createdAt,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS orders, (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id=u.id AND o.payment_status='paid') AS spent,
      (SELECT MAX(created_at) FROM orders o WHERE o.user_id=u.id) AS lastOrder FROM users u ${w} ORDER BY u.id`, p), sampleData: true, stubs: { block: stub('ADMIN-PH-PRIVACY'), export: stub('ADMIN-PH-PRIVACY') } });
  });
  app.get('/api/admin/customers/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const u = await db.one('SELECT id, phone, first_name AS firstName, last_name AS lastName, email, created_at AS createdAt FROM users WHERE id=?', [id]);
    if (!u) return res.status(404).json({ error: 'not_found' });
    res.json({ data: { ...u,
      orders: await db.all('SELECT id, order_number AS orderNumber, order_status AS orderStatus, payment_status AS paymentStatus, total, created_at AS createdAt FROM orders WHERE user_id=? ORDER BY created_at DESC', [id]),
      addresses: await db.all('SELECT id, recipient, province, city, line, postal_code AS postalCode, is_default AS isDefault FROM addresses WHERE user_id=? ORDER BY id', [id]),
      reviews: await db.all('SELECT r.id, r.rating, r.status, p.name AS product FROM reviews r JOIN products p ON p.id=r.product_id WHERE r.user_id=?', [id]),
      notes: await db.all('SELECT n.id, n.body, n.created_at AS createdAt, a.name AS author FROM customer_notes n LEFT JOIN admin_users a ON a.id=n.admin_id WHERE n.user_id=? ORDER BY n.id DESC', [id]) },
      stubs: { block: stub('ADMIN-PH-PRIVACY'), export: stub('ADMIN-PH-PRIVACY') } });
  });

  app.post('/api/admin/customers/:id/notes', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); const body = String(req.body?.body ?? '').trim();
    if (!await db.one('SELECT id FROM users WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    if (!body || body.length > 1000) return bad(res, 'validation', { body: 'یادداشت ۱ تا ۱۰۰۰ کاراکتر' });
    await db.run('INSERT INTO customer_notes (user_id,admin_id,body) VALUES (?,?,?)', [id, req.admin!.id, body]); await audit(req, 'note', 'customer', id);
    res.status(201).json({ data: await db.all('SELECT n.id, n.body, n.created_at AS createdAt, a.name AS author FROM customer_notes n LEFT JOIN admin_users a ON a.id=n.admin_id WHERE n.user_id=? ORDER BY n.id DESC', [id]) });
  });

  // ---------- Reviews (NO FIGMA DESIGN — admin table pattern, pending design). Moderation policy BD-15 open; shop auto-publishes. ----------
  const rSql = `SELECT r.id, r.rating, r.body, r.status, r.created_at AS createdAt, p.id AS productId, p.name AS product, p.slug,
    (SELECT url FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageUrl, (SELECT MIN(sku) FROM variants v WHERE v.product_id=p.id) AS sku,
    u.id AS userId, COALESCE(u.first_name || ' ' || u.last_name, 'کاربر جومه') AS author, u.phone FROM reviews r JOIN products p ON p.id=r.product_id JOIN users u ON u.id=r.user_id`;
  app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
    const { q = '', status = '', rating = '', from = '', to = '' } = req.query as Record<string, string>;
    const w: string[] = []; const p: unknown[] = [];
    if (status) { w.push('r.status=?'); p.push(status); }
    if (rating) { w.push('r.rating=?'); p.push(Number(rating)); }
    if (q) { w.push("(p.name LIKE ? OR r.body LIKE ? OR (u.first_name || ' ' || u.last_name) LIKE ?)"); p.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { w.push('substr(r.created_at,1,10)>=?'); p.push(from); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { w.push('substr(r.created_at,1,10)<=?'); p.push(to); }
    const counts = Object.fromEntries((await db.all<{ s: string; n: number }>('SELECT status AS s, COUNT(*) AS n FROM reviews GROUP BY s')).map(r => [r.s, r.n]));
    res.json({ data: await db.all(`${rSql}${w.length ? ' WHERE ' + w.join(' AND ') : ''} ORDER BY r.created_at DESC, r.id DESC`, p), counts, pendingDesign: true, stubs: { moderation: stub('BD-15') } });
  });
  app.post('/api/admin/reviews/:id/status', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); const s = String(req.body?.status);
    if (!['published', 'rejected'].includes(s)) return bad(res, 'invalid_status');
    if (!await db.one('SELECT id FROM reviews WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    await db.run('UPDATE reviews SET status=? WHERE id=?', [s, id]); await audit(req, s === 'rejected' ? 'hide' : 'unhide', 'review', id);
    res.json({ data: await db.one(rSql + ' WHERE r.id=?', [id]) });
  });
  app.delete('/api/admin/reviews/:id', requireAdmin, async (req: AReq, res) => {
    const id = Number(req.params.id); if (!await db.one('SELECT id FROM reviews WHERE id=?', [id])) return res.status(404).json({ error: 'not_found' });
    await db.run('DELETE FROM reviews WHERE id=?', [id]); await audit(req, 'delete', 'review', id, 'demo data'); res.status(204).end();
  });

  // ---------- Content ----------
  app.get('/api/admin/content', requireAdmin, async (_q, res) => {
    const h = (await db.one<{ sections_json: string } & Record<string, unknown>>('SELECT hero_title AS heroTitle, hero_cta AS heroCta, hero_link AS heroLink, hero_alt AS heroAlt, sections_json, updated_at AS updatedAt FROM content_home WHERE id=1'))!;
    const { sections_json, ...home } = h;
    res.json({ data: { home: { ...home, sections: JSON.parse(sections_json) }, pages: await db.all('SELECT slug,title,published,bd,updated_at AS updatedAt FROM content_pages ORDER BY position, slug') },
      stubs: { content: stub('BD-14'), heroWiring: stub('ADMIN-PH-HERO') } });
  });
  app.put('/api/admin/content/home', requireAdmin, async (req: AReq, res) => {
    const b = req.body ?? {}; const f: Record<string, string> = {};
    for (const k of ['heroTitle', 'heroCta', 'heroLink', 'heroAlt']) if (!String(b[k] ?? '').trim()) f[k] = 'الزامی است';
    if (!String(b.heroLink ?? '').startsWith('/')) f.heroLink = 'لینک باید با / شروع شود';
    if (!Array.isArray(b.sections)) f.sections = 'invalid';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    await db.run(`UPDATE content_home SET hero_title=?,hero_cta=?,hero_link=?,hero_alt=?,sections_json=?,updated_at=datetime('now') WHERE id=1`,
      [b.heroTitle.trim(), b.heroCta.trim(), b.heroLink.trim(), b.heroAlt.trim(), JSON.stringify(b.sections)]);
    await audit(req, 'update', 'content', 'home'); res.json({ data: { ok: true } });
  });
  app.get('/api/admin/content/pages/:slug', requireAdmin, async (req, res) => {
    const p = await db.one('SELECT slug,title,body,published,bd,updated_at AS updatedAt FROM content_pages WHERE slug=?', [req.params.slug]);
    if (!p) return res.status(404).json({ error: 'not_found' }); res.json({ data: p });
  });
  app.put('/api/admin/content/pages/:slug', requireAdmin, async (req: AReq, res) => {
    const s = req.params.slug; const title = String(req.body?.title ?? '').trim(); const body = String(req.body?.body ?? '').trim();
    if (!await db.one('SELECT slug FROM content_pages WHERE slug=?', [s])) return res.status(404).json({ error: 'not_found' });
    const f: Record<string, string> = {}; if (!title) f.title = 'عنوان الزامی است'; if (!body || body.length > 20000) f.body = 'متن الزامی است';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    await db.run(`UPDATE content_pages SET title=?,body=?,published=?,updated_at=datetime('now') WHERE slug=?`, [title, body, req.body?.published ? 1 : 0, s]);
    await audit(req, req.body?.published ? 'publish' : 'save-draft', 'page', s);
    res.json({ data: await db.one('SELECT slug,title,body,published,bd FROM content_pages WHERE slug=?', [s]) });
  });


  // ---------- Settings: the two admin accounts (read-only in v1), audit log ----------
  // v1: no invites and no role editing. Accounts are created once with `npm run admin:setup` (passwords typed at runtime).
  // INTERIM screen data until Emma's final design.
  app.get('/api/admin/users', requireAdmin, async (_q, res) => res.json({ data: (await db.all<{ role: AdminRole }>('SELECT id,email,name,role,status,last_login AS lastLogin,is_demo AS isDemo FROM admin_users ORDER BY id'))
    .map(a => ({ ...a, roleLabel: ADMIN_ROLES[a.role] })), roles: ADMIN_ROLES, maxAdmins: MAX_ADMINS, access: 'full', interim: true }));
  app.get('/api/admin/audit', requireAdmin, async (_q, res) => res.json({ data: await db.all(`SELECT l.id, l.action, l.entity, l.entity_id AS entityId, l.detail, l.created_at AS createdAt, a.name AS actor
    FROM audit_log l LEFT JOIN admin_users a ON a.id=l.admin_id ORDER BY l.id DESC LIMIT 200`) }));
  return ready;
}
