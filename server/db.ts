// Data-access adapter (admin-v1). ALL SQL in the app goes through this small async interface, so the same code runs on
//   • SQLite — in-memory sql.js (local dev, tests, Vercel preview; resets on restart / cold start), or
//   • Postgres — via the `pg` driver when DATABASE_URL is set (the coming Gerdoo database).
// App SQL is written once in the SQLite dialect with `?` placeholders; toPg() translates the few differences for Postgres.
import initSqlJs, { type Database } from 'sql.js';
import pg from 'pg';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { MIGRATIONS } from '../db/migrations.js';
import { seed } from '../db/seed.js';
const require = createRequire(import.meta.url);

export type Row = Record<string, unknown>;
export interface Db {
  readonly dialect: 'sqlite' | 'pg';
  /** true = throwaway (in-memory SQLite, test schema). Demo data is only ever seeded into an ephemeral database. */
  readonly ephemeral: boolean;
  all<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  one<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
  /** INSERT/UPDATE/DELETE. Without params a string may hold several statements. */
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  /** INSERT that returns the new row id (SQLite last_insert_rowid / Postgres RETURNING id). */
  insert(sql: string, params?: unknown[]): Promise<number>;
  /** Runs fn atomically (one connection on Postgres). */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  /** SQL for the smaller of two expressions (SQLite MIN(a,b) / Postgres LEAST(a,b)). */
  least(a: string, b: string): string;
  /** User table names, sorted. */
  tables(): Promise<string[]>;
  /** After inserting explicit ids (seeds): move Postgres identity sequences past MAX(id). No-op on SQLite. */
  syncIds(): Promise<void>;
  close(): Promise<void>;
}
export type Seeder = (db: Db) => void | Promise<void>;

// ---------- SQLite (sql.js) ----------
const wasmDir = dirname(require.resolve('sql.js/dist/sql-wasm.wasm')); // see vercel.json includeFiles
let SQLp: ReturnType<typeof initSqlJs> | null = null;
class SqliteDb implements Db {
  readonly dialect = 'sqlite' as const;
  readonly ephemeral = true;
  constructor(readonly raw: Database) {}
  async all<T = Row>(sql: string, params: unknown[] = []) {
    const st = this.raw.prepare(sql); const out: T[] = [];
    try { st.bind(params as never); while (st.step()) out.push(st.getAsObject() as T); } finally { st.free(); }
    return out;
  }
  async one<T = Row>(sql: string, params: unknown[] = []) { return (await this.all<T>(sql, params))[0]; }
  async run(sql: string, params: unknown[] = []) { this.raw.run(sql, params.length ? params as never : undefined); return { changes: this.raw.getRowsModified() }; }
  async insert(sql: string, params: unknown[] = []) { this.raw.run(sql, params as never); return (await this.one<{ id: number }>('SELECT last_insert_rowid() AS id'))!.id; }
  // sql.js is synchronous and single-connection: every await inside fn resolves as a microtask, so no other request interleaves.
  async tx<T>(fn: (db: Db) => Promise<T>) {
    this.raw.run('BEGIN');
    try { const r = await fn(this); this.raw.run('COMMIT'); return r; } catch (e) { this.raw.run('ROLLBACK'); throw e; }
  }
  least(a: string, b: string) { return `MIN(${a}, ${b})`; }
  async tables() { return (await this.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).map(r => r.name); }
  async syncIds() {}
  async close() { this.raw.close(); }
}

// ---------- Postgres (pg) ----------
pg.types.setTypeParser(20, v => Number(v));   // int8 (COUNT/SUM, BIGINT ms timestamps) → number, as on SQLite
pg.types.setTypeParser(1700, v => Number(v)); // numeric (AVG) → number
const PG_NOW = `to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')`;
/** SQLite-dialect app SQL → Postgres. Literals ('…') and quoted identifiers ("…") are never touched. */
export function toPg(sql: string): string {
  let s = sql.replace(/datetime\('now'\)/g, PG_NOW);
  const ignore = /^\s*INSERT OR IGNORE INTO/i.test(s);
  if (ignore) s = s.replace(/INSERT OR IGNORE INTO/i, 'INSERT INTO');
  let n = 0;
  s = s.split(/('(?:[^']|'')*'|"(?:[^"]|"")*")/).map((part, i) => i % 2 ? part : part
    .replace(/\?/g, () => `$${++n}`)
    .replace(/\bLIKE\b/g, 'ILIKE')            // SQLite LIKE is case-insensitive for ASCII
    .replace(/\binstr\(/g, 'strpos(')
    .replace(/\bAS ([A-Za-z_][A-Za-z0-9_]*)\b/g, (m, id: string) => (/[a-z]/.test(id) && /[A-Z]/.test(id) ? `AS "${id}"` : m)) // keep camelCase keys
  ).join('');
  return ignore ? `${s.replace(/;\s*$/, '')} ON CONFLICT DO NOTHING` : s;
}
type Q = pg.Pool | pg.PoolClient;
const norm = (p: unknown[]) => p.map(v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
class PgDb implements Db {
  readonly dialect = 'pg' as const;
  get ephemeral() { return !!this.onClose; }
  constructor(private q: Q, private pool: pg.Pool, private onClose?: () => Promise<void>) {}
  private async query(sql: string, params: unknown[]) {
    const r = await this.q.query(toPg(sql), params.length ? norm(params) : undefined);
    return (Array.isArray(r) ? r[r.length - 1] : r) as pg.QueryResult;
  }
  async all<T = Row>(sql: string, params: unknown[] = []) { return (await this.query(sql, params)).rows as T[]; }
  async one<T = Row>(sql: string, params: unknown[] = []) { return (await this.all<T>(sql, params))[0]; }
  async run(sql: string, params: unknown[] = []) { return { changes: (await this.query(sql, params)).rowCount ?? 0 }; }
  async insert(sql: string, params: unknown[] = []) {
    const r = await this.q.query(`${toPg(sql)} RETURNING id`, norm(params)); return r.rows[0]?.id as number;
  }
  async tx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
    if (this.q !== this.pool) return fn(this); // already inside a transaction
    const c = await this.pool.connect();
    try { await c.query('BEGIN'); const r = await fn(new PgDb(c, this.pool, this.onClose)); await c.query('COMMIT'); return r; }
    catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  }
  least(a: string, b: string) { return `LEAST(${a}, ${b})`; }
  async tables() { return (await this.all<{ name: string }>(`SELECT table_name AS name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE' ORDER BY table_name`)).map(r => r.name); }
  async syncIds() {
    for (const { t } of await this.all<{ t: string }>(`SELECT table_name AS t FROM information_schema.columns WHERE table_schema=current_schema() AND column_name='id' AND is_identity='YES'`))
      await this.q.query(`SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), GREATEST(COALESCE(MAX(id), 0), 1), MAX(id) IS NOT NULL) FROM "${t}"`);
  }
  async close() { await this.onClose?.(); await this.pool.end(); }
}
/** Connects to Postgres. `schema` (tests only) isolates every connection in its own throwaway schema. */
export async function connectPg(url: string, opts: { schema?: string; max?: number } = {}): Promise<Db> {
  const pool = new pg.Pool({ connectionString: url, max: opts.max ?? 5, allowExitOnIdle: true,
    ...(opts.schema ? { options: `-c search_path=${opts.schema}` } : {}) });
  let onClose: (() => Promise<void>) | undefined;
  if (opts.schema) {
    await pool.query(`CREATE SCHEMA ${opts.schema}`);
    onClose = async () => { await pool.query(`DROP SCHEMA ${opts.schema} CASCADE`); };
  }
  return new PgDb(pool, pool, onClose);
}

// ---------- Migrations ----------
/** Applies db/migrations.ts in order; applied ids are recorded in schema_migrations. Returns the ids applied now. */
export async function migrate(db: Db): Promise<string[]> {
  return db.tx(async t => {
    if (t.dialect === 'pg') await t.run('SELECT pg_advisory_xact_lock(7243100)'); // concurrent cold starts migrate one at a time
    await t.run('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
    const done = new Set((await t.all<{ id: string }>('SELECT id FROM schema_migrations')).map(r => r.id));
    const applied: string[] = [];
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await t.run(t.dialect === 'pg' ? m.pg : m.sqlite);
      await t.run(`INSERT INTO schema_migrations (id, applied_at) VALUES (?, datetime('now'))`, [m.id]);
      applied.push(m.id);
    }
    return applied;
  });
}

/** Fresh, migrated, seeded throwaway database (tests and the in-memory preview). In-memory SQLite by default;
 *  with JOUMEH_TEST_PG_URL set (npm run test:pg) each call gets its own schema in that LOCAL Postgres instead.
 *  Pass a function to seed something else (tests use the old sample fixture). */
export async function createDb(withSeed: boolean | Seeder = true): Promise<Db> {
  let db: Db;
  const testPg = process.env.JOUMEH_TEST_PG_URL;
  if (testPg) db = await connectPg(testPg, { schema: `t_${randomBytes(6).toString('hex')}`, max: 2 });
  else {
    SQLp ??= initSqlJs({ locateFile: f => join(wasmDir, f) });
    const raw = new (await SQLp).Database();
    raw.run('PRAGMA foreign_keys = ON');
    db = new SqliteDb(raw);
  }
  await migrate(db);
  if (typeof withSeed === 'function') await withSeed(db); else if (withSeed) await seed(db);
  await db.syncIds();
  return db;
}
/** Runtime database: Postgres when DATABASE_URL is set (migrated on start, never auto-seeded — use `npm run db:seed`),
 *  otherwise the seeded in-memory SQLite used today. */
export async function openDb(env: Record<string, string | undefined> = process.env): Promise<Db> {
  if (!env.DATABASE_URL) return createDb();
  const db = await connectPg(env.DATABASE_URL);
  await migrate(db);
  return db;
}
