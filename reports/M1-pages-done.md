# Milestone 1: pages done (CLI-002 Joumeh storefront)
Date: 2026-10-21 (Asia/Tehran) · Owner: Alex Dorosty · **Status: Review (not Done)**. Next: Emma's design review via the COO.
Location: `clients/CLI-002/build/` (moved from `dev-handoff/joumeh-build/` per CEO decision 02:11; the old folder was left in place, not deleted). All paths below are relative to `build/`.

## Routes built (desktop + mobile, RTL, Vazirmatn)
| Route | Figma reference | Notes |
|---|---|---|
| `/` Home | 55:282 / 55:587, hero set 68:807 | Hero carousel (manual, R-3 decided), women/men features, best sellers ×2, story |
| `/women`, `/men` (`?page=&sort=&size=&color=&sale=`) | 56:282 / 56:607 / 56:921, 56:1332 | 9 per page, pagination per KB (page 1 right, `<` = next, never mirrored), sort select (desktop) / sheet (mobile), filters select-then-Apply (R-2 decided) |
| `/product/:slug` | 57:282 / 57:562, 244:24767 | Breadcrumb, gallery + thumbs, colour/size, qty, add-to-cart toast with «مشاهده سبد», favourite, size-guide modal (BD-18 stub), reviews (BD-15 stub), related |
| Header search dropdown | 116:29400 | Results / no results / error + retry |
| Auth modal | 108:5652 / 108:6003 | Mobile tab = phone OTP (mock SMS); e-mail tab = BD-21 stub |
| `/cart` | 119:383…119:3092 | Empty, one, multiple, qty change, removed + undo (toast), unavailable, loading, error |
| `/checkout` | 58:790 / 58:967 | Stepper, address form prefilled from default address, shipping methods (BD-02 sample), summary with BD-02/BD-06 stubs; login required (BD-07) |
| `/checkout/payment` | **not designed** | Flagged placeholder, MockProvider (BD-01) |
| `/checkout/confirmation/:id` | **not designed** | Flagged placeholder |
| `/account` + orders, order detail, returns, return detail, addresses (list/add/edit/validation/delete confirm), favourites, payment info, settings (view/edit/saving/success/validation/server error), logout confirm | 125:*, 126:*, 127:* | Guest → sign-in prompt |
| `/info/:slug`, 404 | 260:66609 (404) | Footer info pages are flagged placeholders |

## Evidence at this milestone
`npx tsc -p .` clean. Playwright run (`npm run e2e`, dev server) rendered 27 routes/states × 2 viewports = 54 renders: 0 axe violations, 0 horizontal overflow; 2 expected console entries (the 400 from the deliberate address-validation test). Full QA is in M3.
