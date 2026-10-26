import express, { type Request, type Response, type NextFunction } from 'express';
import type { Database } from 'sql.js';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { all } from './db.js';
import { config } from './config.js';
import { stub, SAMPLE_SHIPPING_METHODS } from './stubs.js';
import { samplePlaceholdersOn, SAMPLE_REVIEWS, SAMPLE_RATING } from '../db/sample-placeholder-data.js';
import { MockProvider, type PaymentProvider } from './payment.js';
import { ConsoleSmsAdapter, type SmsAdapter } from './sms.js';
import { mountAdmin, adminDemoAllowed } from './admin.js';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const one = <T = Record<string, unknown>>(db: Database, sql: string, p: unknown[] = []) => all<T>(db, sql, p)[0];
const lastId = (db: Database) => one<{ id: number }>(db, 'SELECT last_insert_rowid() AS id')!.id;
const PHONE_RE = /^09\d{9}$/;
const toLatin = (s: unknown) => String(s ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\s+/g, '');

// BD-18 STUB: no product-type taxonomy exists. Sample «دسته‌بندی» = first word of the sample product name (e.g. مانتو، پیراهن، کیمونو).
const TYPE_SQL = `replace(substr(p.name, 1, instr(p.name || ' ', ' ') - 1), '‌ی', '')`;
// admin-v1: the shop only shows products whose publish_state is 'published' (admin-demo), on top of catalog-real's LEFT JOIN prices.
const LIVE = `(SELECT * FROM products WHERE publish_state='published')`;
// catalog-real: a product without a prices row has price NULL («قیمت به‌زودی / تماس بگیرید»); it is listed (LEFT JOIN) but cannot be bought.
// Real product photos have a 600px thumb next to the full image (public/img/products/thumb/); other images use themselves.
const THUMB_SQL = (col: string) => `CASE WHEN ${col} LIKE '/img/products/%' THEN replace(${col}, '/img/products/', '/img/products/thumb/') ELSE ${col} END`;
const PRODUCT_SQL = `SELECT ${TYPE_SQL} AS type, p.id, p.slug, p.name, p.status, p.badge_percent AS badgePercent, p.is_sample AS isSample, c.slug AS category,
  pr.amount AS price, pr.original_amount AS originalPrice, pr.currency,
  (SELECT url FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageUrl,
  (SELECT ${THUMB_SQL('url')} FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageThumb,
  (SELECT alt FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageAlt,
  (SELECT ${THUMB_SQL('url')} FROM images i WHERE i.product_id=p.id AND i.url <> (SELECT url FROM images j WHERE j.product_id=p.id ORDER BY position LIMIT 1) ORDER BY position LIMIT 1) AS imageThumb2
  FROM ${LIVE} p LEFT JOIN prices pr ON pr.product_id=p.id JOIN categories c ON c.id=p.category_id`;
const SORTS: Record<string, string> = {
  newest: 'p.created_at DESC, p.id', bestseller: 'p.sort_rank, p.id', // best-seller definition open (Refinement 2): sample rank
  'price-asc': 'pr.amount IS NULL, pr.amount ASC, p.id', 'price-desc': 'pr.amount IS NULL, pr.amount DESC, p.id', // unpriced always last
};
const CATALOG_STUBS = { stock: stub('BD-16'), reviews: stub('BD-15'), sizeChart: stub('BD-18'), shipping: stub('BD-02'), returns: stub('BD-04') };

export type Deps = { sms?: SmsAdapter; payment?: PaymentProvider; now?: () => number;
  /** Return/log the mock OTP code. Default: JOUMEH_DEMO_OTP=1 only (off everywhere else). The Vercel handler forces false. */
  demoOtp?: boolean;
  /** admin-demo: enables the SMS-free DEMO admin login. Local only; the Vercel handler never sets it. */
  adminDemo?: boolean };
type AuthedReq = Request & { userId?: number };

export function createApp(db: Database, deps: Deps = {}) {
  const demoOtp = deps.demoOtp ?? config.demoOtp;
  const sms = deps.sms ?? new ConsoleSmsAdapter(demoOtp);
  const pay = deps.payment ?? new MockProvider();
  const now = deps.now ?? (() => Date.now());
  const app = express();
  app.use(express.json({ limit: '50kb' }));

  const auth = (req: AuthedReq, res: Response, next: NextFunction) => {
    const t = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    const s = t && one<{ user_id: number }>(db, 'SELECT user_id FROM sessions WHERE token_hash=?', [sha(t)]);
    if (!s) return res.status(401).json({ error: 'unauthorized' });
    req.userId = s.user_id; next();
  };
  const bad = (res: Response, error: string, fields?: Record<string, string>) => res.status(400).json({ error, fields });

  app.get('/api/health', (_q, res) => res.json({ ok: true, sampleData: samplePlaceholdersOn(), catalog: samplePlaceholdersOn() ? 'real photos + placeholder sample data (db/sample-placeholder-data.ts)' : 'real (placeholder names, no prices yet)' }));

  // ---------- Catalog ----------
  app.get('/api/products', (req, res) => {
    const { category, sort = 'newest', size, color, sale, type, minPrice, maxPrice } = req.query as Record<string, string>;
    const page = Math.max(1, Number(req.query.page ?? 1) | 0);
    if (!SORTS[sort]) return bad(res, 'invalid_sort');
    const where: string[] = []; const p: unknown[] = [];
    if (category) { where.push('c.slug=?'); p.push(category); }
    if (size) { const s = size.split(',').filter(Boolean); where.push(`EXISTS (SELECT 1 FROM variants v WHERE v.product_id=p.id AND v.available=1 AND v.size IN (${s.map(() => '?').join(',')}))`); p.push(...s); }
    if (color) { const c = color.split(',').filter(Boolean); where.push(`EXISTS (SELECT 1 FROM variants v WHERE v.product_id=p.id AND v.color IN (${c.map(() => '?').join(',')}))`); p.push(...c); }
    if (sale === '1') where.push(`p.status='sale'`);
    if (type) { const t = type.split(',').filter(Boolean); where.push(`${TYPE_SQL} IN (${t.map(() => '?').join(',')})`); p.push(...t); }
    const minP = Number(minPrice), maxP = Number(maxPrice);
    if (minPrice && Number.isFinite(minP)) { where.push('pr.amount >= ?'); p.push(minP); }
    if (maxPrice && Number.isFinite(maxP)) { where.push('pr.amount <= ?'); p.push(maxP); }
    const w = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const total = one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM ${LIVE} p LEFT JOIN prices pr ON pr.product_id=p.id JOIN categories c ON c.id=p.category_id${w}`, p)!.n;
    const totalPages = Math.max(1, Math.ceil(total / config.pageSize));
    const data = all(db, `${PRODUCT_SQL}${w} ORDER BY ${SORTS[sort]} LIMIT ? OFFSET ?`, [...p, config.pageSize, (page - 1) * config.pageSize]);
    res.json({ data, page, pageSize: config.pageSize, total, totalPages, sampleData: data.some(d => !!(d as { isSample?: number }).isSample), stubs: CATALOG_STUBS });
  });
  app.get('/api/filters', (req, res) => {
    const cat = String(req.query.category ?? '');
    const sizes = all<{ size: string }>(db, `SELECT DISTINCT v.size FROM variants v JOIN ${LIVE} p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id WHERE (?='' OR c.slug=?)`, [cat, cat]).map(r => r.size);
    const colors = all(db, `SELECT DISTINCT v.color AS name, v.color_hex AS hex FROM variants v JOIN ${LIVE} p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id WHERE (?='' OR c.slug=?) ORDER BY v.color`, [cat, cat]);
    const types = all<{ t: string; n: number }>(db, `SELECT ${TYPE_SQL} AS t, COUNT(*) AS n FROM ${LIVE} p JOIN categories c ON c.id=p.category_id WHERE (?='' OR c.slug=?) GROUP BY t ORDER BY n DESC, t`, [cat, cat]).map(r => r.t);
    const pr = one<{ lo: number; hi: number }>(db, `SELECT MIN(pr.amount) AS lo, MAX(pr.amount) AS hi FROM prices pr JOIN ${LIVE} p ON p.id=pr.product_id JOIN categories c ON c.id=p.category_id WHERE (?='' OR c.slug=?)`, [cat, cat])!;
    res.json({ data: { types, sizes, colors, price: { min: pr.lo, max: pr.hi } }, stubs: { taxonomy: stub('BD-18') } });
  });
  app.get('/api/products/:slug', (req, res) => {
    const prod = one<Record<string, unknown> & { id: number; category: string }>(db, PRODUCT_SQL + ' WHERE p.slug = ?', [req.params.slug]);
    if (!prod) return res.status(404).json({ error: 'not_found' });
    const d = one<{ description: string }>(db, 'SELECT description FROM products WHERE id=?', [prod.id])!;
    const related = all(db, PRODUCT_SQL + ' WHERE c.slug=? AND p.id<>? ORDER BY p.sort_rank LIMIT 4', [prod.category, prod.id]);
    res.json({ data: { ...prod, description: d.description,
      images: all(db, `SELECT url, ${THUMB_SQL('url')} AS thumb, alt FROM images WHERE product_id=? ORDER BY position`, [prod.id]),
      variants: all(db, 'SELECT id, size, color, color_hex AS colorHex, sku, available FROM variants WHERE product_id=? ORDER BY id', [prod.id]),
      related,
      // design-batch-2026-10-26 item 10: aggregate rating row on the PDP (sample placeholder when the switch is on; real reviews otherwise).
      rating: (() => { const r = reviewSummary(prod.id); return { average: r.average, count: r.count, sample: !!(r as { sample?: boolean }).sample }; })() },
      sampleData: !!prod.isSample, stubs: CATALOG_STUBS });
  });
  app.get('/api/search', (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) return res.json({ data: [], q });
    if (q.length > 64) return bad(res, 'query_too_long');
    res.json({ data: all(db, PRODUCT_SQL + ` WHERE p.name LIKE ? ORDER BY p.sort_rank LIMIT 6`, [`%${q}%`]), q });
  });

  // ---------- Cart ----------
  const cartView = (cid: number) => {
    const items = all<{ id: number; variantId: number; quantity: number; price: number | null; originalPrice: number | null; available: number }>(db, `
      SELECT ci.id, ci.variant_id AS variantId, ci.quantity, v.size, v.color, v.available, p.id AS productId, p.slug, p.name, pr.amount AS price, pr.original_amount AS originalPrice,
      (SELECT ${THUMB_SQL('url')} FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageUrl
      FROM cart_items ci JOIN variants v ON v.id=ci.variant_id JOIN products p ON p.id=v.product_id LEFT JOIN prices pr ON pr.product_id=p.id WHERE ci.cart_id=? ORDER BY ci.id`, [cid]);
    // An item whose price was removed after it was added is treated as unavailable (never summed, never ordered).
    for (const i of items) if (i.price == null) i.available = 0;
    const live = items.filter(i => i.available);
    const subtotal = live.reduce((s, i) => s + (i.originalPrice ?? i.price!) * i.quantity, 0);
    const payable = live.reduce((s, i) => s + i.price! * i.quantity, 0);
    return { cartId: cid, items: items.map(i => ({ ...i, available: !!i.available, lineTotal: i.price == null ? null : i.price * i.quantity })),
      totals: { count: live.reduce((s, i) => s + i.quantity, 0), subtotal, discount: subtotal - payable, payable, shipping: null, vat: null },
      stubs: { shipping: stub('BD-02'), vat: stub('BD-06'), discountCode: stub('BD-17'), reservation: stub('BD-08') } };
  };
  const cartExists = (cid: unknown) => Number.isInteger(cid) && !!one(db, 'SELECT id FROM carts WHERE id=?', [cid]);
  app.post('/api/cart', (_q, res) => { db.run('INSERT INTO carts DEFAULT VALUES'); res.status(201).json({ data: cartView(lastId(db)) }); });
  app.get('/api/cart/:id', (req, res) => {
    const cid = Number(req.params.id); if (!cartExists(cid)) return res.status(404).json({ error: 'cart_not_found' });
    res.json({ data: cartView(cid) });
  });
  app.post('/api/cart/items', (req, res) => {
    const { cartId, variantId, quantity = 1 } = req.body ?? {};
    if (!Number.isInteger(variantId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return bad(res, 'invalid_body');
    const v = one<{ available: number; price: number | null }>(db, 'SELECT v.available, pr.amount AS price FROM variants v LEFT JOIN prices pr ON pr.product_id=v.product_id WHERE v.id=?', [variantId]);
    if (!v) return res.status(404).json({ error: 'variant_not_found' });
    if (v.price == null) return res.status(409).json({ error: 'price_on_request' }); // catalog-real: no price yet → not purchasable
    if (!v.available) return res.status(409).json({ error: 'variant_unavailable' }); // BD-16 STUB: availability flag only
    let cid = cartId;
    if (cid === undefined || cid === null) { db.run('INSERT INTO carts DEFAULT VALUES'); cid = lastId(db); }
    else if (!cartExists(cid)) return res.status(404).json({ error: 'cart_not_found' });
    // BD-08 STUB: no reservation / oversell check.
    db.run('INSERT INTO cart_items (cart_id,variant_id,quantity) VALUES (?,?,?) ON CONFLICT(cart_id,variant_id) DO UPDATE SET quantity=MIN(99, quantity+excluded.quantity)', [cid, variantId, quantity]);
    res.status(201).json({ data: cartView(cid) });
  });
  app.patch('/api/cart/:id/items/:itemId', (req, res) => {
    const cid = Number(req.params.id); const q = req.body?.quantity;
    if (!Number.isInteger(q) || q < 1 || q > 99) return bad(res, 'invalid_quantity');
    if (!one(db, 'SELECT id FROM cart_items WHERE id=? AND cart_id=?', [Number(req.params.itemId), cid])) return res.status(404).json({ error: 'item_not_found' });
    db.run('UPDATE cart_items SET quantity=? WHERE id=?', [q, Number(req.params.itemId)]);
    res.json({ data: cartView(cid) });
  });
  app.delete('/api/cart/:id/items/:itemId', (req, res) => {
    const cid = Number(req.params.id);
    if (!one(db, 'SELECT id FROM cart_items WHERE id=? AND cart_id=?', [Number(req.params.itemId), cid])) return res.status(404).json({ error: 'item_not_found' });
    db.run('DELETE FROM cart_items WHERE id=?', [Number(req.params.itemId)]); // removing a line from a cart is user action, undo = re-add
    res.json({ data: cartView(cid) });
  });

  // ---------- Auth (phone OTP, mock SMS; e-mail OTP mock = BD-21 stub) ----------
  // Code length 6 per Figma Auth/Modal Mode=Verify 107:941 («کد ۶ رقمی») and OTP Input 53:234 (round 1).
  const CODE_RE = new RegExp(`^\\d{${config.otpLength}}$`);
  const issue = (res: Response, key: string, send: (code: string) => void, extra: Record<string, unknown>) => {
    const t = now(); const since = t - config.otpWindowSeconds * 1000;
    const n = one<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM otp_requests WHERE phone=? AND created_at>?', [key, since])!.n;
    if (n >= config.otpRequestsPerWindow) return res.status(429).json({ error: 'rate_limited' });
    const code = String(randomInt(0, 10 ** config.otpLength)).padStart(config.otpLength, '0');
    db.run('INSERT INTO otp_requests (phone,code_hash,expires_at,created_at) VALUES (?,?,?,?)', [key, sha(key + code), t + config.otpTtlSeconds * 1000, t]);
    send(code);
    res.status(201).json({ data: { ...extra, expiresIn: config.otpTtlSeconds, resendIn: config.otpTtlSeconds, codeLength: config.otpLength, ...(demoOtp ? { devCode: code } : {}) }, stubs: { sms: stub('BD-13'), emailOtp: stub('BD-21') } });
  };
  const check = (res: Response, key: string, code: string): boolean => {
    const r = one<{ id: number; code_hash: string; expires_at: number; attempts: number }>(db, 'SELECT * FROM otp_requests WHERE phone=? AND consumed=0 ORDER BY id DESC LIMIT 1', [key]);
    if (!r) { res.status(400).json({ error: 'no_pending_code' }); return false; }
    if (r.expires_at < now()) { res.status(410).json({ error: 'code_expired' }); return false; }
    if (r.attempts >= config.otpMaxAttempts) { res.status(429).json({ error: 'too_many_attempts' }); return false; }
    if (r.code_hash !== sha(key + code)) { db.run('UPDATE otp_requests SET attempts=attempts+1 WHERE id=?', [r.id]); res.status(400).json({ error: 'wrong_code' }); return false; }
    db.run('UPDATE otp_requests SET consumed=1 WHERE id=?', [r.id]); return true;
  };
  const session = (res: Response, uid: number) => {
    const token = randomBytes(24).toString('hex');
    db.run('INSERT INTO sessions (token_hash,user_id,created_at) VALUES (?,?,?)', [sha(token), uid, now()]);
    res.json({ data: { token, user: profile(uid) } });
  };
  app.post('/api/auth/otp/request', (req, res) => {
    const phone = toLatin(req.body?.phone);
    if (!PHONE_RE.test(phone)) return bad(res, 'invalid_phone', { phone: 'شماره موبایل معتبر نیست' });
    issue(res, phone, code => sms.sendOtp(phone, code), { phone });
  });
  app.post('/api/auth/otp/verify', (req, res) => {
    const phone = toLatin(req.body?.phone); const code = toLatin(req.body?.code);
    if (!PHONE_RE.test(phone) || !CODE_RE.test(code)) return bad(res, 'invalid_body');
    if (!check(res, phone, code)) return;
    let u = one<{ id: number }>(db, 'SELECT id FROM users WHERE phone=?', [phone]);
    // Signup (107:773) sends نام/نام خانوادگی; stored only for a new account or one without a name (never overwrites).
    const nm = (v: unknown) => (typeof v === 'string' && v.trim() && v.trim().length <= 50 ? v.trim() : null);
    const fn = nm(req.body?.firstName), ln = nm(req.body?.lastName);
    if (!u) { db.run('INSERT INTO users (phone, first_name, last_name) VALUES (?,?,?)', [phone, fn, ln]); u = { id: lastId(db) }; }
    else if (fn || ln) db.run('UPDATE users SET first_name=COALESCE(first_name, ?), last_name=COALESCE(last_name, ?) WHERE id=?', [fn, ln, u.id]);
    session(res, u.id);
  });
  // BD-21 STUB: e-mail OTP is undecided. Mock only: sign-in for an existing account e-mail; nothing is e-mailed (code logged locally).
  const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
  app.post('/api/auth/email/request', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return bad(res, 'invalid_email', { email: 'ایمیل معتبر نیست' });
    if (!one(db, 'SELECT id FROM users WHERE lower(email)=?', [email])) return res.status(404).json({ error: 'email_not_found' });
    issue(res, `email:${email}`, code => { if (demoOtp) console.info(`[mock e-mail BD-21] code for ${email}: ${code}`); }, { email });
  });
  app.post('/api/auth/email/verify', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase(); const code = toLatin(req.body?.code);
    if (!EMAIL_RE.test(email) || !CODE_RE.test(code)) return bad(res, 'invalid_body');
    if (!check(res, `email:${email}`, code)) return;
    const u = one<{ id: number }>(db, 'SELECT id FROM users WHERE lower(email)=?', [email]);
    if (!u) return res.status(404).json({ error: 'email_not_found' });
    session(res, u.id);
  });
  const profile = (id: number) => one(db, 'SELECT id, phone, first_name AS firstName, last_name AS lastName, email, email_verified AS emailVerified FROM users WHERE id=?', [id]);
  app.post('/api/auth/logout', auth, (req, res) => { db.run('DELETE FROM sessions WHERE token_hash=?', [sha((req.headers.authorization ?? '').slice(7))]); res.status(204).end(); });
  app.get('/api/me', auth, (req: AuthedReq, res) => res.json({ data: profile(req.userId!) }));
  app.patch('/api/me', auth, (req: AuthedReq, res) => {
    const { firstName, lastName, email } = req.body ?? {}; const f: Record<string, string> = {};
    if (typeof firstName !== 'string' || !firstName.trim() || firstName.length > 50) f.firstName = 'نام را وارد کنید';
    if (typeof lastName !== 'string' || !lastName.trim() || lastName.length > 50) f.lastName = 'نام خانوادگی را وارد کنید';
    if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) f.email = 'ایمیل معتبر نیست';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    const cur = profile(req.userId!) as { email: string | null };
    db.run('UPDATE users SET first_name=?, last_name=?, email=?, email_verified=CASE WHEN email IS ? THEN email_verified ELSE 0 END WHERE id=?', [firstName.trim(), lastName.trim(), email || null, email || null, req.userId!]);
    void cur; res.json({ data: profile(req.userId!), stubs: { emailVerification: stub('BD-21') } });
  });

  // ---------- Addresses ----------
  const validateAddress = (b: Record<string, unknown>) => {
    const f: Record<string, string> = {}; const req = (k: string, msg: string) => { if (typeof b[k] !== 'string' || !(b[k] as string).trim()) f[k] = msg; };
    req('recipient', 'نام و نام خانوادگی را وارد کنید'); req('province', 'استان را انتخاب کنید'); req('city', 'شهر را انتخاب کنید'); req('line', 'نشانی کامل را وارد کنید');
    if (!PHONE_RE.test(toLatin(b.phone))) f.phone = 'شماره موبایل معتبر نیست';
    if (!/^\d{10}$/.test(toLatin(b.postalCode))) f.postalCode = 'کد پستی باید ۱۰ رقم باشد';
    if (b.landline && !/^0\d{10}$/.test(toLatin(b.landline))) f.landline = 'تلفن ثابت معتبر نیست';
    return f;
  };
  const listAddr = (uid: number) => all(db, 'SELECT id, recipient, phone, province, city, line, postal_code AS postalCode, landline, is_default AS isDefault FROM addresses WHERE user_id=? ORDER BY is_default DESC, id', [uid]);
  app.get('/api/addresses', auth, (req: AuthedReq, res) => res.json({ data: listAddr(req.userId!) }));
  app.post('/api/addresses', auth, (req: AuthedReq, res) => {
    const b = req.body ?? {}; const f = validateAddress(b); if (Object.keys(f).length) return bad(res, 'validation', f);
    const first = !one(db, 'SELECT id FROM addresses WHERE user_id=?', [req.userId!]);
    db.run('INSERT INTO addresses (user_id,recipient,phone,province,city,line,postal_code,landline,is_default) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.userId!, b.recipient.trim(), toLatin(b.phone), b.province, b.city, b.line.trim(), toLatin(b.postalCode), b.landline ? toLatin(b.landline) : null, first ? 1 : 0]);
    res.status(201).json({ data: listAddr(req.userId!) });
  });
  const ownAddr = (req: AuthedReq) => one(db, 'SELECT id FROM addresses WHERE id=? AND user_id=?', [Number(req.params.id), req.userId!]);
  app.put('/api/addresses/:id', auth, (req: AuthedReq, res) => {
    if (!ownAddr(req)) return res.status(404).json({ error: 'not_found' });
    const b = req.body ?? {}; const f = validateAddress(b); if (Object.keys(f).length) return bad(res, 'validation', f);
    db.run('UPDATE addresses SET recipient=?, phone=?, province=?, city=?, line=?, postal_code=?, landline=? WHERE id=?',
      [b.recipient.trim(), toLatin(b.phone), b.province, b.city, b.line.trim(), toLatin(b.postalCode), b.landline ? toLatin(b.landline) : null, Number(req.params.id)]);
    res.json({ data: listAddr(req.userId!) });
  });
  app.post('/api/addresses/:id/default', auth, (req: AuthedReq, res) => {
    if (!ownAddr(req)) return res.status(404).json({ error: 'not_found' });
    db.run('UPDATE addresses SET is_default = (id=?) WHERE user_id=?', [Number(req.params.id), req.userId!]);
    res.json({ data: listAddr(req.userId!) });
  });
  app.delete('/api/addresses/:id', auth, (req: AuthedReq, res) => {
    if (!ownAddr(req)) return res.status(404).json({ error: 'not_found' });
    db.run('DELETE FROM addresses WHERE id=?', [Number(req.params.id)]); // user-initiated, behind a confirm dialog (Figma 126:36760)
    res.json({ data: listAddr(req.userId!) });
  });

  // ---------- Favourites ----------
  const favs = (uid: number) => all(db, PRODUCT_SQL + ' JOIN favorites f ON f.product_id=p.id WHERE f.user_id=? ORDER BY f.created_at DESC, p.id', [uid]);
  // fix2 reviews — DEFAULTS (not policy; BD-15 open): signed-in only · rating integer 1–5 · text 1–1000 chars after trim ·
  // published immediately — CEO DECISION 2026-10-21: no moderation (REVIEW_DEFAULTS.moderation = 'none') · multiple reviews per user allowed · average = mean rounded to 1 decimal.
  const sampleProduct = (pid: number) => !!one<{ s: number }>(db, 'SELECT is_sample AS s FROM products WHERE id=?', [pid])?.s;
  const REVIEW_DEFAULTS = { minLen: 1, maxLen: 1000, moderation: 'none' as 'none' | 'pre' };
  const reviewSummary = (pid: number) => {
    const reviews = all<{ id: number; rating: number; body: string; createdAt: string; firstName: string | null; lastName: string | null }>(db,
      `SELECT r.id, r.rating, r.body, r.created_at AS createdAt, u.first_name AS firstName, u.last_name AS lastName FROM reviews r JOIN users u ON u.id=r.user_id
       WHERE r.product_id=? AND r.status='published' ORDER BY r.created_at DESC, r.id DESC`, [pid]);
    const count = reviews.length; const average = count ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / count) * 10) / 10 : 0;
    const real = reviews.map(r => ({ id: r.id as number | string, rating: r.rating, body: r.body, createdAt: r.createdAt, meta: undefined as string | undefined, sample: false,
      name: r.firstName ? `${r.firstName}${r.lastName ? ` ${r.lastName.slice(0, 1)}.` : ''}` : 'کاربر جومه' }));
    // design-batch-2026-10-26: placeholder reviews + aggregate (Figma 266:71769), labelled «(نمونه)»; real reviews are listed first.
    if (samplePlaceholdersOn() && sampleProduct(pid)) return { reviews: [...real, ...SAMPLE_REVIEWS.map(r => ({ ...r, createdAt: undefined }))], count: SAMPLE_RATING.count + count, average: SAMPLE_RATING.average, sample: true };
    return { reviews: real, count, average };
  };
  const productId = (slug: string) => one<{ id: number }>(db, 'SELECT id FROM products WHERE slug=?', [slug])?.id;
  app.get('/api/products/:slug/reviews', (req, res) => { const pid = productId(req.params.slug); if (!pid) return res.status(404).json({ error: 'not_found' }); res.json({ data: reviewSummary(pid), defaults: REVIEW_DEFAULTS }); });
  app.post('/api/products/:slug/reviews', auth, (req: AuthedReq, res) => {
    const pid = productId(req.params.slug); if (!pid) return res.status(404).json({ error: 'not_found' });
    const rating = Number(req.body?.rating); const text = String(req.body?.text ?? '').trim(); const fields: Record<string, string> = {};
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) fields.rating = 'required';
    if (text.length < REVIEW_DEFAULTS.minLen) fields.text = 'required'; else if (text.length > REVIEW_DEFAULTS.maxLen) fields.text = 'too_long';
    if (Object.keys(fields).length) return bad(res, 'invalid_review', fields);
    db.run('INSERT INTO reviews (product_id,user_id,rating,body,status) VALUES (?,?,?,?,?)', [pid, req.userId!, rating, text, REVIEW_DEFAULTS.moderation === 'none' ? 'published' : 'pending']);
    res.status(201).json({ data: reviewSummary(pid) });
  });
  app.get('/api/favorites', auth, (req: AuthedReq, res) => res.json({ data: favs(req.userId!) }));
  app.put('/api/favorites/:productId', auth, (req: AuthedReq, res) => {
    const pid = Number(req.params.productId); if (!one(db, 'SELECT id FROM products WHERE id=?', [pid])) return res.status(404).json({ error: 'not_found' });
    db.run('INSERT OR IGNORE INTO favorites (user_id,product_id) VALUES (?,?)', [req.userId!, pid]); res.json({ data: favs(req.userId!) });
  });
  app.delete('/api/favorites/:productId', auth, (req: AuthedReq, res) => {
    db.run('DELETE FROM favorites WHERE user_id=? AND product_id=?', [req.userId!, Number(req.params.productId)]); res.json({ data: favs(req.userId!) });
  });

  // ---------- Orders / checkout ----------
  const orderSql = `SELECT id, order_number AS orderNumber, order_status AS orderStatus, payment_status AS paymentStatus, fulfilment_status AS fulfilmentStatus,
    shipping_method AS shippingMethod, shipping_fee AS shippingFee, vat_amount AS vatAmount, subtotal, discount, total, address_json AS addressJson, is_sample AS isSample, created_at AS createdAt FROM orders`;
  const ORDER_STUBS = { orderNumber: stub('BD-11'), payment: stub('BD-01'), shipping: stub('BD-02'), vat: stub('BD-06'), cancellation: stub('BD-05'), delivered: stub('BD-23'), cod: stub('BD-24') };
  const withItems = (o: Record<string, unknown> & { id: number; addressJson: string }) => {
    const { addressJson, ...rest } = o;
    return { ...rest, address: JSON.parse(addressJson), items: all(db, `SELECT oi.product_id AS productId, oi.name, oi.size, oi.color, oi.unit_price AS unitPrice, oi.quantity,
      (SELECT url FROM images i WHERE i.product_id=oi.product_id ORDER BY position LIMIT 1) AS imageUrl, p.slug FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE order_id=?`, [o.id]) };
  };
  app.get('/api/shipping-methods', (_q, res) => res.json({ data: SAMPLE_SHIPPING_METHODS, sampleData: true, stubs: { shipping: stub('BD-02'), delivery: stub('BD-03'), cod: stub('BD-24') } }));
  app.get('/api/orders', auth, (req: AuthedReq, res) => res.json({ data: all<Record<string, unknown> & { id: number; addressJson: string }>(db, orderSql + ' WHERE user_id=? ORDER BY created_at DESC', [req.userId!]).map(withItems), stubs: ORDER_STUBS }));
  app.get('/api/orders/:id', auth, (req: AuthedReq, res) => {
    const o = one<Record<string, unknown> & { id: number; addressJson: string }>(db, orderSql + ' WHERE id=? AND user_id=?', [Number(req.params.id), req.userId!]);
    if (!o) return res.status(404).json({ error: 'not_found' });
    res.json({ data: withItems(o), stubs: ORDER_STUBS });
  });
  app.post('/api/orders', auth, (req: AuthedReq, res) => {
    // BD-07 STUB: guest checkout undecided → login required.
    const { cartId, address, shippingMethodId } = req.body ?? {};
    if (!cartExists(cartId)) return res.status(404).json({ error: 'cart_not_found' });
    const f = validateAddress(address ?? {});
    if (!SAMPLE_SHIPPING_METHODS.some(m => m.id === shippingMethodId)) f.shippingMethodId = 'روش ارسال را انتخاب کنید';
    if (Object.keys(f).length) return bad(res, 'validation', f);
    const cart = cartView(cartId);
    const items = cart.items.filter(i => i.available);
    if (!items.length) return res.status(409).json({ error: 'cart_empty' });
    // BD-02/BD-06: shipping fee and VAT are NULL (undecided); total = items only.
    db.run(`INSERT INTO orders (user_id,order_status,payment_status,fulfilment_status,shipping_method,shipping_fee,vat_amount,subtotal,discount,total,address_json)
      VALUES (?,'pending','unpaid','unfulfilled',?,NULL,NULL,?,?,?,?)`, [req.userId!, shippingMethodId, cart.totals.subtotal, cart.totals.discount, cart.totals.payable,
      JSON.stringify({ recipient: address.recipient, phone: toLatin(address.phone), province: address.province, city: address.city, line: address.line, postalCode: toLatin(address.postalCode) })]);
    const oid = lastId(db);
    db.run('UPDATE orders SET order_number=? WHERE id=?', [String(oid), oid]); // BD-11 STUB: one sample format app-wide (same as seeded ۱۰۱۲۴); final format = CEO
    for (const i of items as unknown as { productId: number; variantId: number; name: string; size: string; color: string; price: number; quantity: number }[])
      db.run('INSERT INTO order_items (order_id,product_id,variant_id,name,size,color,unit_price,quantity) VALUES (?,?,?,?,?,?,?,?)', [oid, i.productId, i.variantId, i.name, i.size, i.color, i.price, i.quantity]);
    db.run('DELETE FROM cart_items WHERE cart_id=?', [cartId]);
    const o = one<Record<string, unknown> & { id: number; addressJson: string }>(db, orderSql + ' WHERE id=?', [oid])!;
    res.status(201).json({ data: withItems(o), stubs: ORDER_STUBS });
  });
  app.post('/api/orders/:id/payment', auth, (req: AuthedReq, res) => {
    const o = one<{ id: number; total: number; payment_status: string }>(db, 'SELECT id,total,payment_status FROM orders WHERE id=? AND user_id=?', [Number(req.params.id), req.userId!]);
    if (!o) return res.status(404).json({ error: 'not_found' });
    if (o.payment_status === 'paid') return res.status(409).json({ error: 'already_paid' });
    const s = pay.start(o.id, o.total);
    db.run('INSERT INTO payments (order_id,provider,status,ref,amount) VALUES (?,?,?,?,?)', [o.id, pay.name, 'started', s.ref, o.total]);
    res.status(201).json({ data: s, stubs: { payment: stub('BD-01') } });
  });
  app.post('/api/payments/mock/complete', auth, (req: AuthedReq, res) => {
    const { ref, outcome } = req.body ?? {};
    if (outcome !== 'success' && outcome !== 'failure') return bad(res, 'invalid_outcome');
    const p = one<{ id: number; order_id: number }>(db, `SELECT pm.id, pm.order_id FROM payments pm JOIN orders o ON o.id=pm.order_id WHERE pm.ref=? AND o.user_id=? AND pm.status='started'`, [ref, req.userId!]);
    if (!p) return res.status(404).json({ error: 'payment_not_found' });
    const st = pay.verify(ref, outcome);
    db.run('UPDATE payments SET status=? WHERE id=?', [st, p.id]);
    db.run(`UPDATE orders SET payment_status=?, order_status=CASE WHEN ?='paid' THEN 'processing' ELSE order_status END WHERE id=?`, [st, st, p.order_id]);
    res.json({ data: { orderId: p.order_id, paymentStatus: st }, stubs: { payment: stub('BD-01') } });
  });

  // ---------- Returns (read-only; BD-04) ----------
  const retSql = `SELECT r.id, r.return_number AS returnNumber, r.status, r.reason, r.created_at AS createdAt, r.order_id AS orderId, o.order_number AS orderNumber,
    p.name AS productName, p.slug, (SELECT url FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageUrl
    FROM returns r JOIN orders o ON o.id=r.order_id JOIN products p ON p.id=r.product_id`;
  app.get('/api/returns', auth, (req: AuthedReq, res) => res.json({ data: all(db, retSql + ' WHERE r.user_id=? ORDER BY r.created_at DESC', [req.userId!]), stubs: { returns: stub('BD-04') } }));
  app.get('/api/returns/:id', auth, (req: AuthedReq, res) => {
    const r = one(db, retSql + ' WHERE r.id=? AND r.user_id=?', [Number(req.params.id), req.userId!]);
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json({ data: r, stubs: { returns: stub('BD-04') } });
  });

  mountAdmin(app, db, { adminDemo: deps.adminDemo ?? adminDemoAllowed(), now });

  app.use('/api', (_q, res) => res.status(404).json({ error: 'not_found' }));
  app.use((err: Error & { type?: string }, _q: Request, res: Response, _n: NextFunction) => {
    if (err.type === 'entity.parse.failed') return bad(res, 'invalid_json');
    res.status(500).json({ error: 'server_error' });
  });
  return app;
}
