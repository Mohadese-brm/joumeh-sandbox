// npm run test:pg — runs the whole vitest suite against a LOCAL Postgres (default: the throwaway cluster on 127.0.0.1:54329).
// Every createDb() gets its own schema t_<random>; they are dropped afterwards. Never point this at a hosted database.
import { spawnSync } from 'node:child_process';
import pg from 'pg';
const url = process.env.JOUMEH_TEST_PG_URL || 'postgres://postgres@127.0.0.1:54329/joumeh_test';
if (!/@(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) { console.error('test:pg only runs against a local Postgres.'); process.exit(1); }
const clean = async () => { const c = new pg.Client({ connectionString: url }); await c.connect();
  for (const { n } of (await c.query(`SELECT nspname AS n FROM pg_namespace WHERE nspname LIKE 't\\_%'`)).rows) await c.query(`DROP SCHEMA "${n}" CASCADE`);
  await c.end(); };
await clean();
const r = spawnSync('npx', ['vitest', 'run', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, JOUMEH_TEST_PG_URL: url } });
await clean();
process.exit(r.status ?? 1);
