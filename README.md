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
