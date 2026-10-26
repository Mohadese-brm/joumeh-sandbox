import { openDb } from './db.js';
import { createApp } from './app.js';
const port = Number(process.env.PORT ?? 3001);
// JOUMEH_ADMIN_DEMO=1 seeds the two DEMO admin accounts (local only). DATABASE_URL set → Postgres (run `npm run db:seed` first), else in-memory SQLite.
openDb().then(db => createApp(db).listen(port, '127.0.0.1', () => console.log(`local API on 127.0.0.1:${port}${process.env.JOUMEH_ADMIN_DEMO === '1' ? ' · ADMIN DEMO on' : ''}`)));
