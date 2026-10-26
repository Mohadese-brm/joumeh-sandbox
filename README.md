# CLI-002 Joumeh storefront (local build)
Status: **Review** (not Done). Sample data only («داده نمونه»). Nothing is deployed or pushed.
All paths are relative to this folder, so it can be moved.

```bash
npm install
npm run dev            # API 127.0.0.1:3001 + Vite 127.0.0.1:5173 (proxy /api)
npm test               # vitest: unit + component (jsdom + axe) + API + DB + Vercel-handler simulation
npm run build          # tsc + vite build → dist/
npx vite preview --port 4173 & npm run api &   # production build locally
BASE=http://127.0.0.1:4173 npm run e2e         # Playwright: screenshots + axe (1280 & 375) → reports/shots/
BASE=http://127.0.0.1:4173 node tests/e2e/flow.mjs   # purchase flow in a real browser
```
Sample login: phone `09123456789` (sample customer «سارا»). The OTP is not sent anywhere (BD-13). By default no code is returned or logged anywhere (any `NODE_ENV`, and always in the Vercel function). For local testing, opt in explicitly with `npm run api:demo` (`JOUMEH_DEMO_OTP=1`): the API then returns and logs the mock code, and the dev build (`npm run dev`) shows it in the code step. Production builds never show it.
Vercel (later, needs CEO approval): `vercel.json` builds Vite to `dist/` and serves `api/index.ts` as one function. The DB is in-memory per instance (sample only).
Flags: `src/config/flags.ts` · decisions: `docs/decision-log.md` · stubs: `server/stubs.ts` · reports: `reports/`.

## Database & admin accounts (admin-v1)
- No `DATABASE_URL` → in-memory SQLite, seeded at start (as before). `DATABASE_URL=postgres://…` → Postgres via `pg`; migrations run at start, nothing is auto-seeded.
- `npm run db:migrate` — apply `db/migrations/*.sql` (edit the `.sql`, then `npm run schema` regenerates `db/migrations.ts`).
- `npm run db:seed` — catalogue only, only into an empty `products` table.
- `npm run admin:setup` — one-time creation of the real admins (max 2; first = Owner). Prompts for e-mail, name and password (hidden); the password is never stored anywhere but as a bcrypt hash.
- `npm run test:pg` — whole test suite against a LOCAL Postgres (`JOUMEH_TEST_PG_URL`, default `postgres://postgres@127.0.0.1:54329/joumeh_test`).
- `JOUMEH_ADMIN_DEMO=1` (local / preview only) seeds two demo admins into the in-memory DB; the login page lists them. Never production, never a `DATABASE_URL` database.

## Product images (admin-v1)
- Storage adapter `MediaStore` (`server/media.ts`): `MEDIA_DRIVER=memory` (default; per server instance, lost on restart — the preview uses this), `disk` (`MEDIA_DIR`), or `s3` (any S3-compatible bucket: MinIO / object storage).
- S3 settings come only from env vars: `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, `MEDIA_S3_FORCE_PATH_STYLE`, `MEDIA_S3_PREFIX`, optional `MEDIA_PUBLIC_BASE_URL` (otherwise images are proxied through `/api/media/<key>`). Missing settings fail at start-up, naming the variable (never the value).
- JPG / PNG / WebP up to 5 MB, checked by magic bytes server-side; alt text is required. Removing an image only detaches it from the product (no hard delete).
- MinIO integration test (opt-in): start a local MinIO, then `MEDIA_IT=1 MEDIA_DRIVER=s3 MEDIA_S3_ENDPOINT=… MEDIA_S3_BUCKET=… MEDIA_S3_ACCESS_KEY_ID=… MEDIA_S3_SECRET_ACCESS_KEY=… MEDIA_S3_FORCE_PATH_STYLE=1 npx vitest run tests/media-minio.test.ts`.
- Note: Vercel functions accept request bodies up to about 4.5 MB, so the 5 MB limit only fully applies on a self-hosted server.

## Inventory (admin-v1)
- Available to sell = on hand − reserved − allocated (paid orders not yet shipped). Every change (increase / decrease / count / in-store sale / shipment) is one append-only row in `inventory_movements`, plus an audit-log row, in the same transaction.
- On hand can't go below 0. An in-store sale that leaves less than the paid online orders already allocated is recorded as an oversell: the affected orders are listed, and their status is not changed automatically.
- Business decisions still open, shown in the UI as labelled placeholders: BD-08 (reservations / oversell handling), BD-09 (record POS sales at once or end of day), ADMIN-PH-LOWSTOCK (default low-stock threshold 2), ADMIN-PH-STOCK-REASONS (reason list), ADMIN-PH-STOCK-FLOW (deduct at shipment), ADMIN-PH-SKU (SKU pattern), ADMIN-PH-STORE-HOLD («رزرو فروشگاه» tab), ADMIN-PH-PUBLISH-RULES, ADMIN-PH-MEDIA.

## Admin e2e
- `JOUMEH_ADMIN_DEMO=1 PORT=3091 npx tsx server/index.ts`, `npm run build && API_PORT=3091 npx vite preview --port 4180`, then `SHOTS=/tmp/shots/ BASE=http://127.0.0.1:4180 node tests/e2e/admin.mjs` (always set `SHOTS`; restart the API between runs). It checks there's no horizontal scroll at 1440 and 390 on 15 admin pages.
