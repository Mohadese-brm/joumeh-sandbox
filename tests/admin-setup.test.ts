// gerdoo-update-2026-10-28: one-time /admin/setup page (server/admin-setup.ts). Runs on sql.js and (npm run test:pg) on Postgres.
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb, type Db } from '../server/db';
import { createApp } from '../server/app';
import { createAdmin, ADMIN_COOKIE } from '../server/admin';
import { setupConfig, DEFAULT_SETUP_EMAILS } from '../server/admin-setup';

const OWNER = 'mohadesebrahim1329@gmail.com';
const PW = 'correct-horse-battery';
const ok = (over: Record<string, string> = {}) => ({ email: OWNER, name: 'محدثه', password: PW, password2: PW, ...over });
let db: Db; let clock = 1_800_000_000_000;
const mk = (env: Record<string, string | undefined> = {}) => createApp(db, { now: () => clock, adminDemo: false, env });
beforeEach(async () => { db = await createDb(); clock = 1_800_000_000_000; });

describe('admin setup page (one-time)', () => {
  it('default config: allowed e-mail is hers, 24 h window, re-open off', () => {
    expect(DEFAULT_SETUP_EMAILS).toEqual([OWNER]);
    expect(setupConfig({})).toMatchObject({ emails: [OWNER], emailsExplicit: false, reopen: false, windowHours: 24 });
    expect(setupConfig({ JOUMEH_ADMIN_SETUP_WINDOW_HOURS: '0' }).windowHours).toBe(0);
  });
  it('open with 0 admins → creates the Owner (bcrypt), then is closed for good (404 on GET and POST, even after a restart)', async () => {
    const app = mk();
    const g = await request(app).get('/api/admin/setup');
    expect(g.status).toBe(200); expect(g.body.data).toMatchObject({ open: true, role: 'owner', passwordMin: 12 });
    expect(JSON.stringify(g.body)).not.toContain(OWNER); // the allowed list is never sent to the browser
    const r = await request(app).post('/api/admin/setup').send(ok({ email: OWNER.toUpperCase() }));
    expect(r.status).toBe(201); expect(r.body.data.role).toBe('owner');
    const a = (await db.one<{ email: string; role: string; password_hash: string }>('SELECT email, role, password_hash FROM admin_users'))!;
    expect(a.email).toBe(OWNER); expect(a.role).toBe('owner'); expect(a.password_hash).toMatch(/^\$2[aby]\$/); expect(a.password_hash).not.toContain(PW);
    expect(JSON.stringify(r.body)).not.toContain(PW);
    expect((await db.one<{ action: string; detail: string }>(`SELECT action, detail FROM audit_log WHERE action='admin_setup'`))!.detail).not.toContain(PW);
    expect((await request(app).get('/api/admin/setup')).status).toBe(404);
    expect((await request(app).post('/api/admin/setup').send(ok({ email: OWNER }))).status).toBe(404);
    const restarted = mk(); // new server process, same database
    expect((await request(restarted).get('/api/admin/setup')).status).toBe(404);
    expect(await (restarted.locals.adminSetupOpen as () => Promise<boolean>)()).toBe(false);
    // the new account signs in normally
    const l = await request(app).post('/api/admin/auth/login').send({ email: OWNER, password: PW });
    expect(l.status).toBe(200); expect(String(l.headers['set-cookie'])).toContain(ADMIN_COOKIE + '=');
  });
  it('wrong e-mail is rejected (403) and creates nothing; validation: ≥ 12 chars, typed twice', async () => {
    const app = mk();
    const w = await request(app).post('/api/admin/setup').send(ok({ email: 'someone@example.com' }));
    expect(w.status).toBe(403); expect(w.body.error).toBe('email_not_allowed');
    const s = await request(app).post('/api/admin/setup').send(ok({ password: 'short-pw', password2: 'short-pw' }));
    expect(s.status).toBe(400); expect(s.body.fields.password).toBeTruthy();
    const m = await request(app).post('/api/admin/setup').send(ok({ password2: PW + 'x' }));
    expect(m.status).toBe(400); expect(m.body.fields.password2).toBeTruthy();
    expect((await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM admin_users'))!.n).toBe(0);
    expect((await request(app).get('/api/admin/setup')).status).toBe(200); // still open
  });
  it('closed (404) when an admin already exists (e.g. made with npm run admin:setup) and the re-open flag is off', async () => {
    await createAdmin(db, { email: OWNER, name: 'x', password: PW, role: 'owner' });
    const app = mk();
    expect((await request(app).get('/api/admin/setup')).status).toBe(404);
    expect((await request(app).post('/api/admin/setup').send(ok({ email: 'second@example.com' }))).status).toBe(404);
  });
  it('re-open flag: only for the SECOND account, only with an explicit e-mail list, then closed for good', async () => {
    const first = await request(mk()).post('/api/admin/setup').send(ok()); expect(first.status).toBe(201);
    expect((await request(mk({ JOUMEH_ADMIN_SETUP_REOPEN: '1' })).get('/api/admin/setup')).status).toBe(404); // flag alone is not enough
    const app = mk({ JOUMEH_ADMIN_SETUP_REOPEN: '1', JOUMEH_ADMIN_SETUP_EMAILS: 'partner@example.com' });
    const g = await request(app).get('/api/admin/setup'); expect(g.status).toBe(200); expect(g.body.data.role).toBe('admin');
    expect((await request(app).post('/api/admin/setup').send(ok({ email: OWNER }))).status).toBe(403); // not in the new list
    const r = await request(app).post('/api/admin/setup').send(ok({ email: 'partner@example.com', name: 'شریک' }));
    expect(r.status).toBe(201); expect(r.body.data.role).toBe('admin');
    expect((await db.all('SELECT id FROM admin_users')).length).toBe(2);
    expect((await request(app).get('/api/admin/setup')).status).toBe(404);
    expect((await request(mk({ JOUMEH_ADMIN_SETUP_REOPEN: '1', JOUMEH_ADMIN_SETUP_EMAILS: 'third@example.com' })).get('/api/admin/setup')).status).toBe(404); // max 2
  });
  it('the setup window expires N hours after start (default 24; 0 = never open)', async () => {
    const app = mk({ JOUMEH_ADMIN_SETUP_WINDOW_HOURS: '2' });
    expect((await request(app).get('/api/admin/setup')).status).toBe(200);
    clock += 2 * 3_600_000 + 1;
    expect((await request(app).get('/api/admin/setup')).status).toBe(404);
    expect((await request(app).post('/api/admin/setup').send(ok())).status).toBe(404);
    expect((await request(mk({ JOUMEH_ADMIN_SETUP_WINDOW_HOURS: '0' })).get('/api/admin/setup')).status).toBe(404);
  });
  it('is rate limited per IP (5 / 15 min) and refuses another origin (CSRF)', async () => {
    const app = mk();
    for (let i = 0; i < 5; i++) expect((await request(app).post('/api/admin/setup').set('X-Forwarded-For', '203.0.113.9').send(ok({ email: `x${i}@example.com` }))).status).toBe(403);
    const r = await request(app).post('/api/admin/setup').set('X-Forwarded-For', '203.0.113.9').send(ok());
    expect(r.status).toBe(429);
    expect((await request(app).post('/api/admin/setup').set('Origin', 'https://evil.example').send(ok())).status).toBe(403);
    clock += 15 * 60_000 + 1;
    expect((await request(app).post('/api/admin/setup').set('X-Forwarded-For', '203.0.113.9').send(ok())).status).toBe(201);
  });
  it('a preview with demo admins never shows the page', async () => {
    const preview = createApp(await createDb(), { adminDemo: true });
    expect((await request(preview).get('/api/admin/setup')).status).toBe(404);
  });
});
