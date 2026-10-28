# Gerdoo update — 2026-10-28

Branch `gerdoo-update-2026-10-28` (off `release-gerdoo-2026-10-27` @ 11963b7), commit **6e88c07** (code) by Mohadese-brm.
Nothing was deployed to Gerdoo; no Gerdoo env var or database was touched. Times are Tehran (UTC+3:30).

- Vercel preview: READY — https://joumeh-sandbox-9lagnwt8j-mohadesehebrahim1374-5080s-projects.vercel.app (deployment `dpl_7PeRzXpf1uGEuGNQaJriHsEuB49P`)
- Share link (7 days): created 28 Oct 2026 16:32 Tehran, **expires Wed 4 Nov 2026 16:32 Tehran**. The link itself is relayed in chat only, not written into this repo.

## Task A — Oct 26 list on the live store

Audit = read-only Playwright run against https://joumeh-storefront.gerdoo.app (28 Oct ~16:16 Tehran, every non-GET API call aborted, 0 writes). Script: `tests/e2e/gerdoo-audit.mjs`; evidence `reports/shots/gerdoo-update-2026-10-28/gerdoo-*` + `gerdoo-audit.json`. The same script was re-run on the preview (`preview-*`, `preview-audit.json`).

| # | Item | Live Gerdoo (before) | After (this branch) |
|---|---|---|---|
| 1 | Full-bleed hero | DONE | DONE (unchanged) |
| 2 | Hero text "centred" | DONE* — vertically centred, start-aligned; "centred" is ambiguous, ask her if she meant horizontally | DONE* (unchanged, question open) |
| 3 | 4 cards per row | DONE | DONE |
| 4 | 80px story → footer | DONE | DONE |
| 5 | Selected underline (8px gap, 2px teal) | DONE | DONE |
| 6 | Joumeh Figma icon pack only | DONE (all SVGs inside the pack wrapper) | DONE — no new icons added |
| 7 | Sort control (no filter) | DONE (0 filter controls) | DONE |
| 8 | Grid padding 120 / 3 columns | DONE | DONE |
| 9 | Card box + hover photo swap | DONE | DONE |
| 10 | Empty states, no fake reviews | DONE — **FLAG**: sample reviews only appear when sample mode is on, labelled «(نمونه)» | DONE + FLAG (same rule; overlay reviews are labelled نمونه) |
| 11 | Sample data (prices/sizes/reviews) on the store | **PARTIAL** — live has no sample data (41 real products, no prices); footer wrongly said «نسخه‌ی محلی با داده نمونه» and `/api/health` said `sampleData:true` | **DONE (switchable, off by default)** — `JOUMEH_SAMPLE_OVERLAY=1`; footer/health fixed |
| 12 | Loading skeletons | DONE | DONE |
| 13 | Support chat | DONE — **FLAG**: demo chat, canned answers, shipping/returns answers say «not decided yet»; no third-party chat | DONE + FLAG (unchanged) |
| 14 | Story text (her exact text) | DONE — byte-identical, 929/929 chars | DONE (preview also 929/929) |

Heart icon only on the PDP (0 card hearts), no filter component — confirmed on live and preview.

## Item 11 — sample data on the LIVE store (non-destructive)

**How:** `server/sample-overlay.ts` is a *read-time overlay*. For every product **without a row in `prices`**, the API returns a sample price (8 fixed values, 1 in 4 on a 20% sale), sample colours/sizes (XXL shown unavailable), a sample description and 3 sample reviews (4.2 ★, 128). Nothing is written to the database.
- Labelling: thin bar above the header «حالت نمایشی (نمونه): …»; «نمونه» tag after every card price; «قیمت نمونه» on the PDP; reviews/sizes/colours marked «(نمونه)»; footer note.
- **Wipe vs layering:** layering. The 41-product catalogue is not wiped or reseeded. As soon as a real price is saved in the admin, that product leaves the overlay (real data always wins). Admin screens show only real data (unpriced products stay «بدون قیمت»).
- **Could customers check out at sample prices?** Not with this branch: while the overlay is on, `POST /api/orders` and `POST /api/orders/:id/payment` return `409 sample_mode`; the cart and checkout show a labelled notice and the button reads «ثبت سفارش غیرفعال (نمونه)». Sample cart lines are kept in server memory only (not in `cart_items`) and vanish on restart. Real (priced) products are blocked too while the overlay is on — the whole store is in demo mode.
- The old seed-time flag `JOUMEH_SAMPLE_PLACEHOLDERS` is unchanged and **not** used for live (it only affects a fresh in-memory seed / `db:seed`, which would need a wipe).

**To turn it on in production (needs her approval, not done):** Gerdoo → env `JOUMEH_SAMPLE_OVERLAY=1` → Redeploy. To turn off: remove it (or `0`) → Redeploy. No data clean-up either way.

## Task B — one-time `/admin/setup`

- Open only when **0 admins** exist and slot 1 was never used; creates the **Owner**. Afterwards `GET/POST /api/admin/setup` → 404 forever (state is in the DB: `admin_setup` table, migration `0004_admin_setup.sql`, so a restart does not re-open it). On Gerdoo the page URL itself answers HTTP 404 once closed (`gerdoo/server.ts`).
- Allowed e-mails: `JOUMEH_ADMIN_SETUP_EMAILS` (comma list), default `mohadesebrahim1329@gmail.com`. Others → 403. The list is never sent to the browser.
- Password: ≥ 12 chars (max 200), typed twice, bcrypt (cost 12). Body never logged; audit_log row `admin_setup` has no password.
- Window: `JOUMEH_ADMIN_SETUP_WINDOW_HOURS` (default **24**, counted from server start, i.e. from the Redeploy; `0` = never open).
- Second account: `JOUMEH_ADMIN_SETUP_REOPEN=1` **and** an explicit `JOUMEH_ADMIN_SETUP_EMAILS` → opens once for slot 2 when exactly 1 admin exists (role admin). Off by default; remove it afterwards.
- Rate limit: 5 POSTs / IP and 20 total per 15 min (429). Cross-origin POST refused (existing CSRF check).
- Vercel note: the SPA rewrite means `/admin/setup` there is HTTP 200 + «صفحه پیدا نشد»; only the API returns 404. On the preview it is closed (2 demo admins) — verified: `/api/admin/setup` → 404.
- **Risk window:** between Redeploy and her creating the account, anyone who knows/guesses her e-mail could create the Owner with their own password. Mitigations in place: e-mail allow-list, 24 h expiry, rate limit, page is not linked anywhere. Operational: create the account **right after** the Redeploy (or set `JOUMEH_ADMIN_SETUP_WINDOW_HOURS=1`). Optional extra (not built): a one-time setup code env var typed into the form. Alternative with no window: `npm run admin:setup` via Gerdoo shell. Known limit: the per-IP counter trusts `X-Forwarded-For` (spoofable); the global 20/15 min cap still applies.

## Tests

- `npm test`: 16 files passed, 1 skipped (MinIO) — **149 passed, 1 skipped**.
- `npm run test:pg` (local Postgres 17): **148 passed, 2 skipped** (MinIO + one sqlite-only signed-token test; both pre-existing skips).
- New: `tests/admin-setup.test.ts` (8): owner created + closed after creation (also after restart), wrong e-mail 403, password length/mismatch, closed when an admin exists, re-open flag only for the 2nd account with an explicit list, window expiry, rate limit + CSRF, closed on preview. `tests/sample-overlay.test.ts` (3): off by default; on = labelled prices/variants/reviews, sample cart, orders 409, **DB row counts unchanged**; a real price wins. `tests/db.test.ts` table list updated for `admin_setup`.
- `npm run build` (tsc + vite) OK.
- Browser: `tests/e2e/gerdoo-update-shots.mjs` against a LOCAL `gerdoo/server.ts` (in-memory SQLite, real catalogue, overlay on) at 1440 and 390 → `local-overlay-*.png` + `local-overlay-checks.json` (bar, 9/9 card tags, PDP tag, cart/checkout blocked, setup open → errors → success → closed HTTP 404).

## Go-live (each step needs Mohadeseh's approval — nothing done)

1. Merge: fast-forward `release-gerdoo-2026-10-27` to `gerdoo-update-2026-10-28` (or switch the Gerdoo app's branch to it). Note: pushing the release branch may itself start a Gerdoo git build.
2. Optional env on Gerdoo: `JOUMEH_SAMPLE_OVERLAY=1` (sample mode, orders off); `JOUMEH_ADMIN_SETUP_WINDOW_HOURS` if she wants shorter than 24.
3. **Redeploy** Gerdoo. On start, migration `0004_admin_setup` runs on the Gerdoo Postgres (adds one empty table; nothing else changes). Rollback: previous build 1de787c5 (or b6e2a0b8); the extra table is harmless.
4. Immediately: open https://joumeh-storefront.gerdoo.app/admin/setup, create the Owner with mohadesebrahim1329@gmail.com, then confirm the page is 404.
5. Later, for the business owner: set `JOUMEH_ADMIN_SETUP_EMAILS=<their e-mail>` + `JOUMEH_ADMIN_SETUP_REOPEN=1`, Redeploy, create, then remove both and Redeploy.
