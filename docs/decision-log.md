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
