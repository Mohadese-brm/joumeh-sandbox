# Milestone 3: full QA (CLI-002 Joumeh storefront)
Date: 2026-10-21 (Asia/Tehran) · Owner: Alex Dorosty · **Status: Review (not Done)**. Details: `reports/self-qa.md`.

| Check | Command | Result | Evidence |
|---|---|---|---|
| Type check | `npx tsc -p .` | clean | — |
| Unit + component + API + DB | `NODE_ENV=test npx vitest run` | **50/50 passed**, 5 files (format 4, components 14 incl. 3 jest-axe, API 25, DB 5, Vercel handler 2) | `reports/unit-api-component-tests.txt` |
| Production build | `npm run build` | green; JS 254 kB (79 kB gzip), CSS 39 kB (7.5 kB gzip) | — |
| axe-core (Chromium, WCAG 2.0/2.1/2.2 A+AA tags) on every page/state | `BASE=http://127.0.0.1:4173 npm run e2e` | **54 renders (27 pages/states × 2 viewports), 0 violations**, 0 horizontal overflow, 0 unexpected console errors | `reports/e2e-axe-shots.txt`, `reports/shots/results.json` |
| Screenshots | same run | 54 full-page PNGs, desktop 1280 / mobile 375 | `reports/shots/` |
| Purchase flow in browser | `node tests/e2e/flow.mjs` | **20/20 steps passed** (desktop + mobile) | `reports/e2e-flow.txt` |
