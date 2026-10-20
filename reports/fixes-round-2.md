# Fixes — round 2 (Emma's «Round 1 verification», 2026-10-21)
Status: **Review**. Figma read-only (get_design_context / get_screenshot). Local commit only; no push or deploy. Reference renders are in `reports/figma-ref/r2/`.

## Results (production build, `vite preview` + local API)
- tsc clean · build OK · vitest **57/57**
- Playwright + axe: **76 renders (38 pages/states × 1280 + 375), 0 violations, 0 console errors** except the expected 400 on address-add, no overflow
- Browser flow **26/26** (new: signup end-to-end; it also checks that the first OTP box is focused and that no demo-code box shows in the production build)
- Production bundle check: `rg "dev-otp|SMS آزمایشی" dist/assets/*.js` → no match

## Items
| # | Item | Status | Change | Evidence |
|---|---|---|---|---|
| R1-2 (Major) | Signup | FIXED | Mode=Signup per 107:773 / 107:851 / 107:812 (/896 by state), mobile size 107:1375…1498 = bottom sheet. Title «عضویت»; mobile/email tabs; «نام *» «نام خانوادگی *» (placeholders «مثلاً سارا / مثلاً احمدی»); «شماره موبایل» or «ایمیل»; «ادامه»; footer «قبلاً عضو شده‌اید؟ ورود». «حساب دارید؟» removed. Required-name errors and the design's «شماره موبایل معتبر نیست» error (checked on the client, red border + icon). The API stores the names for a new account and never overwrites existing names. E-mail signup is a **BD-21 stub**: fields validate, then a labelled note says to sign up by mobile. | `signup-*`, `signup-error-*`, `signup-email-*`; component test; API test; flow "signup…" |
| R1-3 | OTP spacing and focus | FIXED | Row = flex, 48×56 boxes, 8px gap (OTP Input 53:234), centred. First box focused on open, with the focus border #15595B + teal-200 ring (107:941). The modal's focus trap now runs only on mount, so it no longer steals focus while typing. | `auth-code-*`; component test (activeElement); flow assertion |
| R1-4 | Demo SMS code box | FIXED | Behind `devFlags.showDevOtpBox` (`src/config/dev.ts`) = `import.meta.env.DEV \|\| VITE_SHOW_DEV_OTP==='1'`. Off in production builds and removed from the bundle; on in vitest and dev. The e2e flow reads the mock code from the local API response instead. | `auth-code-*` (no box); bundle grep; flow assertion |
| R1-5 | Size-guide extra title row | FIXED | Desktop modal: «راهنمای سایز» heading hidden visually (kept as the dialog's accessible name), with only the close button as in 245:61044. Mobile sheet keeps the «راهنمای سایز» header, because 245:61112 shows it. | `size-guide-desktop`, `size-guide-mobile` |
| M4 check | Line on the story image edge | FIXED | Cause: the exported PNG carries its own anti-aliased arch mask, which sat exactly on the CSS clip and left a fringe pixel at the edge. Now the arch clip sits on a wrapper and the image is scaled 3%, so the PNG's masked edge falls outside the clip. Verified at 2× zoom. | `home-desktop`, `home-mobile` |
| Q-b | 9 sample categories | KEPT, labelled | The «دسته‌بندی» legend carries the «داده نمونه (BD-18)» chip. No taxonomy was invented. | `women-filter-*`, `men-filter-*` |
| Q-c | Timer ۰۲:۰۰ | ACCEPTED (BD-13) | No change. | — |
| Q-d | Desktop filter | Interim (no design) | No change. | `women-filter-desktop` |

## Changed screenshots
- New: `signup-*`, `signup-error-*`, `signup-email-*`.
- Visibly changed: `auth-code-*`, `size-guide-desktop`, `home-*` (story edge).
- All 76 shots were retaken; the other pages are unchanged in content.

## Open
- E-mail signup and e-mail OTP: BD-21. Category list: BD-18. Timer duration: BD-13. Support tickets (P7): CEO.
