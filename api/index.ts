// Vercel serverless entry (NOT deployed by the builder; deploy needs CEO approval).
// All /api/* requests are rewritten here (vercel.json). The DB is in-memory SAMPLE data («داده نمونه»),
// seeded once per function instance: writes (cart, orders, addresses) do not persist across cold starts/instances.
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createDb } from '../server/db.js';
import { createApp } from '../server/app.js';
let appP: Promise<ReturnType<typeof createApp>> | null = null;
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  appP ??= createDb().then(db => createApp(db, { demoOtp: false, adminDemo: false })); // admin-demo login can never be on in the Vercel function // R2-2: demo OTP can never be on in the Vercel function
  const app = await appP;
  return app(req as never, res as never);
}
