import { describe, it, expect } from 'vitest';
import { createDb, toPg } from '../server/db';
import { MIGRATIONS } from '../db/migrations';
import { readFileSync, readdirSync } from 'node:fs';
import { sampleSeed } from './fixtures/sample-seed';
const dialect = process.env.JOUMEH_TEST_PG_URL ? 'postgres (local)' : 'sql.js, in-memory';
describe(`database (${dialect}, sample test fixture)`, () => {
  it('migrations.ts is in sync with db/migrations/*.sql (npm run schema)', () => {
    const dir = new URL('../db/migrations/', import.meta.url);
    const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    expect(MIGRATIONS.map(m => m.id)).toEqual(files.map(f => f.replace(/\.sql$/, '')));
    for (const f of files) expect(MIGRATIONS.find(m => `${m.id}.sql` === f)!.sqlite).toBe(readFileSync(new URL(f, dir), 'utf8'));
  });
  it('creates all tables', async () => {
    const db = await createDb(false);
    expect(await db.tables()).toEqual(['addresses', 'admin_login_attempts', 'admin_sessions', 'admin_users', 'audit_log', 'content_home', 'content_pages', 'customer_notes', 'order_events', 'order_notes', 'carts', 'cart_items', 'categories', 'favorites', 'images', 'inventory_movements', 'order_items', 'orders', 'otp_requests', 'payments', 'prices', 'products', 'returns', 'reviews', 'schema_migrations', 'sessions', 'users', 'variants'].sort());
    await db.close();
  });
  it('seeds labelled sample data only; one price row per product (BD-10)', async () => {
    const db = await createDb(sampleSeed);
    expect(await db.all('SELECT id FROM products WHERE is_sample=0')).toHaveLength(0);
    expect((await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM products'))!.n).toBe(43);
    expect((await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM prices'))!.n).toBe(43);
    expect((await db.one<{ alt: string }>('SELECT alt FROM images ORDER BY id LIMIT 1'))!.alt).toContain('داده نمونه');
    await db.close();
  });
  it('enforces order status domains and foreign keys', async () => {
    const db = await createDb(sampleSeed);
    await expect(db.run("UPDATE orders SET payment_status='magic' WHERE id=10124")).rejects.toThrow();
    await expect(db.run('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (999, 1, 1)')).rejects.toThrow();
    await expect(db.run('INSERT INTO carts DEFAULT VALUES; INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (1, 1, 0)')).rejects.toThrow();
    await db.close();
  });
  it('policy columns are NULL (BD-02/BD-06) on seeded orders', async () => {
    const db = await createDb(sampleSeed);
    expect(await db.all('SELECT id FROM orders WHERE shipping_fee IS NOT NULL OR vat_amount IS NOT NULL')).toHaveLength(0);
    await db.close();
  });
  it('migrations are recorded and idempotent', async () => {
    const db = await createDb(false);
    expect((await db.all<{ id: string }>('SELECT id FROM schema_migrations ORDER BY id')).map(r => r.id)).toEqual(MIGRATIONS.map(m => m.id));
    const { migrate } = await import('../server/db');
    expect(await migrate(db)).toEqual([]);
    await db.close();
  });
  it('insert returns the new id; tx rolls back on error', async () => {
    const db = await createDb(false);
    const id = await db.insert('INSERT INTO categories (slug,name) VALUES (?,?)', ['t1', 'T1']);
    expect((await db.one<{ id: number }>('SELECT id FROM categories WHERE slug=?', ['t1']))!.id).toBe(id);
    await expect(db.tx(async t => { await t.run('INSERT INTO categories (slug,name) VALUES (?,?)', ['t2', 'T2']); throw new Error('boom'); })).rejects.toThrow('boom');
    expect(await db.one('SELECT id FROM categories WHERE slug=?', ['t2'])).toBeUndefined();
    await db.close();
  });
});
describe('toPg (SQLite → Postgres SQL translation)', () => {
  it('placeholders, string literals and quoted identifiers', () => {
    expect(toPg("SELECT * FROM t WHERE a=? AND b='what?' AND c=?")).toBe(`SELECT * FROM t WHERE a=$1 AND b='what?' AND c=$2`);
    expect(toPg("SELECT 'it''s ?' AS x, ?")).toBe(`SELECT 'it''s ?' AS x, $1`);
  });
  it('dialect functions', () => {
    expect(toPg(`UPDATE t SET at=datetime('now')`)).toContain(`to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')`);
    expect(toPg('INSERT OR IGNORE INTO s (a) VALUES (?)')).toBe('INSERT INTO s (a) VALUES ($1) ON CONFLICT DO NOTHING');
    expect(toPg('SELECT instr(a, ?) FROM t WHERE n LIKE ?')).toBe('SELECT strpos(a, $1) FROM t WHERE n ILIKE $2');
    expect(toPg('SELECT a.order_number AS orderNumber, b AS n FROM t')).toBe('SELECT a.order_number AS "orderNumber", b AS n FROM t');
  });
});
