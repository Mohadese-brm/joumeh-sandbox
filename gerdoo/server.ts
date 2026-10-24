// Gerdoo.cloud entry (added for the Vercel → Gerdoo migration; does not change app code).
// Serves the Vite build from dist/ and the same Express API the Vercel function serves, on 0.0.0.0:$PORT.
// DB is in-memory sql.js seeded from db/catalog.ts (real catalogue). Carts/orders/accounts reset when the container restarts.
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDb } from '../server/db.js';
import { createApp } from '../server/app.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT ?? 8080);

createDb().then(db => {
  const api = createApp(db, { demoOtp: false }); // same as the Vercel handler: demo OTP never on
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res, next) => { req.url = req.originalUrl; api(req, res, next); });
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api\/|img\/|assets\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
  app.listen(port, '0.0.0.0', () => console.log(`Joumeh on 0.0.0.0:${port}`));
});
