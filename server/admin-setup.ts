// ============================================================================================================
//  ONE-TIME ADMIN SETUP PAGE (/admin/setup) — gerdoo-update-2026-10-28.
//  OPEN only while ALL of these hold:
//    • the setup window has not expired: JOUMEH_ADMIN_SETUP_WINDOW_HOURS after server start (default 24; 0 = never open), and
//    • EITHER there are 0 admin accounts and slot 1 was never used (→ creates the Owner),
//      OR JOUMEH_ADMIN_SETUP_REOPEN=1 AND JOUMEH_ADMIN_SETUP_EMAILS is set explicitly AND there is exactly 1 admin and slot 2 was never used
//         (→ creates the second account, role «مدیر فروشگاه»).
//  Only e-mails in JOUMEH_ADMIN_SETUP_EMAILS (comma list; default mohadesebrahim1329@gmail.com) are accepted.
//  Password ≥ 12 characters, typed twice, bcrypt (server/admin.ts hashPassword). Rate limited per IP and globally (in memory).
//  After an account is created the slot row in admin_setup closes the page for good: GET/POST /api/admin/setup → 404.
//  Nothing from the request body is ever logged; the allowed e-mail list is never sent to the browser.
// ============================================================================================================
import type { Express, Request, Response } from 'express';
import type { Db } from './db.js';
import { createAdmin, ADMIN_ROLES, MAX_ADMINS, PASSWORD_MIN, EMAIL_RE, type AdminRole } from './admin.js';

export const DEFAULT_SETUP_EMAILS = ['mohadesebrahim1329@gmail.com'];
export const SETUP_LIMITS = { windowMinutes: 15, perIp: 5, global: 20 };
export type SetupEnv = Record<string, string | undefined>;

export function setupConfig(env: SetupEnv = process.env) {
  const listed = (env.JOUMEH_ADMIN_SETUP_EMAILS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const h = env.JOUMEH_ADMIN_SETUP_WINDOW_HOURS;
  const hours = h === undefined || h.trim() === '' ? 24 : Number(h);
  return { emails: listed.length ? listed : DEFAULT_SETUP_EMAILS, emailsExplicit: listed.length > 0,
    reopen: env.JOUMEH_ADMIN_SETUP_REOPEN === '1', windowHours: Number.isFinite(hours) && hours > 0 ? hours : 0 };
}

export type SetupState = { open: false } | { open: true; slot: 1 | 2; role: AdminRole; closesAt: number };

export function mountAdminSetup(app: Express, db: Db, opts: { now: () => number; env?: SetupEnv; clientIp: (req: Request) => string }) {
  const cfg = setupConfig(opts.env);
  const startedAt = opts.now();
  const closesAt = startedAt + cfg.windowHours * 3_600_000;
  const hits = new Map<string, number[]>(); // ip → attempt timestamps (in memory; the page is short-lived and single-use)
  let global: number[] = [];

  const state = async (): Promise<SetupState> => {
    if (!cfg.windowHours || opts.now() > closesAt) return { open: false };
    const admins = (await db.all<{ role: string }>('SELECT role FROM admin_users'));
    const used = (await db.all<{ slot: number }>('SELECT slot FROM admin_setup')).map(r => Number(r.slot));
    if (admins.length === 0 && !used.includes(1)) return { open: true, slot: 1, role: 'owner', closesAt };
    if (cfg.reopen && cfg.emailsExplicit && admins.length === 1 && admins.length < MAX_ADMINS && !used.includes(2))
      return { open: true, slot: 2, role: admins.some(a => a.role === 'owner') ? 'admin' : 'owner', closesAt };
    return { open: false };
  };
  (app.locals as Record<string, unknown>).adminSetupOpen = async () => (await state()).open;

  const notFound = (res: Response) => res.status(404).json({ error: 'not_found' });
  const limited = (ip: string) => {
    const t = opts.now(), since = t - SETUP_LIMITS.windowMinutes * 60_000;
    const mine = (hits.get(ip) ?? []).filter(x => x > since); global = global.filter(x => x > since);
    if (mine.length >= SETUP_LIMITS.perIp || global.length >= SETUP_LIMITS.global) { hits.set(ip, mine); return true; }
    mine.push(t); global.push(t); hits.set(ip, mine); return false;
  };

  app.get('/api/admin/setup', async (_req, res) => {
    const s = await state();
    if (!s.open) return notFound(res);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: { open: true, role: s.role, roleLabel: ADMIN_ROLES[s.role], passwordMin: PASSWORD_MIN, closesAt: new Date(s.closesAt).toISOString() } });
  });

  app.post('/api/admin/setup', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!(await state()).open) return notFound(res);
    if (limited(opts.clientIp(req))) return res.status(429).json({ error: 'rate_limited', retryAfterMinutes: SETUP_LIMITS.windowMinutes });
    const b = req.body ?? {};
    const email = String(b.email ?? '').trim().toLowerCase(); const name = String(b.name ?? '').trim();
    const pw = typeof b.password === 'string' ? b.password : ''; const pw2 = typeof b.password2 === 'string' ? b.password2 : '';
    const f: Record<string, string> = {};
    if (!EMAIL_RE.test(email)) f.email = 'ایمیل معتبر نیست';
    if (!name || name.length > 80) f.name = 'نام نمایشی را وارد کنید (حداکثر ۸۰ نویسه)';
    if (pw.length < PASSWORD_MIN) f.password = `رمز عبور باید حداقل ${PASSWORD_MIN.toLocaleString('fa-IR')} نویسه باشد`;
    else if (pw.length > 200) f.password = 'رمز عبور بیش از حد طولانی است';
    if (pw !== pw2) f.password2 = 'دو رمز عبور یکسان نیستند';
    if (Object.keys(f).length) return res.status(400).json({ error: 'validation', fields: f });
    if (!cfg.emails.includes(email)) return res.status(403).json({ error: 'email_not_allowed', fields: { email: 'این ایمیل اجازه‌ی ساخت حساب مدیر را ندارد' } });
    // Re-check and claim the slot inside one transaction-guarded sequence: createAdmin enforces the 2-admin / single-Owner model,
    // and the admin_setup PRIMARY KEY (slot) refuses a second claim of the same slot.
    const s = await state();
    if (!s.open) return notFound(res);
    let id: number;
    try { id = await createAdmin(db, { email, name, password: pw, role: s.role }); }
    catch (e) { const code = (e as Error).message; return res.status(409).json({ error: ['admin_limit', 'email_exists', 'owner_exists'].includes(code) ? code : 'setup_failed' }); }
    try { await db.run('INSERT INTO admin_setup (slot, admin_id) VALUES (?, ?)', [s.slot, id]); }
    catch { await db.run('DELETE FROM admin_users WHERE id=? AND id NOT IN (SELECT admin_id FROM admin_setup)', [id]); return notFound(res); } // lost a race: undo own row only
    await db.run('INSERT INTO audit_log (admin_id,action,entity,entity_id,detail) VALUES (?,?,?,?,?)', [id, 'admin_setup', 'admin_user', String(id), `slot ${s.slot}, role ${s.role}`]);
    res.status(201).json({ data: { ok: true, role: s.role, roleLabel: ADMIN_ROLES[s.role] } });
  });
  return { state, closesAt };
}
