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
