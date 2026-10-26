// Vercel serverless entry. Production = live shop (demo admin login forced OFF). Preview deployments (admin-v1) = DEMO admin, data resets.
// All /api/* requests are rewritten here (vercel.json). The DB is in-memory, seeded from db/catalog.ts (real catalogue),
// seeded once per function instance: writes (cart, orders, addresses) do not persist across cold starts/instances.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { adminDemoAllowed } from '../server/admin.js';
let appP: Promise<ReturnType<typeof createApp>> | null = null;
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  appP ??= createDb().then(db => createApp(db, { demoOtp: false, adminDemo: adminDemoAllowed() })); // admin-demo login: Vercel PREVIEW only, forced off in production (adminDemoAllowed) // R2-2: demo OTP can never be on in the Vercel function
  const app = await appP;
  return app(req as never, res as never);
}
