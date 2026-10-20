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
