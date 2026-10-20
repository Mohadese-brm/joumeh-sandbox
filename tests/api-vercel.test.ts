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
  it('keeps state within one instance (cart round-trip)', async () => {
    const p = (await request(srv).get('/api/products/men-1')).body.data;
    const c = await request(srv).post('/api/cart/items').send({ variantId: p.variants[1].id });
    expect((await request(srv).get(`/api/cart/${c.body.data.cartId}`)).body.data.items).toHaveLength(1);
  });
});
