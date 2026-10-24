import initSqlJs, { type Database } from 'sql.js';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { SCHEMA } from '../db/schema.js';
import { seed } from '../db/seed.js';
const require = createRequire(import.meta.url);
// Resolve the wasm next to sql.js so it works locally and in a Vercel function bundle (see vercel.json includeFiles).
const wasmDir = dirname(require.resolve('sql.js/dist/sql-wasm.wasm'));
let SQLp: ReturnType<typeof initSqlJs> | null = null;
/** In-memory SQLite seeded with the real catalogue (db/catalog.ts). Carts, orders, accounts reset on restart / serverless cold start;
 *  the catalogue itself comes back from the seed file. Pass a function to seed something else (tests use the old sample fixture). */
export async function createDb(withSeed: boolean | ((db: Database) => void) = true): Promise<Database> {
  SQLp ??= initSqlJs({ locateFile: f => join(wasmDir, f) });
  const SQL = await SQLp;
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  if (typeof withSeed === 'function') withSeed(db); else if (withSeed) seed(db);
  return db;
}
export function all<T = Record<string, unknown>>(db: Database, sql: string, params: unknown[] = []): T[] {
  const st = db.prepare(sql); st.bind(params as never); const out: T[] = [];
  while (st.step()) out.push(st.getAsObject() as T); st.free(); return out;
}
