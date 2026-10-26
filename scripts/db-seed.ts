// npm run db:seed — migrates the Postgres in DATABASE_URL and loads the catalogue (db/catalog.ts) ONLY if it has no products yet.
// Never adds demo admins, demo orders or sample customers. The labelled placeholder overlay is OFF here unless JOUMEH_SAMPLE_PLACEHOLDERS=1.
import { connectPg, migrate } from '../server/db.js';
import { seed } from '../db/seed.js';
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1); }
const db = await connectPg(url, { max: 1 });
try {
  await migrate(db);
  const n = (await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM products'))!.n;
  if (n > 0) console.log(`products already present (${n}); catalogue seed skipped.`);
  else {
    const placeholders = process.env.JOUMEH_SAMPLE_PLACEHOLDERS === '1';
    await db.tx(t => seed(t, placeholders));
    console.log(`catalogue seeded: ${(await db.one<{ n: number }>('SELECT COUNT(*) AS n FROM products'))!.n} products (placeholders ${placeholders ? 'ON' : 'OFF'}).`);
  }
} finally { await db.close(); }
