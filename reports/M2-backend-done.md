# Milestone 2: backend done (CLI-002 Joumeh storefront)
Date: 2026-10-21 (Asia/Tehran) · Owner: Alex Dorosty · **Status: Review (not Done)**.

## What exists
- **Express API** `server/app.ts`, run locally with `npm run api` (127.0.0.1:3001). Vite proxies `/api` in dev/preview.
- **Vercel-ready entry** `api/index.ts` + `vercel.json` (Vite static build to `dist/`, `/api/*` rewritten to one serverless function, SPA fallback, `sql-wasm.wasm` included). **Not deployed or pushed**; the deploy is Alex's later step and needs the CEO's go-ahead.
- **Database**: SQLite through sql.js (WASM, in-memory). Schema `db/schema.sql` (inlined to `db/schema.ts` by `npm run schema`), seed `db/seed.ts`, all rows labelled «داده نمونه». On serverless, each function instance seeds its own copy, so writes do **not** persist across cold starts or instances (sample-data demo only).
- **Endpoints**: health · products (category/sort/page/size/colour/sale, 9 per page) · filters · product by slug · search · cart create/get/add/patch/delete with totals · OTP request/verify (hashed codes, 120 s expiry, 5 attempts, 3 requests per 10 min, all engineering defaults set by env) · logout · me get/patch · addresses CRUD + default · favourites · orders list/detail/create · mock payment start/complete · returns list/detail · shipping methods (sample).
- **Stubs** (`server/stubs.ts`): BD-01 MockProvider (`server/payment.ts`), BD-02/03/24 sample shipping methods with `fee: null`, BD-04 returns read-only, BD-05 no cancel, BD-06 `vat_amount NULL`, BD-07 login required for checkout, BD-08 no reservation, BD-10 single price table, BD-11 `STUB-<id>` order numbers, BD-13 console SMS adapter, BD-15 no reviews, BD-16 availability flag only, BD-17 no discount codes, BD-18 taxonomy/size chart, BD-21 no e-mail OTP, BD-23 fulfilment status stored, source undecided. Every response that touches policy carries `stubs: {code, label: «در انتظار تصمیم کسب‌وکار»}`.
- **Security basics**: tokens and OTPs stored as SHA-256 hashes; Bearer sessions; per-user ownership checks (tested); JSON body limit 50 kb; no secrets needed (`.env.example` holds names only). `devCode` is returned only when `NODE_ENV !== 'production'`, for local testing.

## Evidence
`NODE_ENV=test npx vitest run tests/api.test.ts tests/db.test.ts tests/api-vercel.test.ts`: 3 files, 32 tests passed (25 API, 5 DB, 2 Vercel-handler simulation).
