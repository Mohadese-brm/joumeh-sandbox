# Design review — CLI-002 Joumeh storefront (local build) vs Figma
Date: 2026-10-21, Asia/Tehran · Reviewer: Emma (Senior Product Designer) · Figma ft9A3u7cpJwySe9AfPWBBb (read-only; get_metadata/get_screenshot only; backup rNqrud8M7rl3twzSdKRELI not touched)

**Method / limits.** Visual comparison of Alex's screenshots (`reports/shots/`, 1280 and 375) against `reports/figma-ref/` plus extra frame renders I pulled (69:15332, 125:383, 125:4203, 244:24767, 260:66609, 119:383, 127:468, 126:4601) and component metadata (Auth/Modal 107:*, Hero Carousel 68:807, Account/Navigation 124:4322). PASS = matches the screenshot evidence at this scale. This is **not** interaction testing, not a pixel/measurement audit (1280 vs 1440 and 375 vs 390 frames), and I did not inspect source CSS token-by-token. Mobile pages were spot-checked (home, filter sheet); not every mobile page was compared individually.

Overall: strong fidelity. Shared Header + Footer on every customer page, RTL, Vazirmatn, card arches, prices (17/13px) and colours match. No fidelity Blockers. Release is blocked by the undesigned payment/confirmation and the open BD decisions, not by build quality.

## Counts
Blocker 0 · Major 5 · Minor 10 · BLOCKED (CEO/business) 7

## Issues
| # | Sev | Page | Issue | Figma |
|---|---|---|---|---|
| M1 | Major | All account pages (overview, orders, order detail, returns, addresses, favorites, payment info, settings) | Account nav has no icons (only 3 SVGs were exported). Figma has an icon per item and a red logout icon. Fix: export the icons from the component (read-only export is fine), not from an outside set. | Account / Navigation 124:4322 (e.g. 124:3979), Foundations 151:2 |
| M2 | Major | women-filter / men (mobile) | Filter sheet is a placeholder although a design exists: Figma sheet has drag handle, category checkboxes, size chips, price-range slider, colour swatches (no labels), footer «نمایش N محصول» primary + «پاک کردن» outline. Build has size chips, labelled colour chips, an extra «فقط کالاهای حراج» toggle (not in the design) and «اعمال فیلتر»/«پاک کردن همه». Keep the CEO's Apply behaviour; use the designed visuals. Category/price data → BD-18. | 69:15362 inside 69:15332 (women), 69:15505 (men) |
| M3 | Major | account payment-info (desktop+mobile) | Build shows only a BD-01 banner; Figma has a designed empty state (icon, «کارت بانکی ذخیره نشده است», explainer, «پرداخت امن از طریق درگاه بانکی»). Implement the designed state; keep it static (no card saving). | 125:4203, 125:4733 |
| M4 | Major | home (desktop) | «قصه‌ی ما» story image: mask/crop does not match the symmetric arch (build shows a rectangle with one rounded corner and a different crop). | ArchImage/Story in 55:282 |
| M5 | Major | favorites | Each card in Figma has a red «حذف از علاقه‌مندی‌ها» link under the price; missing in build. | 127:468 (mobile 127:5721) |
| m1 | Minor | product-added | Toast sits top-left over the breadcrumb; Figma toast is under the header on the start (right) side, text ««نام محصول» به سبد اضافه شد» + «مشاهده سبد» + close. | 244:24767, Toast 53:319 |
| m2 | Minor | cart | Remove action uses a close-circle icon; Figma uses a trash icon. | 119:594, Cart / Item 118:3600 |
| m3 | Minor | cart-empty | Figma: bag icon in a circle, one CTA «مشاهده محصولات». Build: two CTAs (زنانه/مردانه) + extra line. | 119:383 |
| m4 | Minor | not-found | Figma: «۴۰۴» title, bag icon, «صفحه‌ای که دنبالش هستید پیدا نشد.», CTA «بازگشت به صفحه اصلی». Build copy/CTA differ, no icon. | 260:66609 (mobile 260:67502) |
| m5 | Minor | auth-modal | Footer copy changed to «… با همین شماره ثبت‌نام می‌شوید.»; Figma: «هنوز عضو نیستید؟ ثبت‌نام کنید» (link to Signup mode). Backdrop blur missing. | 108:5652, Auth/Modal 107:643 |
| m6 | Minor | home | Cream band between the story section and the footer; Figma has none. | 55:282 |
| m7 | Minor | checkout | City is a text field; Figma uses a Select (see deviation D2). | 58:790 |
| m8 | Minor | product | Gallery column reads wider than Figma's at 1280 (proportion only; re-check at 1440). | 57:282 |
| m9 | Minor | search | Dropdown lists 6 results; Figma shows 3. Cap or confirm the count. | 116:26240 / 116:29400 |
| m10 | Minor | mobile header | Hamburger drawn with CSS bars; Figma uses the Hicon Menu icon (export it). | 55:587 header |

## BLOCKED (business decisions — CEO)
| Item | Pages | Handoff ref |
|---|---|---|
| Payment step + gateway | payment | BD-01; not designed (CU-18–20) |
| Order confirmation, delivery promise, SMS | confirmation | BD-03, BD-13; not designed |
| Shipping fees / methods / free-shipping threshold (۲ میلیون vs ۳۲۰٬۰۰۰) | cart, checkout, PDP trust lines | BD-02 |
| VAT line | cart, checkout | BD-06 |
| Order number format (۱۴۰۵-۰۰۱۲۴ on 125:383 vs ۱۰۱۲۴ on 126:4163) | account, orders, confirmation | BD-11 |
| Reviews shown or removed | product | BD-15 (Figma has sample reviews) |
| Info/legal pages content (shipping, returns, terms, careers, blog, story) | info | BD-14, BD-04 |

## Page verdicts (27 pages)
| Page | Verdict | Notes |
|---|---|---|
| home | FAIL | M4, m6, m10 (rest matches 55:282 / 55:587) |
| women | PASS | 56:282 |
| women-p2 | PASS | |
| men | PASS | one shared men's photo = known asset gap |
| women-filter | FAIL | M2 (mobile); desktop has no design (interim OK) |
| product | BLOCKED | BD-15 reviews, BD-02/03/04 trust lines; m8 |
| product-added | PASS | m1 |
| search | PASS | m9 |
| auth-modal | PASS | m5; code step → see P3 |
| cart | PASS | m2; discount line red = per Figma |
| cart-empty | PASS | m3 |
| checkout | BLOCKED | BD-02/06/07/24; m7 |
| payment | BLOCKED | not designed (BD-01) |
| confirmation | BLOCKED | not designed (BD-03/11/13) |
| account | FAIL | M1 |
| account-guest | PASS | engineering default, no frame |
| orders | FAIL | M1 (order no. BD-11) |
| order-detail | FAIL | M1; layout roughly matches 126:4601 |
| returns | FAIL | M1 (else matches 126:35068) |
| return-detail | FAIL | M1 |
| addresses | FAIL | M1 (else matches 126:36113) |
| address-add | FAIL | M1 |
| favorites | FAIL | M1, M5 |
| payment-info | FAIL | M1, M3 |
| settings | FAIL | M1 (else matches 127:4624; Re-verify 127:5544 not built) |
| info | BLOCKED | BD-14; see P6 |
| not-found | PASS | m4 |
Most FAILs clear with one fix (M1).

## Placeholder rulings
| # | Placeholder | Ruling |
|---|---|---|
| P1 | Payment step | Genuinely not designed (BD-01). Interim accepted for a demo only. |
| P2 | Order confirmation | Genuinely not designed. Interim accepted for a demo only. |
| P3 | Code step in sign-in modal | **Use Figma**: Auth/Modal Mode=Verify — Mobile: Default 107:941, Error 107:1040, Loading 107:1005, Resend 107:973, Success 107:1078 (mobile size 107:1543/1640/1607/1575/1678); Email 107:1095… (BD-21). OTP Input 53:234, OTP Digit 53:215. |
| P4 | Filter panel | Mobile: **use Figma** 69:15362 (women 69:15332, men 69:15505). Desktop: not designed → acceptable interim, reusing the mobile sheet's controls inline. Drop the «فقط کالاهای حراج» toggle unless approved. |
| P5 | Carousel controls | Genuinely not designed (68:807 has only 3 slides per size: 68:636/670/704, mobile 68:738/772/806). Acceptable interim (manual dots/arrows, no autoplay), using arrow icons 72:8058/72:8061. |
| P6 | Footer info pages | FAQ → **use** Support/FAQ 246:15454 (m 246:17249); Contact → Support/Contact 246:15613 (m 246:17397); Size guide → 245:61044. Shipping, returns, terms, careers, blog, story: not designed and content is BD-14/BD-04 → interim accepted. |
| P7 | Support page | **Use Figma** 246:* — FAQ 246:15454, Contact 246:15613, Ticket form 246:15742 (+ states 246:15883–246:16443), Ticket list 246:16592 (+ 246:16738/16864/16986), Ticket detail 246:17112; mobile 246:17249–246:18775. Channels/hours are BD-12 samples. Building it is a scope addition, so it needs the CEO's go-ahead. |
| P8 | Size guide content | **Use Figma layout** 245:61044 (sheet 245:61112; proto 266:70709/266:70716; Bottom Sheet Type=Size guide 244:61642). Table values are content → BLOCKED BD-18; keep labelled as sample. |
| P9 | Card cart button | Not designed (no quick-add). Acceptable interim: go to the PDP; reuse the designed size-required state 260:62447 (m 260:63048) instead of new toast copy. |

## Deviation rulings
| # | Deviation | Ruling |
|---|---|---|
| D1 | Account menu icons missing | **Rejected (Major M1).** Icons exist in Account/Navigation 124:4322; the handoff asset set only exported 15 icons (assets-manifest.md). Export from Figma (read-only); no outside icon sets. |
| D2 | City as text field | **Accepted as interim.** Figma 58:790 shows a Select, but no city list exists in the design data and inventing one isn't allowed. Needs a city dataset (data/business decision with BD-02 shipping zones). |
| D3 | Order number format | **BLOCKED — BD-11** (business-rules-and-open-decisions.md lists exactly ۱۰۱۲۴ vs ۱۴۰۵-۰۰۱۲۴). One value app-wide is correct; the format is the CEO's call. Not BD-06 (that's VAT). |
| D4 | Red discount line in cart | **Accepted — matches Figma 119:594** (token color/error = red/600 #B41C1C). Design note: using the error colour for a saving is questionable; I'll raise it as a design follow-up, no change now. |
| D5 | Men's products share one photo | Known asset gap (assets-manifest.md; photo rights unconfirmed). Not a build issue. |
| D6 | 1200 container at 1280 | Accepted (KB margin 120 applies at 1440). |
| D7 | Card arch w×0.057 | Accepted (my 02:16 spec; KB §3 is outdated). |

## Decisions needed from the CEO
1. BD-01 payment provider and BD-03 delivery promise, then approval to design payment + confirmation (scope proposal Option A).
2. BD-11 order number format.
3. BD-02 shipping fees/zones (+ city list source), BD-06 VAT, BD-07 guest checkout, BD-24 COD/pickup.
4. BD-15 keep or remove reviews.
5. BD-14/BD-04 info and legal page content.
6. Whether the Support pages (246:*) are in build scope.
7. Pending in my chat: confirmation of the R-01/02/03 decisions relayed by Alex (20% badge, carousel, Apply filters).

---
## Round 1 verification (commit 7caa267) — 2026-10-21 03:15 Tehran
Method: same as above. New build screenshots (1280/375) compared with Figma renders pulled read-only (107:773, 107:941, 107:973, 245:61044, 246:15454, 246:15613) plus the round-0 references. Visual evidence only; no interaction testing, no 1440 check.

### Majors
| # | Status | Evidence |
|---|---|---|
| M1 account nav icons | FIXED | All account, FAQ and contact shots show the 9 icons with teal active state and red logout, matching 124:4322. |
| M2 mobile filter sheet | FIXED | women/men-filter-mobile: drag handle, «دسته‌بندی» checkboxes, size chips, two-handle price slider, unlabelled swatches, «نمایش N محصول» + outline «پاک کردن»; sale toggle gone (69:15362). The category count is a separate question (Q-b). |
| M3 payment-info empty state | FIXED | Icon circle, «کارت بانکی ذخیره نشده است», explainer, green secure line (125:4203). |
| M4 story arch | FIXED | Symmetric arch and new crop on home-desktop. Note: a faint light line runs along the top edge of the image; check that it isn't an export edge. |
| M5 favourites remove link | FIXED | Red «حذف از علاقه‌مندی‌ها» with trash icon under each card (127:468). |

### Minors
| # | Status | Evidence |
|---|---|---|
| m1 toast | FIXED | Under the header, right side, «مانتو کتان کویری» به سبد اضافه شد + «مشاهده سبد» + close (244:24767). |
| m2 cart trash | FIXED | Trash icon on every row. |
| m3 empty cart | FIXED | Bag in a grey circle + single «مشاهده محصولات» (119:383). |
| m4 404 | FIXED | «۴۰۴», bag icon, designed copy and CTA (260:66609). |
| m5 auth footer + blur | FIXED | «هنوز عضو نیستید؟ ثبت‌نام کنید» link; backdrop blurred. But the Signup screen itself does not follow the existing design. See Q-a: **new item R1-2**. |
| m6 cream band | FIXED | The story section sits on white straight into the footer. |
| m7 city field | ACCEPTED interim (D2), unchanged | |
| m8 PDP gallery | FIXED (proportion, at 1280) | The gallery column is now narrower; Alex reports 480/76/644 per 57:282. I didn't measure it. |
| m9 search cap | FIXED | 3 results; the count line shows the total matches. |
| m10 hamburger icon | FIXED | Hicon icon in the mobile header. |

### Placeholder rulings
| # | Status | Evidence / gap |
|---|---|---|
| P1/P2 payment, confirmation | Interim kept (not designed) | — |
| P3 code step | PARTIAL | Matches 107:941 for title, sent line, «ویرایش شماره», 6 boxes and «تأیید و ورود». Gaps: (1) **R1-3** the boxes are wider spaced than the design's tight row, and the first box shows no focus ring (107:941 shows it focused); (2) **R1-4** a grey «SMS آزمایشی (BD-13)… کد محلی: 591020» box isn't in the design. It's fine for the local demo, but it must sit behind a dev flag and never ship; (3) the countdown starts at ۰۲:۰۰ (see Q-c). |
| P4 filter | Mobile FIXED. Desktop: interim accepted (inline panel, no design). |
| P5 carousel controls | Interim kept (not designed) | Arrows + dots visible on search-desktop. |
| P6 FAQ / contact | FIXED | Matches 246:15454 and 246:15613 (layout, accordion, help card, 4 contact cards, support nav active). Both «ثبت درخواست پشتیبانی» buttons are disabled pending P7; the design shows them enabled, which is acceptable while P7 waits. |
| P7 tickets | Not built, BLOCKED (CEO scope) | — |
| P8 size guide | FIXED with notes | Layout matches 245:61044: product line, subtitle, chips, table, sample note, info box, support line. Differences: **R1-5 (Minor)** an extra «راهنمای سایز» title row above the product line that isn't in the design; rows are S–XXL vs the design's sample ۱/۲/۳ (content is BD-18). |
| P9 card cart → size required | FIXED | size-required-desktop shows the red «لطفاً سایز را انتخاب کنید.» under the sizes (260:62447); no extra toast. |
| D3 order number | One format app-wide, final format BLOCKED (BD-11) | |

### Answers to Alex
- **Q-a Signup.** **It is designed.** Alex's note "only Mode=Login exists" is wrong. The Auth/Modal set has Mode=Signup variants:
  - Mobile: Default 107:773, Error 107:851.
  - Email: Default 107:812, Error 107:896.
  - Mobile size: 107:1375, 107:1453, 107:1414, 107:1498.
  - The design: title «عضویت» (not «ثبت‌نام»), the same mobile/email tabs, required fields «نام *», «نام خانوادگی *» and «شماره موبایل», «ادامه», and footer «قبلاً عضو شده‌اید؟ ورود».
  - The footer copy «حساب دارید؟» does **not** exist in the design.
  - **R1-2 (Major):** rebuild Signup from 107:773 and its variants.
- **Q-b 9 sample categories vs 3.** Acceptable as a labelled interim (the «داده نمونه (BD-18)» chip is shown). The design's 3 (مانتو / پیراهن / کیمونو) are themselves samples, and there's no taxonomy, so neither list is authoritative. Keep the sample label. Don't invent a category taxonomy; the real list comes from BD-18. For release, the list is BLOCKED on the CEO.
- **Q-c Countdown.** All of 107:941 (Default), 107:973 (Resend) and the other Verify variants show the timer as a static «ارسال مجدد کد تا ۰۱:۵۹». Nothing in the design states a start value or duration; 01:59 is a snapshot of a running timer. The intended start can't be derived from the design. The 120-second lifetime is an engineering/SMS-provider value (BD-13). Showing ۰۲:۰۰ and counting down is consistent with it, so it is accepted. The final duration is to be confirmed with BD-13.
- **Q-d Desktop filter.** Confirmed again: **no desktop filter design exists.** Women Shop / Desktop 56:282 has only the sort Select v2 56:286 in its title row. The screen inventory lists only the mobile Filter sheets 69:15332 / 69:15505 (Bottom Sheet/Filter 69:15362). The Bottom Sheet set 54:650 has only Sort and Size guide types. The inline panel stays an interim.

### Remaining fixes for Alex (round 2)
1. **R1-2 Major:** Signup per Auth/Modal Mode=Signup (107:773 / 107:851 / 107:812 / 107:896; mobile 107:1375…). Title «عضویت», fields نام* / نام خانوادگی* / شماره موبایل, footer «قبلاً عضو شده‌اید؟ ورود».
2. **R1-3 Minor:** OTP row spacing as in 107:941, and the first box focused on open.
3. **R1-4 Minor:** hide the SMS demo code box behind a dev-only flag.
4. **R1-5 Minor:** remove the extra «راهنمای سایز» title row in the size guide modal/sheet (245:61044 / 245:61112), unless the sheet's handle title needs it. Check 245:61112.
5. Check the faint line at the top edge of the story image (M4).

### Round 1 counts
Majors 5/5 FIXED. Minors 9 FIXED, 1 accepted interim. Placeholders: P3 PARTIAL; P4 mobile, P6, P8, P9 FIXED; P1, P2, P5 and desktop P4 interim; P7 BLOCKED. New: 1 Major (R1-2) and 3 Minors (R1-3, R1-4, R1-5), plus 1 check (story-image edge line).

---
## Round 2 verification (commit 0255de8) — 2026-10-21 03:25 Tehran
Method: as before. New/changed shots compared with Figma renders pulled read-only (107:773, 107:851, 107:1375, 107:941, 108:6003, 245:61112, plus the round 1 renders). I also ran rg on `dist/` and read the source. Visual evidence only; no interaction testing.

| # | Item | Status | Evidence |
|---|---|---|---|
| R1-2 | Signup | **PARTIAL** | **Desktop matches.** signup-desktop vs 107:773: «عضویت», the tabs, «نام *», «نام خانوادگی *» (placeholders «مثلاً سارا / مثلاً احمدی»), «شماره موبایل», «ادامه», «قبلاً عضو شده‌اید؟ ورود». signup-error vs 107:851: red border, icon and «شماره موبایل معتبر نیست». signup-email follows 107:812 plus a labelled BD-21 note. **Mobile does not match: R2-1.** |
| R1-3 | OTP spacing / focus | FIXED | auth-code-desktop vs 107:941: tight 6-box row, first box shows the teal focus ring. |
| R1-4 | Demo code box | FIXED (UI) | `rg "dev-otp\|SMS آزمایشی\|کد محلی" dist/` finds no match. The JSX was dead-code-eliminated; only the inert `{showDevOtpBox:!1}` flag object remains. Not visible in auth-code shots. **Residual risk R2-2** (below). |
| R1-5 | Size-guide title | FIXED | size-guide-desktop: no title row, close only, as in 245:61044. Mobile sheet keeps «راهنمای سایز», which is correct: 245:61112 shows the handle, «راهنمای سایز» and a close button. |
| M4 | Story-image edge line | FIXED | Zoomed home-desktop: clean arch edge. The texture at the top is the loom's warp threads (photo content), not a fringe. |

### New findings
- **R2-1 (Major, pattern mismatch): mobile auth is a bottom sheet, but Figma shows a centred modal.**
  - Figma: Auth / Modal on Home / Mobile **108:6003** shows the modal as a centred card with side margins over the dimmed page, with no drag handle. The mobile variants (107:1247 login, 107:1375 signup, 107:1543 verify…) are 343-wide cards with all corners rounded.
  - Build: signup, signup-error, signup-email, auth-modal and auth-code on mobile all render as a bottom sheet with a drag handle.
  - This dates from round 1 (my round-1 P3 note didn't catch it).
  - Fix: render the mobile auth/verify/signup modal as the centred card per 108:6003. Bottom sheets stay only where the design uses them (filter 69:15362, sort, size guide 245:61112).
- **R2-2 (engineering, not design fidelity): demo code can still reach the client through the API.**
  - The API still returns `devCode` whenever `NODE_ENV !== 'production'` (`server/config.ts:10` → `server/app.ts:150`).
  - Nothing in `api/` or `vercel.json` sets NODE_ENV, so whether the code is exposed on a deployed preview depends on the runtime default.
  - Recommend an explicit opt-in flag (off by default) and an API test asserting no `devCode` in production mode. Flag for Alex/QA; deploy itself needs CEO approval anyway.
- No other regressions seen in the changed shots (home, auth-code, size-guide-desktop).

### Sign-off status
**Not yet signed off: one Major remains (R2-1, mobile auth presentation).** Everything else matches Figma on the screenshot evidence, except the interim and BLOCKED items:
- Interim: payment (P1), confirmation (P2), carousel controls (P5), desktop filter (P4), city text field (D2), 9 sample categories (BD-18), timer ۰۲:۰۰ (BD-13).
- BLOCKED for the CEO: BD-01/02/03/06/07/11/14/15/18/21/24 and support tickets (P7).

Once R2-1 is fixed and re-shot, I expect to give design-match approval with those exceptions. R2-2 should be closed before any deploy.
