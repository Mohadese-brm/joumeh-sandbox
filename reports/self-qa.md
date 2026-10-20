# Self-QA report: CLI-002 Joumeh storefront (local build)
Date: 2026-10-21, Asia/Tehran · Owner: Alex Dorosty (Full-Stack Developer, lifecycle TESTING) · **Status: Review, not Done.**
Next: Emma's design review against Figma (routed via the COO), then COO verification (handbook §8). Public release needs the CEO's approval.

## Handoff-ready summary
```
Project: CLI-002 Joumeh   Division: Client
Task: Design review of the local storefront build against Figma ft9A3u7cpJwySe9AfPWBBb (pages 01 150:2 / 02 51:86 / 04 51:93)
Context: clients/CLI-002/build/ (README.md, docs/decision-log.md, reports/M1–M3, reports/shots/)
Owner: Emma (design review), via the COO   Requested by: Alex Dorosty
Deadline: TBD by COO (Tehran time)
Deliverables: review notes on the deviations, flags and placeholder screens below
Acceptance criteria: fidelity confirmed or deviations listed; placeholder screens accepted or designs supplied
Constraints / approvals needed: BD-01..BD-24 open; any deploy needs CEO approval; font licence and photo rights unconfirmed
```

## Scope and constraints check
- Work location: `clients/CLI-002/build/` (CEO decision 02:11). The earlier `dev-handoff/joumeh-build/` copy was **left in place, not deleted**. Existing CLI-002 files (brief, decisions.md, tasks, …) were **not modified**. The decision log lives at `build/docs/decision-log.md` for the COO to merge.
- Local git only: 3+ commits on `main`. **No push, no deploy, no Vercel, no preview links, no paid or external services, no messages sent.**
- Figma: read-only calls only (get_metadata, get_screenshot). No `use_figma`, no writes. Reference screenshots are in `reports/figma-ref/`.
- Reused from the test sandbox (copied, not moved): ProductCard, tokens, sql.js DB pattern, vitest/jest-axe setup.

## Design decisions applied (see docs/decision-log.md)
| Item | Value | Decided by | Code |
|---|---|---|---|
| R-1 discount badge | **20%**, rendered from the product data field | CEO 02:12 | `server/config.ts` `r1SampleBadgePercent`; `flags.showDiscountBadge` |
| R-2 filters | **select-then-Apply** on desktop and mobile, URL updates on Apply, «پاک کردن همه» reset | CEO 02:13 | `flags.filterMode: 'apply'`; tested in `components.test.tsx` |
| R-3 hero | **carousel**, component set 68:807 (3 slides), manual, no autoplay | CEO 02:13 / Emma | `flags.heroMode: 'carousel'` |
| Price size | 17px / 600 desktop, 14px mobile (v2/Shop/Current Price); original 13px desktop / 12px mobile, line-through #57534E | Emma 02:16 | `flags.priceSize: '17px'`, `ProductCard.css` |
| Card arch | top radius w/2, bottom radius w×0.057 (16 @282, ≈10 @171) | Emma 02:16 | `ProductCard.css` |
Note: these decisions reached me relayed by the parent agent from the CEO's and Emma's chats. I applied them as instructed, and the log records them that way.

## Placeholder screens (no design; simplest system-consistent version, flagged in the UI with «صفحه‌ی موقت — طراحی نشده»)
1. **Payment step** `/checkout/payment` (CU-18/19/20 missing): order summary + MockProvider success/failure buttons (BD-01).
2. **Order confirmation** `/checkout/confirmation/:id` (missing).
3. **OTP code-entry step** inside the auth modal (inline OTP CU-16 missing): reuses modal/field styles.
4. **Filter panel/sheet UI** (CU-04: cannot be opened in the prototype). The behaviour is decided (Apply); the visual is a placeholder using size/colour/sale chips derived from data.
5. **Hero carousel controls** (prev/next/dots): component set 68:807 has none.
6. **Footer info pages** `/info/*` (shipping, returns, size guide page, FAQ, contact, careers, blog, story).
7. **Support** `/account/support`: designed (246:*) but outside this build's scope, so a placeholder.
8. **Size guide** content: modal opens, but the table is a BD-18 stub (design 245:61044 exists, content undecided).
9. **Card "add to cart"** from listing/home: no quick-add design, so it opens the PDP options with the toast «برای افزودن به سبد، سایز را انتخاب کنید».
Engineering default states (not designed, neutral system defaults): skeleton loading on shop/PDP/home sections, search error/no-results text, 404 (design exists on page 04 but wasn't inspected in detail), mobile account nav as a horizontal scroller.

## Stubs (BD codes; UI shows «در انتظار تصمیم کسب‌وکار» or «داده نمونه»)
BD-01 payment (MockProvider only) · BD-02 shipping methods/fees (Figma samples, `fee: null`; free-shipping bar omitted) · BD-03 delivery promise · BD-04 returns (read-only list/detail, policy text placeholder) · BD-05 cancellation (no action) · BD-06 VAT (row shows pending, `vat_amount NULL`) · BD-07 guest checkout (login required) · BD-08 reservation/oversell (none) · BD-10 single price source (`prices` table; مانتو uses the PDP sample 1,480,000/1,850,000) · BD-11 order number (`STUB-<id>`; seeded samples 10124…) · BD-12 support channels · BD-13 SMS (console adapter) · BD-14 legal/info pages · BD-15 reviews (Figma sample reviews deliberately not shown) · BD-16 stock (availability flag only; "insufficient stock" and "price updated" cart states **not wired**) · BD-17 discount codes (none) · BD-18 taxonomy/size chart · BD-21 e-mail OTP (tab stub) · BD-23 delivered source · BD-24 COD/pickup.

## Deviations / open items for Emma
1. KB §3 said the card bottom corners are square. Implemented Emma's w×0.057 instead (her 02:16 answer). The KB is now outdated on this point.
2. The order number appears as «۱۴۰۵-۰۰۱۲۴» on the overview (125:383) and «۱۰۱۲۴» on the orders list (126:4163). I used one value (BD-11).
3. The cart summary discount is red in Figma (119:594); I followed Figma (#B41C1C). Sale *prices* stay teal.
4. City is a text field, not a select (no city list in the design data). Province is a select of Iran's 31 provinces.
5. Account nav icons: only home-1, bag-1 and heart-1 exist in the exported handoff SVG set. Returns/addresses/payment/support/settings/logout icons were omitted (no outside icon sets used). They need export from Foundations 151:2.
6. Mobile menu (hamburger): drawn with CSS bars; no menu icon in the exported set.
7. Grid at 1280: the container is 1200 with 40px margins (KB margin 120 applies at the 1440 frame). There is no 375 frame in Figma (390 only); 375 was tested as requested.
8. Settings "Re-verify" (phone change, 127:5544) is not implemented, with a note in the UI. E-mail verification is BD-21.
9. Cart states "Insufficient stock" and "Price updated" are not implementable without BD-08/BD-16/BD-10.
10. Full-page mobile screenshots show the fixed bottom nav and sticky header mid-page. That's a capture artefact of fixed elements, not a layout bug.

## Accessibility / RTL (WCAG 2.2 AA)
`<html lang="fa" dir="rtl">` (verified per page in results.json) · logical CSS properties · Persian digits via `Intl` fa-IR, Jalali dates (`fa-IR-u-ca-persian`, unit-tested: 2026-10-04 → ۱۲ مهر ۱۴۰۵) · skip link · focus-visible outlines · dialogs with focus trap, Esc and focus restore · 44px targets · `prefers-reduced-motion` · pagination direction tested in the browser (next `<` sits left of page 1, never mirrored) · axe 0 violations on 54 renders.
Not measured: Lighthouse (not run). Screen-reader pass (not run). Contrast was checked by axe only.

## Risks / blockers / questions
- **Font licence (Vazirmatn) and photo rights (4 photos) are unconfirmed** (handoff README, G6/G7). The font is bundled locally from @fontsource (OFL per the package, but the client's licence/source still needs confirming). All men's products use one photo.
- Vercel: `vercel.json` + `api/index.ts` are prepared and the handler is tested locally through a Node http server. Rewrites, function bundling (sql.js wasm) and the Vercel runtime are **unverified until a CEO-approved deploy**. Serverless state is per instance (cart and orders reset on cold start), which is acceptable only for a sample demo.
- Q1 (Emma): approve or supply designs for placeholders 1–9 and the deviations list.
- Q2 (CEO): BD-01/02/03/06/07/11 block a real checkout.
- Q3 (COO): merge `build/docs/decision-log.md` into `CLI-002/decisions.md`? I didn't edit existing CLI-002 files.
- Tooling: all packages are free/OSS (react-router-dom, express, sql.js, playwright, @axe-core/playwright, vitest, jest-axe, concurrently). `npm audit` reports advisories in dev dependencies (not triaged).

## Engineering checklist
- [x] Meets the scope (all listed storefront areas, desktop + mobile) with flagged placeholders
- [x] Right project (CLI-002 only, no cross-project content)
- [x] Unknowns marked (BD stubs, sample labels)
- [x] Tests pass: 50/50 vitest, 20/20 browser flow, 0 axe violations / 54 renders
- [x] Secrets: none used; `.env.example` holds names only; scan clean; `.gitignore` covers `.env*`, `node_modules`, `dist`
- [ ] Emma's design review (next) · [ ] COO verification · [ ] CEO approval for any deploy
