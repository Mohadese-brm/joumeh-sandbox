import { describe, it, expect } from 'vitest';
import { createDb, all } from '../server/db';
import { SCHEMA } from '../db/schema';
import { readFileSync } from 'node:fs';
describe('database (sql.js, in-memory, sample seed)', () => {
  it('schema.ts is in sync with schema.sql', () => { expect(SCHEMA).toBe(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')); });
  it('creates all tables', async () => {
    const db = await createDb(false);
    const t = all<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").map(r => r.name);
    expect(t).toEqual(['addresses', 'carts', 'cart_items', 'categories', 'favorites', 'images', 'order_items', 'orders', 'otp_requests', 'payments', 'prices', 'products', 'returns', 'reviews', 'sessions', 'users', 'variants'].sort());
  });
  it('seeds labelled sample data only; one price row per product (BD-10)', async () => {
    const db = await createDb();
    expect(all(db, 'SELECT id FROM products WHERE is_sample=0')).toHaveLength(0);
    expect(all<{ n: number }>(db, 'SELECT COUNT(*) n FROM products')[0].n).toBe(43);
    expect(all<{ n: number }>(db, 'SELECT COUNT(*) n FROM prices')[0].n).toBe(43);
    expect(all<{ alt: string }>(db, 'SELECT alt FROM images LIMIT 1')[0].alt).toContain('داده نمونه');
  });
  it('enforces order status domains and foreign keys', async () => {
    const db = await createDb();
    expect(() => db.run("UPDATE orders SET payment_status='magic' WHERE id=10124")).toThrow();
    expect(() => db.run('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (999, 1, 1)')).toThrow();
    expect(() => db.run('INSERT INTO carts DEFAULT VALUES; INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (1, 1, 0)')).toThrow();
  });
  it('policy columns are NULL (BD-02/BD-06) on seeded orders', async () => {
    const db = await createDb();
    expect(all(db, 'SELECT id FROM orders WHERE shipping_fee IS NOT NULL OR vat_amount IS NOT NULL')).toHaveLength(0);
  });
});
