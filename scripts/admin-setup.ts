// npm run admin:setup — ONE-TIME creation of the real admin accounts in the Postgres in DATABASE_URL.
// v1 model: at most two admins, same full access; the first one created is the Owner. Passwords are typed at runtime
// (hidden on a terminal), hashed with bcrypt and never printed, logged or stored anywhere else.
import { createInterface } from 'node:readline';
import { connectPg, migrate } from '../server/db.js';
import { createAdmin, MAX_ADMINS, PASSWORD_MIN, EMAIL_RE, ADMIN_ROLES } from '../server/admin.js';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set. Admin accounts are only created in the real (Postgres) database.'); process.exit(1); }

const tty = !!process.stdin.isTTY;
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: tty });
const lines: string[] = []; let waiting: ((s: string) => void) | null = null; let closed = false;
rl.on('line', l => { if (waiting) { const w = waiting; waiting = null; w(l); } else lines.push(l); });
rl.on('close', () => { closed = true; if (waiting) waiting(''); });
let muted = false;
const out = process.stdout.write.bind(process.stdout);
(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => { if (!muted || s.includes('\n')) out(muted ? '\n' : s); };
const ask = (q: string, hidden = false) => new Promise<string>(res => {
  process.stdout.write(q); muted = hidden && tty;
  const done = (s: string) => { muted = false; res(s.trim()); };
  if (lines.length) done(lines.shift()!); else if (closed) done(''); else waiting = done;
});

const db = await connectPg(url, { max: 1 });
try {
  await migrate(db);
  const existing = await db.all<{ email: string; role: string }>('SELECT email, role FROM admin_users ORDER BY id');
  if (existing.length >= MAX_ADMINS) { console.error(`There are already ${existing.length} admin accounts (v1 limit ${MAX_ADMINS}). Nothing changed.`); process.exitCode = 1; }
  else {
    const role = existing.some(a => a.role === 'owner') ? 'admin' : 'owner';
    console.log(`Creating the ${role === 'owner' ? 'Owner' : 'second admin'} account (${ADMIN_ROLES[role]}). Existing: ${existing.length}/${MAX_ADMINS}.`);
    const email = (await ask('E-mail: ')).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error('invalid e-mail');
    const name = await ask('Display name: ');
    if (!name) throw new Error('name is required');
    const pw = await ask(`Password (min ${PASSWORD_MIN} characters, hidden): `, true);
    const pw2 = await ask('Repeat password: ', true);
    if (pw.length < PASSWORD_MIN) throw new Error(`password must be at least ${PASSWORD_MIN} characters`);
    if (pw !== pw2) throw new Error('passwords do not match');
    const id = await createAdmin(db, { email, name, password: pw, role });
    console.log(`Created admin #${id} ${email} (${role}).`);
  }
} catch (e) { console.error(`admin:setup failed: ${(e as Error).message}`); process.exitCode = 1; }
finally { rl.close(); await db.close(); }
