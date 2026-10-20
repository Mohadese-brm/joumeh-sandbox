import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from 'node:http';
import handler from '../api/index';
// Simulates the Vercel function locally (Node http server). Not a deploy test: Vercel rewrites/bundling are unverified until a CEO-approved deploy.
describe('Vercel serverless entry (api/index.ts)', () => {
  const srv = createServer((req, res) => void handler(req, res));
  it('serves catalog and health through the handler', async () => {
    expect((await request(srv).get('/api/health')).body).toEqual({ ok: true, sampleData: true });
    const r = await request(srv).get('/api/products?category=men'); expect(r.status).toBe(200); expect(r.body.total).toBe(16);
  });
  it('never returns the demo OTP code, even with JOUMEH_DEMO_OTP=1 set (R2-2)', async () => {
    const prev = process.env.JOUMEH_DEMO_OTP; process.env.JOUMEH_DEMO_OTP = '1';
    try { const r = await request(srv).post('/api/auth/otp/request').send({ phone: '09123333333' }); expect(r.status).toBe(201); expect(r.body.data).not.toHaveProperty('devCode'); }
    finally { if (prev === undefined) delete process.env.JOUMEH_DEMO_OTP; else process.env.JOUMEH_DEMO_OTP = prev; }
  });
  it('keeps state within one instance (cart round-trip)', async () => {
    const p = (await request(srv).get('/api/products/men-1')).body.data;
    const c = await request(srv).post('/api/cart/items').send({ variantId: p.variants[1].id });
    expect((await request(srv).get(`/api/cart/${c.body.data.cartId}`)).body.data.items).toHaveLength(1);
  });
});
