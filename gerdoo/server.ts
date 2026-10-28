// Gerdoo.cloud entry (admin-v1 release). Serves the Vite build from dist/ and the same Express API the Vercel function serves, on 0.0.0.0:$PORT.
// Database: openDb() — Postgres when DATABASE_URL is set (the bound Gerdoo add-on; migrated on start, never auto-seeded:
// load the real catalogue once with `npm run db:seed`), otherwise the seeded in-memory SQLite (resets on restart).
// Demo OTP and the demo admin login are forced OFF here: this is the live shop.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT ?? 8080);

openDb().then(db => {
  console.log(`Joumeh DB: ${db.dialect === 'pg' ? 'Postgres (DATABASE_URL)' : 'in-memory SQLite'}`);
  const api = createApp(db, { demoOtp: false, adminDemo: false });
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => { req.url = req.originalUrl; api(req, res, next); });
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  // gerdoo-update-2026-10-28: the one-time setup page answers with a real HTTP 404 once it has closed (server/admin-setup.ts).
  app.get(['/admin/setup', '/admin/setup/'], async (_req, res, next) => {
    try { const open = await (api.locals.adminSetupOpen as () => Promise<boolean>)(); res.setHeader('Cache-Control', 'no-store');
      res.status(open ? 200 : 404).sendFile(join(dist, 'index.html')); } catch (e) { next(e); }
  });
  app.get(/^\/(?!api\/|img\/|assets\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
  app.listen(port, '0.0.0.0', () => console.log(`Joumeh on 0.0.0.0:${port}`));
});
