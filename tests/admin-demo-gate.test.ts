import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { adminDemoAllowed } from '../server/admin';
import { createDb } from '../server/db';
import { createApp } from '../server/app';

describe('demo admin login gate (Vercel)', () => {
  it('production is always off, even with JOUMEH_ADMIN_DEMO=1', () => {
    expect(adminDemoAllowed({ VERCEL_ENV: 'production' })).toBe(false);
    expect(adminDemoAllowed({ VERCEL_ENV: 'production', JOUMEH_ADMIN_DEMO: '1' })).toBe(false);
  });
  it('preview is on; local only with JOUMEH_ADMIN_DEMO=1', () => {
    expect(adminDemoAllowed({ VERCEL_ENV: 'preview' })).toBe(true);
    expect(adminDemoAllowed({ JOUMEH_ADMIN_DEMO: '1' })).toBe(true);
    expect(adminDemoAllowed({})).toBe(false);
    expect(adminDemoAllowed({ VERCEL_ENV: 'development' })).toBe(false);
    expect(adminDemoAllowed({ JOUMEH_ADMIN_DEMO: '0' })).toBe(false);
  });
  it('app wired with the production gate returns 404 for the demo login', async () => {
    const app = createApp(await createDb(), { demoOtp: false, adminDemo: adminDemoAllowed({ VERCEL_ENV: 'production', JOUMEH_ADMIN_DEMO: '1' }) });
    expect((await request(app).post('/api/admin/auth/demo-login').send({ phone: '09120000001' })).status).toBe(404);
    const prev = createApp(await createDb(), { demoOtp: false, adminDemo: adminDemoAllowed({ VERCEL_ENV: 'preview' }) });
    expect((await request(prev).post('/api/admin/auth/demo-login').send({ phone: '09120000001' })).status).toBe(200);
  });
});
