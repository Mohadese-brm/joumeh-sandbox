# CLI-002 Joumeh storefront build: decision log (developer-side)
Kept inside `build/` so the existing CLI-002 files (decisions.md etc.) stay untouched. The COO may merge these into `../decisions.md`.
All times Asia/Tehran.

| Date | Decision | Decided by | Channel | Code effect |
|---|---|---|---|---|
| 2026-10-21 02:11 | Project is CLI-002; build lives in `clients/CLI-002/build/`; must be Vercel-deployable later (static Vite + `/api` serverless, sample DB). No push/deploy by the builder now. | CEO (Mohadeseh) | relayed by the parent agent from Alex's chat | repo moved here; `vercel.json`, `api/` |
| 2026-10-21 02:12 | R-1 discount badge = **20%** | CEO (Mohadeseh) | relayed by the parent agent | `server/config.ts` `r1SampleBadgePercent` default 20 |
| 2026-10-21 02:13 | R-2 filters = **select-then-Apply** on desktop and mobile; pending until Apply, Apply updates results + URL; clear/reset action | CEO (Mohadeseh) | relayed by the parent agent | `src/config/flags.ts` `filterMode: 'apply'` |
| 2026-10-21 02:13 | R-3 hero = **carousel** (manual; no autoplay, since autoplay hero 59:4403 is deprecated) | CEO (Mohadeseh) | relayed by the parent agent | `flags.heroMode: 'carousel'` |
| 2026-10-21 02:16 | 17px vs Price token: resolved to 17px (see Emma row below) | Emma | relayed | flags.priceSize '17px' |
| 2026-10-21 02:16 | Price styles: current price v2/Shop/Current Price 17px/600/1.5 #1C7477 (mobile 14px/600); original price 13px Regular desktop / 12px mobile, line-through #57534E (follow the style, not detached layer 54:120). `priceSize` flag resolved to '17px'. | Emma (design owner) | relayed by the parent agent | `ProductCard.css` |
| 2026-10-21 02:16 | Product-card arch: top radius w/2, bottom radius w×0.057 (16px @282, ≈10px @171), not square. Supersedes KB §3 "square bottom". | Emma | relayed by the parent agent | `ProductCard.css` |
| 2026-10-21 02:16 | Hero carousel uses component set 68:807 (3 slides desktop + mobile). The set shows no prev/next/dot controls → controls are a flagged placeholder. | Emma | relayed by the parent agent | `HeroCarousel.tsx` |

## Round 1 — Emma's design review (2026-10-21, relayed by the parent agent)
- All 5 Majors and 10 Minors addressed (m7 kept as the accepted interim D2). See `reports/fixes-round-1.md`.
- Placeholder rulings P3, P6 (FAQ + Contact only), P8 and P9 applied. P7 Support ticket pages are NOT built (waiting on the CEO).
- OTP code length 6 (Figma 107:941). Sale-only filter toggle removed (not in the design).
- BD-11: one sample numeric order-number format app-wide; the final format is the CEO's call.

## Round 2 (2026-10-21)
- Signup per Auth/Modal Mode=Signup 107:773 (title «عضویت», footer «قبلاً عضو شده‌اید؟ ورود»). E-mail signup is a BD-21 stub.
- Demo OTP code box is dev-only (`src/config/dev.ts`) and never appears in production builds.
- Timer ۰۲:۰۰ accepted by Emma (BD-13). Desktop filter stays interim. Sample categories stay labelled BD-18.

## Round 3 (2026-10-21)
- Mobile auth dialogs are a centred 343px card (108:6003); sheets only for filter, sort and size guide.
- Demo OTP: explicit opt-in JOUMEH_DEMO_OTP=1, off by default, forced off on Vercel.

## fix1 — CEO review 2026-10-21 17:34 Tehran (relayed by Totoro; spec: reports/fix-spec-5-mismatches-2026-10-21.md by Emma)
- **Filter removed** (desktop panel + mobile sheet + «فیلترها» button). Supersedes R-2 select-then-Apply (row above) and P4/M2. `flags.filterMode: 'off'`. API filter params remain (unused by the UI). Figma still shows filter UI on 56:921 / 56:1968 / 69:15332 / 69:15505 → Figma follow-up for the CEO.
- **Card heart removed**; heart stays only on the PDP (Favorite Toggle 266:67491 / m 266:70611). Figma Card Shop 87:16741 still has it → follow-up. Favourites page keeps the red remove link (127:468); whether Favorites cards should have a heart: open (CEO).
- **Reviews**: UI built per 266:71080 / 266:71357 with no backend. BD-15 (ship or not, eligibility, moderation, length rules) still open; section shows the designed «No reviews» state; submit is a labelled stub that does not persist.


## fix2 — Reviews: DEFAULT rules (2026-10-21, Alex; changeable — NOT final policy)
Mohadeseh confirmed reviews ship with the default Figma design (266:71080 / 266:71357). The rules below are **engineering DEFAULTS** chosen so the flow works; BD-15 sub-questions remain hers to decide. Each lives in one place in code so it can be changed.
| Rule | DEFAULT | Where to change |
|---|---|---|
| Who may review | Signed-in users only; a guest tapping «ثبت نظر» gets the sign-in modal first, then the form opens | `ProductReviews` in `src/components/Reviews.tsx`; `auth` on `POST /api/products/:slug/reviews` |
| Purchase required | No (any signed-in user) | `server/app.ts` review POST |
| Rating | Required, whole stars 1–5 | `server/app.ts`, `StarRating` |
| Text length | Required, 1–1000 characters after trimming (textarea `maxLength` 1000) | `REVIEW_DEFAULTS.minLen/maxLen` (server), `MAX_LEN` (client) |
| Moderation | None: published immediately (`REVIEW_DEFAULTS.moderation = 'none'`; `'pre'` would store as `pending`, which the list hides) | `server/app.ts` |
| Reviews per user | Unlimited (no one-per-product limit) | `server/app.ts` |
| Average | Mean of published ratings, rounded to 1 decimal; count = published reviews | `reviewSummary` in `server/app.ts` |
| Display name | First name + initial of last name («نگار ر.»); «کاربر جومه» if the profile has no name | `reviewSummary` |
| Meta line | Date only (fa-IR). Figma also shows «سایز M»; there is no data source for the reviewer's size, so it is omitted | `fmtDate` in `Reviews.tsx` |
| List | Newest first, all reviews, 3 per row on desktop, stacked on mobile; no paging, sorting, photos, votes, replies, edit or delete (not designed) | `Reviews.tsx` / `Reviews.css` |
| Storage | Local in-memory API (sql.js `reviews` table), same as favourites. **Resets when the server restarts; on Vercel serverless it is not durable** | `db/schema.sql` |
| Helper copy | Kept Figma's «قوانین طول متن و بررسی نظر هنوز تعیین نشده است (تصمیم باز).» | `Reviews.tsx` |
| Success copy | Kept Figma's «پس از بررسی منتشر می‌شود (نمونه — …)» although no moderation runs by default; she should pick final copy | `Reviews.tsx` |
Other fix2 decisions (CEO, relayed by Emma 17:50 Tehran): no heart on any card incl. Favorites (heart on the PDP only); filters removed; pressed heart #E7E5E2 is provisional.

## fix2b — CEO DECISION (2026-10-21 ~18:02 Tehran, relayed by Emma): reviews publish immediately, no moderation
Replaces the moderation DEFAULT above: this is now Mohadeseh's decision, not a default. Success state copy: title «نظر شما ثبت شد», body «ممنون از اینکه تجربه‌تان را با ما به اشتراک گذاشتید.». All "checked before publishing" wording removed; form helper is now «قوانین طول متن هنوز تعیین نشده است (تصمیم باز).» (length rule stays a DEFAULT). Figma 266:71187 / 266:71323 still carry the old copy (read-only).

## design-batch-2026-10-26 — CEO design batch (branch `design-batch-2026-10-26`, preview only)
| # | Decision | Where |
|---|---|---|
| 1 | Hero = one fixed image (`incoming-2026-10-26/hero.png`, original untouched), served as webp 768/1024/1542 srcset, cover-fit, «مشاهده» → /women. `flags.heroMode = 'static'` (carousel code kept, unused). FIGMA GAP: no full-bleed hero frame; CTA placed bottom-start | `HeroStatic.tsx`, `Home.css` |
| 2 | Feature sections: image 480×600; label→title 16, title→sentence 16, sentence one line (≥1024), sentence→button 32, 48 between sections. "Centred" read as the text block vertically centred beside the image (AMBIGUOUS) | `Home.tsx`, `Home.css` |
| 3 | Home product rows: 4 cards each, sample prices/data | `BestSellers` in `Home.tsx` |
| 4 | Last Home section (story teaser) → footer = 80px | `.hsec--last` |
| 5 | Selected state (header tab, breadcrumb current page, auth tabs, mobile menu): `--sel-color` teal-600, `--sel-line` 2px, `--sel-gap` 8px (was 9) | `global.css` tokens, `Layout.css` |
| 6 | Breadcrumb separator = Figma icon `left-2` (16px) via shared `Breadcrumbs` component | `Breadcrumbs.tsx` |
| 7 | Sort: unboxed label «مرتب‌سازی» (ZWNJ kept) over «جدیدترین» + Figma `chev-d`; open = brand green (read as teal-600 #1C7477) + blurred listbox (`--blur-surface`, `--blur-amount`), options start-aligned (right in RTL), tick at inline-end (left). Full listbox keyboard model (↑↓ Home End Enter Space Esc Tab), focus returns to the button. Mobile keeps the approved bottom sheet (56:951) | `Shop.tsx`, `Shop.css` |
| 8 | Listing grid: 120 page padding (≥1440), 32 column gap, 48 row gap; fluid 2→3 columns (`--pgrid-col/row` tokens: 12/24, 24/40, 32/48) | `global.css` |
| 9 | Card = white box (1px n-200, r12) with picture + name + price (adidas style); hover/keyboard focus fades to the 2nd photo; single-photo products keep one image (no swap). Card arch kept inside the box | `ProductCard.*` |
| 10 | PDP image 492×615; sample rating 4.2 / 128 and 3 sample reviews, all labelled «(نمونه)»; sample description | `Product.*`, `db/sample-placeholder-data.ts` |
| 11 | "Portfolio" sample data is AMBIGUOUS → interpreted as product-catalogue sample data, one switch `JOUMEH_SAMPLE_PLACEHOLDERS` (default on in the app, off in tests). Prices/sizes/colours/descriptions are placeholders, never policy | `db/sample-placeholder-data.ts` |
| 12 | Loading states: grid/PDP/cart skeletons, search spinner | `Grid.tsx`, `Product.tsx`, `Cart.tsx`, `Layout.tsx` |
| 13 | Support: Figma `Call` icon FAB on every page (above the mobile bottom nav) → LOCAL demo chat (nothing is sent); canned answers labelled «پاسخ نمایشی (دمو)»; shipping/returns answers say "not decided yet". FIGMA GAP: no chat frame | `SupportChat.tsx`, `content/support-demo.ts` |
| 14 | «قصه ما» page `/info/story` uses the CEO text verbatim (`src/content/story.ts`, test fixture byte-compare); header/footer links point there | `Story.tsx` |

## design-batch-2026-10-26 rev1 — CEO changes (2026-10-26, owner msg pt87u)
| # | Decision | Where |
|---|---|---|
| r1 | Card box hugs the picture with exactly 8px on every side (`--card-pad` 8 on desktop and mobile; desktop was 12), name + price inside the same box, 8px from the bottom. Border 1px / r12 kept; photo radius is nested (`--card-r − border − pad` = 3px at the bottom corners, **was ≈20px**); arch top (w/2) kept. One shared card everywhere (shop + home rows). Grid 120/32/48 + hover swap unchanged | `ProductCard.css` |
| r2 | Hero «مشاهده» on the **physical left** (`justify-content: left`) even in RTL, on desktop and mobile | `Home.css` |
| r3 | Support/phone FAB on the **physical right** (`right`, not `inset-inline-end`), `position: fixed` bottom on every page (24/24, 56px; mobile 16 / above the bottom nav, 52px). Footer reserves `--fab-clear` bottom padding so its last line is never under the FAB | `SupportChat.css`, `global.css`, `Layout.css` |
| r4 | Sort dropdown: the trigger is as wide as the longest option (all labels stacked, hidden ones `visibility:hidden` + aria-hidden); the menu is inset by `-(1 + menu-pad + opt-pad)` so the option text right edge = trigger text right edge and the tick column = the chevron column. Trigger and options both 16 / 500 / 28 (the selected option changes colour only; the old 14px/22px option font was removed). Chevron + tick both 20px with `.icon--stroke` (non-scaling-stroke, `--icon-stroke` 1.5px), because the pack's frames differ (20 vs 24) and gave 1.5 vs 1.25px | `Shop.tsx`, `Shop.css`, `global.css` |

## design-batch-2026-10-26 rev2 — CEO change (2026-10-26, owner msg pt88u "round above like picture")
| # | Decision | Where |
|---|---|---|
| r5 | Card BOX top is now an arch concentric with the picture's arch: outer top radius = 50cqi (half the box width), so the inner edge radius = picture top radius (mw/2) + 8 → 8px everywhere along the arch, top/left/right. Box bottom corners stay 12. The box (white + 1px #E7E5E2, hover #78716C) is drawn by `.pc__link` inside the `.pc` container (cqi works there); `.pc` is now a transparent wrapper. Badge/cart offsets use `--inset` = pad + border so they don't move. Picture bottom corners restored to the approved mw × 0.057 (≈20px at 1440, ≈9px on mobile), replacing rev1's 3px. Loading skeleton uses the same arched box + 8px pad | `ProductCard.css`, `global.css` (`.pgrid__sk`) |

## rev3 — 2026-10-26 (Mohadeseh feedback)
- r6 Home section spacing: new shared token `--row-end-space` (= `--section-gap` scale: 48 @<768, 64 @768, 80 @≥1280) applied as bottom padding of every best-seller product row. Source: Figma Home/Desktop 55:282 — Best sellers frames 55:477/55:541 end 80px below the carousel; Home/Mobile 108:6010/108:6027 end 48px below. The next section keeps its CEO 48px top, so card-bottom → next content = 128 desktop / 96 mobile (Figma desktop would be 160 with its 80 feature top inset; mobile matches Figma exactly).
- r7 «قصه ما» page picture 480×600 → 400×500 (−16.7%, `--story-img-w`), radii w/2 and w×0.057, bottom-aligned (grid align end) with the last text line on ≥1024; mobile: min(400px, 84%) centred above the text. Story text untouched. Sticky picture removed (incompatible with bottom alignment).
- r8 Product card hover/focus border → `--card-border-hover: var(--action-primary)` (#1C7477) instead of #78716C.
- r9 Breadcrumb: every crumb uses the header-tab box (14/24, `--sel-gap` 8 + `--sel-line` 2 slot), items top-aligned so link, separator and current share one centre; link hover = selected underline (teal 2px, 8px gap), no text-decoration underline.
- r10 (rev4, Mohadeseh 2026-10-26 «basket icon with primary circle in front of title and align it»): the card's bag button moves from the photo (Figma 54:123 → AddToCart 54:110, 44×44 white circle on the photo, bottom-left) to the title row, opposite the title (physical left in RTL). It's a solid --action-primary circle, 40 desktop / 32 mobile, with a white shared <Icon bag-1> (24/20, the same icon as the header cart), a 44px hit area, hover/focus --teal-700 and a 3px teal ring. The name line is --cart-d tall, so the circle centre equals the title centre, and the name reserves d+8 so long titles ellipsize before it. Figma has no title-row variant (gap, follows the owner's instruction). Behaviour is unchanged per P9 and flow.mjs: every product needs a size and there's no designed quick-add, so the click opens the PDP size picker (#options, size-required state). The button is outside the card link, so it never follows it. Unpriced cards still have no button.
- r11 (rev5, Mohadeseh 2026-10-26 «In mobile version the button text on detail product is big resize it and suitable for mobile version»): `.btn` now reads optional `--btn-fs/-fw/-lh/-h/-px/-ws` tokens (unset = the previous 15/600, inherited lh, `--control`, 24px, so nothing changes elsewhere). New shared mobile button token `--btn-m-*` = 14px / 500 / lh 24 / min-h 48 / px 16 / nowrap, enabled with the scope class `.btn-scope-m` at ≤767px only. Opted in: the PDP wrap (add-to-cart, «ثبت نظر», error retry) and the review sheet form (portal). Figma mobile PDP 260:63048 → AddToCart 260:63089 (Forms/Button Large 52:169) specifies 16/500/lh24, h48, which is what the owner found too big, so the font is 14 and Figma's weight, line height and height are kept. The PDP buy row (fav 44 · 12 · add · 12 · qty, Figma 260:63088) leaves the add button 146px at 360 (label 110 + icon 28 + padding 32 = 170 needed), so the bag icon hides when the row is under 352px (container query); at 390 it shows. Before: mobile 15/600, wrapped to 2 lines, 56.5px tall; after: 14/500, 1 line, 48px. Desktop, tablet, the auth modal and other pages (home, cart, checkout, faq, contact, favorites, account) are unchanged (tests/e2e/rev5-qa.mjs compares them with the pre-change baseline).

## admin-demo — merged into `admin-v1` (2026-10-26)
| When | Decision | Who | Source | Notes |
|---|---|---|---|---|
| 2026-10-22 14:56 | Build a DEMO admin panel (sample data that resets), MVP scope from `reports/admin-scope-proposal-2026-10-22.md`, on local branch `admin-demo`. No push, no deploy, no new services. | CEO (Mohadeseh) | relayed by the parent agent from Alex's chat | `server/admin.ts`, `src/admin/*`, 7 new tables. Demo login only when `JOUMEH_ADMIN_DEMO=1` (forced off in `api/index.ts`). Roles/permissions, order transitions and idle timeout are PLACEHOLDERS (BD-19 / BD-05 / BD-23). Shop shows only `publish_state='published'` products (all seeded products stay published in the shop seed). The reviews screen has no Figma frame and is labelled pending design |
| 2026-10-26 | Step 1 of the admin plan: merge `admin-demo` onto main e6c7efa as branch `admin-v1` (preview only, main untouched). Conflicts: shop SQL keeps main's LEFT JOIN prices + thumbnails and adds the published-only filter; both decision-log sections kept. Admin handles NULL prices (list shows «بدون قیمت», empty price field = no price, prices row upserted/deleted; no price invented). Demo seed no longer touches real products: drafts/unpublished + demo reviews sit on 3 extra demo-only products, demo orders use only priced lines, so the preview shop matches production. | CEO (Mohadeseh) | relayed by the parent agent | Steps 2+ and screens without Figma designs not started (waiting on CEO answers). |
| 2026-10-26 | Preview fix found during step-1 verification: on Vercel each function instance has its own in-memory DB, so admin demo sessions were lost between instances (random 401 → back to login). Demo tokens are now HMAC-signed (`<adminId>.<issuedMs>.<rand>.<mac>`) and a fresh instance re-creates the session row; only when admin demo is on (never production); logout/idle-expiry are final per instance; max age 8 h = engineering PLACEHOLDER. Key is not a secret (demo accounts are public). Demo-only: the live admin (email + password, 2 admins — CEO v1 decision) needs a shared session store in the real DB. | Alex (engineering) | step-1 preview QA | `server/admin.ts`, `tests/api-admin.test.ts` |
| 2026-10-26 22:16 | Admin v1 model (CEO steering): e-mail + password sign-in (no SMS OTP); exactly two admins with equal full access (Owner = Mohadeseh + the business owner); agent API read-only with masked phones; accounting v1 = daily/monthly sales + payment summaries, CSV, no VAT; requests/tokens/ledger/finance/reports/media not built (Emma designing); keep the data layer swappable for the coming Gerdoo Postgres. | CEO (Mohadeseh) | relayed by the parent agent | see the two rows below |
| 2026-10-26 | Data layer: all SQL behind an async `Db` adapter (`server/db.ts`): in-memory SQLite (sql.js) or Postgres (`pg`) when `DATABASE_URL` is set. Schema = ordered migrations `db/migrations/*.sql` (generated into `db/migrations.ts`, recorded in `schema_migrations`, advisory-locked on PG). `npm run db:migrate` / `db:seed` (catalogue only, only when no products, placeholders OFF unless `JOUMEH_SAMPLE_PLACEHOLDERS=1`) / `test:pg` (whole suite on a LOCAL Postgres, throwaway schemas). A `DATABASE_URL` database is never auto-seeded and never gets demo admins or demo orders, even on a preview. | Alex (engineering) | admin-v1 step 2 | tested on local Postgres 17 only; nothing hosted |
| 2026-10-26 | Auth v1: `admin_users` keyed by e-mail, bcrypt (bcryptjs, cost 12), DB-backed sessions (`admin_sessions`), httpOnly + Secure + SameSite=Strict cookie on `/api/admin` (no Bearer / localStorage), cross-origin writes refused, login rate limit 5 failures per e-mail / 20 per IP in 15 min (`admin_login_attempts`), idle 60 min, max 8 h, password min 12. Six demo roles collapsed to `owner` + `admin` (same full access, max 2). Real accounts only via the one-time `npm run admin:setup` (password typed at runtime, never stored in code). Demo accounts (`*.demo@joumeh.invalid`, derived demo passwords) exist only in the in-memory preview DB and are listed on the preview login page. Users screen read-only. Login screen = INTERIM (Emma designing the final e-mail login). Limits/timeouts = engineering PLACEHOLDERS for the CEO to confirm. | Alex (engineering) | admin-v1 step 2 | `server/admin.ts`, `scripts/admin-setup.ts`, `src/admin/AdminApp.tsx`, `src/admin/pages/Settings.tsx` |
| 2026-10-26 23:30 | Admin-v1 step 3: responsive admin shell from the mobile Figma frames (drawer 177:16745, dashboard 177:16571, orders 180:30160/180:30271, inventory 179:24354/179:24269). Products and categories have no mobile frame, so they reuse the same card patterns (Figma gap). Products: create, edit, publish, unpublish and archive (no hard delete), add variants, Jalali Date Picker 173:14077 for the list date filter. Images go through the `MediaStore` adapter (memory / disk / S3 via MEDIA_*), JPG/PNG/WebP ≤ 5 MB, alt required. Inventory per 179:21565 / 179:22434. Stock policies (oversell handling, low-stock threshold, reasons, POS timing) are labelled placeholders (BD-08, BD-09, ADMIN-PH-*), not decisions. The pre-login session check now returns 200 + null (no 401 in the console). | Alex (engineering) | admin-v1 step 3 | `src/admin/**`, `server/admin.ts`, `server/inventory.ts`, `server/media.ts`; tests: unit + local PG + local MinIO + e2e 1440/390 |
| 2026-10-26 23:30 | An in-store sale can't take on hand below 0 (refused with a Persian error). Going below the paid allocations is allowed and recorded as an oversell. This is the engineering default until BD-08 is decided. | Alex (engineering) | admin-v1 step 3 | PLACEHOLDER (BD-08) |
