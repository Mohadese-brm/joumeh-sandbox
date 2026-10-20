import { describe, it, expect } from 'vitest';
import { createDb, all } from '../server/db';
describe('DB schema + seed', () => {
  it('has all required tables', async () => {
    const db = await createDb(false);
    const t = all<{ name: string }>(db, "SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name);
    for (const n of ['products','variants','images','prices','categories','carts','cart_items','orders']) expect(t).toContain(n);
  });
  it('seed is labelled sample data', async () => {
    const db = await createDb();
    expect(all(db, 'SELECT * FROM products WHERE is_sample=0')).toHaveLength(0);
    expect(all<{ name: string }>(db, 'SELECT name FROM categories')[0].name).toContain('داده نمونه');
  });
});
