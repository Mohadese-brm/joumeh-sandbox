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
