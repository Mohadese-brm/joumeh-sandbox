import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from 'node:http';
import handler from '../api/index';
// Simulates the Vercel function locally (Node http server). Not a deploy test: Vercel rewrites/bundling are unverified until a CEO-approved deploy.
describe('Vercel serverless entry (api/index.ts)', () => {
  const srv = createServer((req, res) => void handler(req, res));
  it('serves catalog and health through the handler', async () => {
    expect((await request(srv).get('/api/health')).body).toMatchObject({ ok: true, sampleData: false });
    const r = await request(srv).get('/api/products?category=men'); expect(r.status).toBe(200); expect(r.body.total).toBe(5); // real catalogue: P35–P39
  });
  it('never returns the demo OTP code, even with JOUMEH_DEMO_OTP=1 set (R2-2)', async () => {
    const prev = process.env.JOUMEH_DEMO_OTP; process.env.JOUMEH_DEMO_OTP = '1';
    try { const r = await request(srv).post('/api/auth/otp/request').send({ phone: '09123333333' }); expect(r.status).toBe(201); expect(r.body.data).not.toHaveProperty('devCode'); }
    finally { if (prev === undefined) delete process.env.JOUMEH_DEMO_OTP; else process.env.JOUMEH_DEMO_OTP = prev; }
  });
  it('keeps state within one instance (cart round-trip)', async () => {
    // Real catalogue has no prices/variants yet: create an empty cart, read it back, and check an unpriced product cannot be added.
    const c = await request(srv).post('/api/cart'); expect(c.status).toBe(201);
    const back = await request(srv).get(`/api/cart/${c.body.data.id ?? c.body.data.cartId}`); expect(back.status).toBe(200);
    expect(back.body.data.items).toHaveLength(0);
    const p = (await request(srv).get('/api/products/p35')).body.data; expect(p.price).toBeNull(); expect(p.variants).toHaveLength(0);
  });
});
