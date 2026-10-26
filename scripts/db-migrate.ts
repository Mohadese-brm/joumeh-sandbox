// npm run db:migrate — applies db/migrations to the Postgres in DATABASE_URL (local / Gerdoo later). Never seeds.
import { connectPg, migrate } from '../server/db.js';
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set (the in-memory SQLite needs no migration).'); process.exit(1); }
const db = await connectPg(url, { max: 1 });
try { const applied = await migrate(db); console.log(applied.length ? `applied: ${applied.join(', ')}` : 'up to date'); }
finally { await db.close(); }
