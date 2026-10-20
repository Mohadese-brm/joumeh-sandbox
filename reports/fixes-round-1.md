# Fixes — round 1 (Emma's design review 2026-10-21)
Status: **Review** (not Done). Spec: `reports/design-review-2026-10-21.md`. Figma ft9A3u7cpJwySe9AfPWBBb, used read-only (get_metadata / get_design_context / get_screenshot only). Local commit only; no push or deploy.
Evidence: screenshots in `reports/shots/<page>-desktop.png` / `-mobile.png` (1280 / 375). Figma reference renders for this round are in `reports/figma-ref/r1/`. Tests: `reports/unit-api-component-tests.txt`, `reports/e2e-axe-shots.txt`, `reports/e2e-flow.txt`.

## Results
- tsc clean · build OK · vitest **56/56** (round-1 additions: `tests/round1.test.tsx` 4, API e-mail OTP + filters 2, plus updated auth/filter component tests)
- Playwright + axe: **70 renders (35 pages/states × 2 viewports), 0 violations**, 0 console errors (except the one expected 400 on address-add), no horizontal overflow
- Browser flow: **24/24** steps (was 20; added favourites remove, card→size-required, filter apply/reset)

## Majors
| # | Fix | Figma | Evidence |
|---|---|---|---|
| M1 | Account nav: 9 icons (home, orders, returns, location, heart, card, support, settings, red logout) exported read-only from Account / Navigation and recoloured to currentColor (active = teal, logout = red). No outside icon sets. Icons also show on mobile. | 124:4322 | all `account*`, `orders`, `order-detail`, `returns`, `return-detail`, `addresses`, `address-add`, `favorites`, `payment-info`, `settings`, `faq`, `contact` shots; `src/assets/icons/icon-nav-*.svg` |
| M2 | Filter sheet rebuilt to the design: drag handle, «دسته‌بندی» checkboxes, size chips, two-handle price slider, unlabelled colour swatches (name kept as an accessible label only), footer «نمایش N محصول» (primary, live count for the pending choices) + «پاک کردن» (outline). Sale-only toggle removed. CEO's Apply behaviour kept (results and URL change only on «نمایش N محصول»). Desktop reuses the same controls inline (P4 interim). Categories and price bounds come from sample data, **BD-18 stub**. API adds `type`, `minPrice`, `maxPrice`. | 69:15362 in 69:15332 (women), 69:15505 (men) | `women-filter-*`, `men-filter-*`; flow step "filter Apply…"; component test |
| M3 | Payment-info designed empty state: icon circle, «کارت بانکی ذخیره نشده است», explainer, green «پرداخت امن از طریق درگاه بانکی». Static, no card saving (BD-01). | 125:4203, 125:4733 | `payment-info-*`; round1 test |
| M4 | «قصه‌ی ما» image: crop exported read-only from ArchImage/Story (the handoff file had a different, framed crop). Symmetric arch: top radius w/2, bottom w×0.057 (480 → 240 / 27px). | 69:1456 in 55:282 | `home-desktop`, `home-mobile`; `public/img/story-arch@1x/2x.webp` |
| M5 | Favourites: red «حذف از علاقه‌مندی‌ها» link with the trash icon under the price, on every card. | 127:468 (m 127:5721) | `favorites-*`; flow step "…red remove link" |

## Minors
| # | Fix | Evidence |
|---|---|---|
| m1 | Toast under the header on the start (right) side; text ««نام محصول» به سبد اضافه شد» + «مشاهده سبد» + close (244:24767, 53:319). | `product-added-*` |
| m2 | Cart remove uses the trash icon (from 127:468, same Delete 1 glyph as 118:3600). | `cart-*` |
| m3 | Empty cart: bag in a grey circle, single CTA «مشاهده محصولات» (119:383). | `cart-empty-*` |
| m4 | 404: «۴۰۴» title, bag icon, «صفحه‌ای که دنبالش هستید پیدا نشد.», «بازگشت به صفحهٔ اصلی» (260:66609). | `not-found-*`; round1 test |
| m5 | Auth footer «هنوز عضو نیستید؟ ثبت‌نام کنید» (link switches to Signup mode); backdrop blur on all modals (108:5652, 107:643). | `auth-modal-*`; component test |
| m6 | Cream band between the story section and the footer removed (55:282). | `home-desktop` |
| m7 | City stays a text field. **D2 accepted as interim** (no city dataset; BD-02). No change. | `checkout-*` |
| m8 | PDP gallery 480px with a 76px gap, so info is 644px as in 57:282. | `product-desktop` |
| m9 | Search dropdown capped at 3 results (116:26240 / 116:29400). The count line still shows the total number of matches. | `search-*` |
| m10 | Mobile hamburger is now the Hicon Menu Hamburger icon exported from 55:587. | all `*-mobile` headers |

## Placeholder rulings applied
| # | Ruling | Done | Evidence |
|---|---|---|---|
| P3 | Code step per Auth/Modal Mode=Verify. Title «کد تأیید»; «کد ۶ رقمی به … ارسال شد»; «ویرایش شماره»; 6-box OTP Input (paste fills all boxes); countdown «ارسال مجدد کد تا ۰۱:۵۹» then the «ارسال مجدد کد» link (Resend 107:973); error «کد وارد شده نادرست است» with icon (107:1040); spinner on the button (107:1005); «ورود موفق» success (107:1078); mobile = bottom sheet (107:1543…). E-mail verify (107:1095) with «ویرایش ایمیل», as a **BD-21 mock**: works only for an existing account e-mail and sends nothing. Code length changed 5 → **6** to match the design. | `auth-code-*`; flow login steps; component + API tests |
| P8 | Size guide: designed layout (title, «جدول رسمی…», category/unit chips, table, sample note, info box, support line), modal on desktop, bottom sheet on mobile. All values are «—» (**BD-18**). Footer «راهنمای سایز» now opens the same layout as a page. | `size-guide-*`, `size-guide-page-*`; round1 test |
| P9 | Card bag button opens the PDP with the designed size-required state («لطفاً سایز را انتخاب کنید.» under the sizes, 260:62447 / 260:63048). The extra toast copy was removed. | `size-required-*`; flow step |
| P6 | FAQ (accordion, sample Q&A, «پاسخ خود را پیدا نکردید؟» card) and Contact (4 cards, BD-12) built in the account shell («پشتیبانی» title, support nav active) at `/account/support` and `/account/support/contact`. Footer links go to `/support` and `/support/contact` (guest view without the nav). | `faq-*`, `contact-*`, `faq-guest-*`; round1 test |
| P7 | **Not built.** Ticket form, list and detail (246:15742…246:17112) are waiting on the CEO. «ثبت درخواست پشتیبانی» is rendered disabled (aria-disabled) with a note. | `faq-*`, `contact-*` |
| P1/P2/P5 | Interim kept: payment, confirmation, carousel controls. | unchanged |
| D3/BD-11 | One order-number format app-wide: new orders now use the same sample numeric format as the seeded ones (e.g. ۱۰۱۲۵). The `STUB-` prefix was removed. Final format = CEO. | `orders-*`; API test; flow step "new order appears" |

## Could not match exactly / open
1. **Signup mode has no frame.** Only Mode=Login exists in 107:643. Signup reuses the phone flow with title «ثبت‌نام» and an engineering footer «حساب دارید؟ وارد شوید». Needs a design.
2. **Filter categories:** no taxonomy exists, so the sample type is the first word of each sample product name. That gives 9 entries for women, versus 3 in Figma. BD-18.
3. **Size-guide columns** follow the trousers sample in 245:61044 for every product. The column set per category is BD-18.
4. **Ticket CTA** is disabled until the CEO rules on P7.
5. **Desktop filter** is still not designed (inline reuse of the sheet controls, P4 interim).
6. The verify countdown uses the API's 120-second code lifetime (`otpTtlSeconds`, engineering default). Figma shows 01:59.
7. Not re-checked at 1440; screenshots are 1280 / 375 as before.
