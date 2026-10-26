import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDb, all } from '../server/db';
import { createApp } from '../server/app';
import { seed } from '../db/seed';
import { CATALOG } from '../db/catalog';
import { SAMPLE_TAG, withSamplePlaceholders, SAMPLE_RATING } from '../db/sample-placeholder-data';
import { STORY_TITLE, STORY_PARAGRAPHS } from '../src/content/story';
import { DEMO_ANSWERS, DEMO_LABEL } from '../src/content/support-demo';

// design-batch-2026-10-26
describe('«قصه ما» text', () => {
  it('matches the CEO-supplied text byte for byte', () => {
    const ref = readFileSync(join(__dirname, 'fixtures/story-text.txt'), 'utf8').replace(/\n$/, '');
    expect([STORY_TITLE, ...STORY_PARAGRAPHS].join('\n')).toBe(ref);
    expect(STORY_PARAGRAPHS).toHaveLength(6);
  });
});

describe('sample placeholder data (single switch, clearly labelled)', () => {
  const prev = process.env.JOUMEH_SAMPLE_PLACEHOLDERS;
  afterEach(() => { process.env.JOUMEH_SAMPLE_PLACEHOLDERS = prev; });
  it('fills price, sizes, colours, description for every product and labels them', () => {
    const s = withSamplePlaceholders(CATALOG);
    expect(s).toHaveLength(CATALOG.length);
    for (const p of s) {
      expect(p.price).toBeGreaterThan(0); expect(p.sizes.length).toBeGreaterThan(0);
      expect(p.description).toContain(SAMPLE_TAG);
      for (const c of p.colours ?? []) expect(c.name).toContain('نمونه');
    }
  });
  it('seed(db, true) flags every product is_sample=1 and makes them purchasable; reviews + rating are sample-labelled', async () => {
    process.env.JOUMEH_SAMPLE_PLACEHOLDERS = '1';
    const db = await createDb(d => seed(d, true));
    expect(all<{ n: number }>(db, 'SELECT COUNT(*) n FROM products WHERE is_sample=1')[0].n).toBe(CATALOG.length);
    expect(all<{ n: number }>(db, 'SELECT COUNT(*) n FROM prices')[0].n).toBeGreaterThan(0);
    const app = createApp(db);
    const list = (await request(app).get('/api/products?category=women')).body.data;
    expect(list.length).toBeGreaterThan(0); expect(list.every((p: { price: number }) => p.price > 0)).toBe(true);
    const d = (await request(app).get('/api/products/p08')).body;
    expect(d.sampleData).toBe(true); expect(d.data.rating).toMatchObject({ average: SAMPLE_RATING.average, count: SAMPLE_RATING.count, sample: true });
    expect(d.data.variants.find((v: { size: string }) => v.size === 'XXL')?.available).toBe(0);
    const r = (await request(app).get('/api/products/p08/reviews')).body.data;
    expect(r.sample).toBe(true); expect(r.reviews.every((x: { name: string }) => x.name.includes('نمونه'))).toBe(true);
    expect((await request(app).get('/api/health')).body.sampleData).toBe(true);
  });
  it('second hover image never repeats the first one', async () => {
    process.env.JOUMEH_SAMPLE_PLACEHOLDERS = '1';
    const app = createApp(await createDb(d => seed(d, true)));
    const list = (await request(app).get('/api/products?category=women&page=1')).body.data as { imageThumb?: string; imageThumb2?: string | null }[];
    for (const p of list) if (p.imageThumb2) expect(p.imageThumb2).not.toBe(p.imageThumb);
    expect(list.some(p => p.imageThumb2)).toBe(true);
  });
  it('cart add → update → remove works with sample prices', async () => {
    process.env.JOUMEH_SAMPLE_PLACEHOLDERS = '1';
    const app = createApp(await createDb(d => seed(d, true)));
    const v = (await request(app).get('/api/products/p08')).body.data.variants.find((x: { available: number }) => x.available);
    const c = (await request(app).post('/api/cart').send({})).body.data;
    const id = c.cartId ?? c.id;
    let r = await request(app).post('/api/cart/items').send({ cartId: id, variantId: v.id, quantity: 1 });
    expect(r.status).toBeLessThan(300); const item = r.body.data.items[0];
    r = await request(app).patch(`/api/cart/${id}/items/${item.id}`).send({ quantity: 3 });
    expect(r.body.data.items[0].quantity).toBe(3); expect(r.body.data.totals.count).toBe(3);
    r = await request(app).delete(`/api/cart/${id}/items/${item.id}`);
    expect(r.body.data.items).toHaveLength(0);
  });
});

describe('support demo chat content', () => {
  it('is labelled demo and states no shipping/returns/payment policy', () => {
    expect(DEMO_LABEL).toContain('دمو');
    for (const a of DEMO_ANSWERS) expect(a.a).not.toMatch(/[۰-۹0-9]+\s*(روز|ساعت|تومان|ریال)/);
  });
});
