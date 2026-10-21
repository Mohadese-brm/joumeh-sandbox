# Fix spec: 5 mismatches (CEO review via Totoro), CLI-002 Joumeh
Date: 2026-10-21 17:45 Asia/Tehran · Author: Emma (Senior Product Designer)
Source: Figma ft9A3u7cpJwySe9AfPWBBb, **read-only** (get_metadata / get_design_context / get_screenshot). No edits. Backup rNqrud8M7rl3twzSdKRELI not touched.

**Live build: not compared.** No Vercel URL is recorded anywhere in `clients/CLI-002/` (reports, README, docs, .vercel). Git shows deploy commits adf3d9a / e3c740f (13:52–13:56 Tehran), but no URL. The "current build" column below comes from **source review of the working tree**, which has **uncommitted `fix1` changes** by Alex (Grid, Layout, ProductCard, Shop, flags). It is not from rendering. Nothing here is verified visually or by interaction.

Token values are the Figma variables (fallback hex in brackets). Frame sizes: desktop 1440, mobile 390. Page margin = `layout/v2/page-margin` 120 desktop / 16 mobile.

> ⚠️ **Two of the five requested changes contradict the current Figma file** (items 2 and 4, plus mobile items in 3). Figma has favourite hearts on cards, and a «فیلترها» button and filter sheets in the mobile prototype frames. The CEO's instruction overrides Figma. Figma itself is not updated (read-only), so the design file and the build will diverge until she approves Figma edits. Listed under "Decisions / Figma follow-up".

---
## 1. Search bar placement in the header
**Component:** Navigation / Header 54:343 (component description: "Sticky header: bg/page 82% + background blur 20 + soft shadow. Logo 60 (desktop) links Home. 44 targets").
Variants: desktop Search = Closed 54:318 (Women 68:467 / Men 68:494 / Story 68:548), Open 116:2243, Typing 116:2277, Loading 116:2312, Results 116:2351, Focused 116:2408, Empty 116:2465, Error 116:2503. Mobile: Closed 54:342, Open 116:2546, Typing 116:2564, Loading 116:2583, Results 116:2606, Focused 116:2647, Empty 116:2688, Error 116:2710. Screens: 116:29400 / 116:29778 (d), 116:30038 / 116:30431 (m); prototype 116:26240 (Open), 116:26620, 116:27001, 116:27386.

### Desktop (instance 56:526 in 56:282, 1440×80)
- Header row: `justify-between`, padding-inline 120, height 80, bg `color/v2/bg-page` (#FDF7DB), border-bottom 1px `color/v2/border-subtle` (#E7E5E2), drop-shadow 0 1 5 rgba(61,41,26,.04), backdrop-blur 6.
- Three groups, visually left → right (RTL markup: Nav first):
  1. **Actions** (I56:526;68:468): **visual left edge, 360 wide**, gap 4. Order left→right: **User** 68:469 · **Bag** 68:470 · **Search** 68:471. Each is an IconButton 44×44, radius full, 24px Hicon Linear icon (Profile 1 72:8145, Bag 1 72:9216, Search 1 72:8930). Cart badge 118:3542: 20×20, radius 10, `action/primary` #1C7477, 1.5px white border, 12px Medium white; sits on the Bag button (left 72, top 2 within Actions). Signed-in dot 124:3921: 10×10 at the User icon.
  2. **Logo** (68:472): **centre**, 70×70.
  3. **Nav** (68:473): **visual right edge, 360 wide**, gap 24, justify-end. Items right→left: زنانه · مردانه · قصه‌ی ما, `v2/Label` 16/24 Medium. Item min-height 44, padding-inline 4. Active = `action/primary` text + 2px bottom border `action/primary`.
- **Search = Open/Focused (116:2408):** the search **icon is replaced in place by the field**. Search field 116:2432: absolute, **left 216, top 18 within the 1440 header** (= page margin 120 + User 44 + gap 4 + Bag 44 + gap 4). So it starts where the Search icon was and **extends 424px toward the logo** (ends at x 640; logo at 685). User and Bag stay visible to its left; Nav and logo don't move. Field specs:
  - Size and shape: 424×44, radius 22, bg `bg/surface` white, border 2px `border/focus` #15595B.
  - Spacing: gap 8, padding-left 2, padding-right 14.
  - Content (right→left): search icon, text `v2/Body` 16/28 `text/primary`, flexible spacer, Close button 40×40 r20 (116:2433) at the far left.
  - Placeholder copy (mobile 116:2546): «جست‌وجوی محصولات...», `text/secondary` #57534E.
- **Results dropdown 116:2442:**
  - Position and size: absolute left 216, **top 88**, width 424.
  - Container: padding 8, radius 16, bg white, border 1px `border/subtle`, shadow 0 8 24 rgba(0,0,0,.10).
  - Count row: «۳ نتیجه برای «کتان»», `v2/Caption` 12/20 `text/secondary`, padding 4/8/8.
  - Result row: 408×64, padding 8, gap 12, radius 12. Thumb 48×48, radii top 24 / bottom 8. Name `v2/Search/Result Name` 15 Medium. Price `v2/Search/Result Price` 14 Medium: regular `price-regular` #1C1917, sale `price-sale` #1C7477, original 12 Regular line-through `price-original` #57534E, gap 8.
  - Hover/active row (116:2451): bg `bg/subtle` #F4F3F1 + 2px `border/focus` #15595B.
  - States: Typing, Loading, Results, Empty and Error have variants (ids above). Copy for Loading / Empty / Error is in those variants; read them in Figma rather than inventing text.

### Mobile (54:342, 390×64)
- Row: padding-inline 16, `justify-between`. **Actions 100 wide at visual left: Bag 54:326 then Search 54:333** (44 each; no User icon on mobile). Logo 54:341 58×58 centre. Nav 100 wide at visual right holds **Menu (hamburger) 54:319**.
- **Search Open 116:2546:** the field does **not** sit in the 64px bar. A **Search panel 116:2553 drops below the header**: absolute top 64, full width 390, padding 12 top / 16 sides / 16 bottom, bg white, border-bottom 1px `border/subtle`. Field 116:2554 is full width with the same specs as desktop (44 h, r22, 2px `border/focus`, Close 40×40, placeholder «جست‌وجوی محصولات...»).

### Current build (source)
- `Layout.tsx:66`: the Search icon toggles `SearchBox` in place.
- `Layout.css:17-19`: `.search` absolute, width min(424, 100vw−32), `inset-inline-end: 96px` at ≥1024. Box 44 h, r22, 2px #15595B, padding 14/2.
- **Likely matches desktop** if the containing block is the Actions start at the page margin. **Unverified.** At 1280 the page margin is 40 (container 1200), so the offset must be 96 from the Actions edge, not from the viewport.
- **Mobile:** `.search` uses the same absolute overlay inside the 64px bar (width 100vw−32, vertically centred). **Figma uses a full-width panel below the header (116:2553). → Fix.**
- **Fix:** desktop: anchor the field to the Actions group's visual-left edge + 96 (search-icon slot), 424 wide, top 18; dropdown top 88. Mobile: render the panel at top 64, full width, padding 12/16/16, border-bottom.

## 2. Heart / wishlist: PDP only
**Figma today: product cards DO have a heart.** Product / Card Shop 87:16741 (all 9 variants, e.g. 87:16594 Default, 87:16638 Sale) contains `Product / Favorite Toggle` Style=Floating (266:67426), top-left of the media. The Icon Button description (52:219) says "Floating used for favourite on cards". The home/related/listing cards and Favorites 127:468 also show it. **The CEO's instruction (remove from cards) therefore changes the design.** Implement as instructed; Figma follow-up below.

**What to remove from cards:** the Floating favourite (44×44, white `bg/surface`, radius full, drop-shadow 0 2 4 rgba(0,0,0,.08), 24px Heart 1 icon) at the media's top-left. Keep the AddToCart floating button (87:16641: left 8, top 452 on a 378×504 media, same floating style, Bag 1 icon) unchanged.
- Open question: the Favorites page (127:468) relies on card hearts plus the red «حذف از علاقه‌مندی‌ها» link. The remove link can stay; whether Favorites cards also drop the heart needs CEO confirmation.

**PDP heart (keep):** `Favorite Toggle` instance **266:67491** in **Buy row 57:365** (desktop 57:282). Mobile: **266:70611** in Buy 57:636 (57:562).
- **Position, desktop:** Buy row is 644 wide, `justify-end`, gap 12, padding-top 8, height 58. Visual order right→left: **Quantity stepper** 57:340 (107×50, at right), **Add to cart** 57:350 (flex 1 = 469×48), **Heart** at the **far visual left**, x 0, y 11, **44×44**.
- **Position, mobile:** same row structure, 358 wide; heart at x 0, y 11, 44×44.
- **Style = Outline** (component set Product / Favorite Toggle 266:67451):

| State | Node | Spec |
|---|---|---|
| Not favorite | 266:67401 | 44×44, radius full, transparent bg, **1px `border/control` #78716C**, outline Heart 1 24px (`text/primary`) |
| Favorite | 266:67406 | same border, **filled heart** (teal, from the Heart 2 asset; colour is baked into the SVG, visually `action/primary` #1C7477) |
| Hover | 266:67411 | bg `bg/subtle` #F4F3F1 + same border, outline heart |
| Pressed | 266:67416 | grey fill + outline heart. The exact fill isn't exposed as a class; read it from 266:67416 in Figma |
| Disabled | 266:67421 | border as default, **opacity 40%** |
| Focus | not a variant | use the global focus ring (buttons: "Has Focus ring", 3:1+) |

(Floating variants 266:67426/31/36/41/46 are the card style. Not used after this change.)
- **Current build:** `ProductCard.tsx:35` removed the card heart (uncommitted fix1). Good. PDP `Product.tsx:71` / `Product.css:33`: border `--n-300` (should be #78716C `border/control`). Favourite state = teal-50 bg + teal border with the **same outline icon**; Figma = **filled heart, no bg tint**. Hover / disabled not specified.
- **Fix:** border #78716C; favourite = filled heart icon (export Heart 2 from 266:67406, read-only); hover bg #F4F3F1; disabled opacity .4; `aria-pressed` kept.

## 3. Sort: style, placement, options, selected state
**Desktop placement:** Women Shop / Desktop 56:282 (Men 56:1332). Title row 56:293 (x 120, y 88 in Content, 1200×83): **Select v2/مرتب‌سازی 56:286 at the visual left (x 0), 240×83**. Title block 56:285 at the visual right (title 42 h + «۲۷ محصول» 22 h). The grid (Body 56:525) starts 32 below the row (y 203).

**Control:** Sort / Dropdown 268:53379 ("Closed→Open via click. Options: جدیدترین · پرفروش‌ترین · ارزان‌ترین · گران‌ترین. Option states live in Sort / Option").
- Variants:
  - Closed: 268:53255 (جدیدترین), 268:53284 (پرفروش‌ترین), 268:53313 (ارزان‌ترین), 268:53342 (گران‌ترین).
  - Open: 268:53263, 268:53292, 268:53321, 268:53350.
  - Disabled: 268:53371.
- **Closed (268:53255):**
  - Width 240; persistent label «مرتب‌سازی» `v2/Label Small` 14/20 Medium `text/primary`, gap 8 above the field.
  - Field: min-h 48, padding 12/16, radius `r-md` 12, bg white, **1px `border/control` #78716C**.
  - Value `v2/Body` 16/28 `text/primary`, right-aligned; Icon/ChevD 20px at the visual left.
- **Open / focus (268:53263):** field border **2px `border/focus` #15595B**. **Menu 268:53271** below the field:
  - bg white, 1px `border/control` #78716C, radius 12, padding 6, gap 2, shadow 0 8 24 rgba(0,0,0,.12), width 242.
- **Option (Sort / Option 268:53254):** 228×42, padding 10/14, radius 8, `justify-between`.

| State | Node | Spec |
|---|---|---|
| Default | 268:53239 | 14 Regular `text/primary`, no bg |
| Hover | 268:53242 | bg `bg/subtle` #F4F3F1 |
| Pressed | 268:53245 | bg `border/control` #78716C |
| **Selected** | 268:53248 | bg `bg/subtle` #F4F3F1, label 14 **Medium** `action/primary` #1C7477, **✓ at the visual left** in `text/success` #0C652D |
| Disabled | 268:53251 | 14 Regular `text/disabled` #A8A29E |

- Base field states also exist in Forms / Select 52:341: Default 52:333, Focus 52:340, Error 244:60901, Disabled 244:60912, Empty 259:63916.

**Mobile placement:** Women Shop / Mobile 56:607 (Men 56:1657). Toolbar 56:627 (Results x 16, y 184; 32 below the title block) holds **Button/Sort 56:621, full width 358×46**, label «مرتب‌سازی: <value>» (outline teal style, see render 56:921). Grid starts 48 below (y 94 in Results).
- Tap → **Sort sheet** Women 56:921 / Men 56:1968 (prototype 69:15363 / 69:15536). Bottom Sheet/Sort 56:951 (component 54:649):
  - Container: 390 wide, top radius `r-xl` 24, bg white, shadow 0 −8 12 rgba(0,0,0,.16), padding 8 top / 16 sides / 24 bottom, gap 20.
  - HandleRow: 40×4 bar `border/control`, radius full, padding 8.
  - Head: title «مرتب‌سازی» `v2/Section heading` 24/36 Bold + Close IconButton 44.
  - Body gap 4: **Forms / Radio** 52:251: Off/Default 52:251, Off/Focus 52:254, On/Default 52:258, On/Focus 52:262 (48 tall rows). Selected = filled teal radio. Same 4 options.
- **Current build (source):**
  - Desktop uses a **native `<select>`** styled closed per 56:286 (`Shop.css:6-11`: 240, label 14/500, field 48, 1px #78716C, r12, focus 2px-ish ring). **The open option list is the OS-native menu, so the Figma menu (268:53271) and the option states (✓ + teal + bg) cannot appear. → Fix:** build a custom listbox per 268:53263 / 268:53254 (button + `role="listbox"`, arrow/Enter/Esc keys, `aria-selected`).
  - Focus border in Figma is 2px #15595B; the build uses a box-shadow ring. Align to 2px border.
  - Mobile: button + radio sheet exist (`Shop.tsx:40-47`) and match the structure. Check the radio visuals against 52:258 (unverified).

## 4. Filter: remove
- **Static final screens (page 01) have NO filter UI:**
  - **Desktop 56:282 / 56:1332:** the Title row holds only the title block and the Sort select. Grid 56:415 sits directly below. No filter button, panel or sidebar.
  - **Mobile 56:607 / 56:1657:** Toolbar 56:627 holds **only Button/Sort 56:621 at full width 358**. Nothing sits where a filter button would go; the Sort button takes the whole row.
- **But Figma does contain filter UI elsewhere (contradiction to flag):**
  - Mobile sort-sheet frames 56:921 / 56:1968 show a **«فیلترها» button** next to «مرتب‌سازی: جدیدترین» (two half-width buttons).
  - Prototype page 04 has **Filter sheets 69:15332 (women) / 69:15505 (men)**, with Bottom Sheet/Filter 69:15362 and Toolbar 69:15343: Button/Sort 173×46 + Button/Filter 173×46.
  - The desktop prototype has no filter.
  - The CEO's instruction = follow the page-01 final screens (no filter). This also supersedes the earlier relayed R-2 "select-then-Apply" decision and my P4/M2 rulings in design-review-2026-10-21.md.
- **Spec:**
  - Desktop: Title row = title block (right) + Sort 240 (left) only.
  - Mobile: Toolbar = **one full-width Button/Sort (358×46)**, no Filter button and no filter sheet. Grid 48 below.
- **Current build (source):** `flags.filterMode: 'off'`, and `Shop.tsx:15-16` says the desktop panel and mobile sheet were removed (uncommitted fix1). The mobile toolbar renders only the sort button. Consistent with the spec. **Unverified visually.** Remove the leftover API filter params later if unused (engineering choice).

## 5. Reviews «نظرات کاربران» (PDP)
**Placement:** desktop `Reviews` instance **266:71769** in 57:282, x 120, y 999, 1200×368, between Main (ends ≈919, 80 gap) and Related 57:470 (y 1447, 80 gap). Mobile **266:71829** in 57:562, 358×642.
**Component:** Review / Section 266:71080.
- Desktop: Available 266:70942, **No reviews 266:70976**, Loading 266:70987, Load failed 266:71001.
- Mobile: Available 266:71012, No reviews 266:71044, Loading 266:71055, Load failed 266:71069.

### Section anatomy (266:70942)
- **Head** 266:70943, `justify-between`: title «نظرات کاربران» **24 Bold** `text/primary` (visual right). **«ثبت نظر»** button at the visual left: Forms / Button 52:169 **Secondary**, bg `action/secondary` #FFE8D3, text `text/on-secondary` #5B4438, `v2/Label` 16/24 Medium, min-h 48, padding 12/24, radius 12.
- **Summary** 266:70952: full width, bg `bg/subtle` #F4F3F1, padding 20, radius 12, content at the visual right. Average column gap 4:
  - Score «۴٫۲» **36 Bold** `text/primary`.
  - Stars «★★★★☆» **18 Medium** `text/brand` #15595B.
  - «از ۵ · بر اساس ۱۲۸ نظر (نمونه)» **12 Regular** `text/secondary`.
- **Review list** 266:70957: row, gap 16. Desktop: 3 cards. Mobile: stacked.
- **Review card** 266:70958: 389 wide (desktop), bg white, **1px `border/control` #78716C**, padding 20, radius 12, column gap 8.
  - Top row (`justify-between`, 14 Medium): **name** `text/primary` at the visual right, e.g. «سارا م. (نمونه)»; **stars** «★★★★★» `text/brand` at the visual left.
  - Meta «۲ هفته پیش · سایز M (نمونه)», 12 Regular `text/secondary`.
  - Body 14 Regular `text/primary`, full width.
- **No reviews** (266:70976 / 266:71044): same Head (title + «ثبت نظر»), then a `bg/subtle` box with «هنوز نظری برای این محصول ثبت نشده است.» (bold) and «اولین نفری باشید که نظر می‌دهد.» (secondary).
- **Loading** (266:70987): Head + `bg/subtle` box with skeleton bars, 14 h, radius 7, `border/control` #78716C.
- **Load failed** (266:71001): Head + box with «بارگذاری نظرات انجام نشد.» (`text/error` #B41C1C) and a «تلاش دوباره» link (`text/brand`, underlined).
- All names, dates, scores and counts in Figma are labelled **(نمونه)**. Do not ship them as real data.

### Star rating input: Review / Star Rating 266:70941
Value=0 266:70905 … Value=5 266:70935 (151×44 each), ★ glyphs 28px Medium, gap 4. Filled = `text/brand` #15595B, empty = `border/subtle` #E7E5E2. **Hover and focus states for individual stars are not defined**: use the global focus ring, no invented hover.

### Submit flow: Review / Form 266:71357
Opened from «ثبت نظر» as an **overlay**: desktop prototype 266:71411 (modal), mobile 266:71435 (sheet). Interaction-spec line 17.
- Container: desktop **560 wide, radius 16**; mobile **390, top radius 16**. Padding 24, gap 16, bg white.
- Content:
  - Title «ثبت نظر» 20 Bold.
  - Label «امتیاز شما» + Star Rating.
  - Label «متن نظر» (`v2/Label Small` 14/20) + Textarea 244:61453 (h 120, padding 12/16, r12, 1px #78716C; error = 2px `text/error`).
  - Helper «قوانین طول متن و بررسی نظر هنوز تعیین نشده است (تصمیم باز).» 12 `text/secondary`.
  - Buttons row, gap 12: **«ثبت نظر» Primary** (#1C7477, white, 48) + **«انصراف» Outline** (white, 1px #1C7477, `text/brand`).

| State | Desktop | Mobile | Content |
|---|---|---|---|
| Empty | 266:71081 | 266:71221 | 0 stars, textarea placeholder «—» |
| Filled | 266:71108 | 266:71246 | 4 stars, sample text; demo link «شبیه‌سازی خطا (دمو)» (prototype only, do not ship) |
| Validation | 266:71134 | 266:71272 | textarea 2px red; «لطفاً امتیاز و متن نظر را وارد کنید.» 12 `text/error` |
| Submitting | 266:71159 | 266:71297 | primary button shows spinner (Button Loading) |
| Success | 266:71187 | 266:71323 | `bg/subtle` box, padding 16, r12: 48×48 circle `text/success` #0C652D with white ✓ 24 Bold; «نظر شما ثبت شد» 18 Bold; «پس از بررسی منتشر می‌شود (نمونه — قوانین بررسی هنوز تصمیم‌گیری نشده).» 14 secondary; full-width Primary «بستن» |
| Failure | 266:71195 | 266:71331 | «ثبت نظر انجام نشد. دوباره تلاش کنید.» 14 Medium `text/error`; primary becomes «تلاش دوباره» |

### BLOCKED (not defined in Figma, open decision BD-15)
- **Whether reviews ship at all** (remove for MVP vs launch with moderation). The build currently shows a BD-15 stub. **The CEO's request implies "show it", but BD-15 isn't formally closed.** Confirm.
- **Eligibility:** who may review (signed-in? verified buyers only?). Logged-out behaviour of «ثبت نظر» isn't designed.
- **Moderation:** pending/rejected states, whether a submitted review appears immediately.
- Text length limits and validation rules (Figma helper literally says undecided).
- Sort or pagination of the list, the "show all" behaviour when there are more than 3 reviews, review photos, helpful votes, replies: **not designed**.
- Average and count calculation and rounding; the source of «سایز M» in the meta line.
- Star hover/focus visuals, and the editing or deleting of one's own review: not designed.

### Current build (source)
`Product.tsx:51` replaces the rating row under the title with «امتیاز و نظرات: در انتظار تصمیم کسب‌وکار (BD-15)». `Product.tsx:86-87` shows the «نظرات کاربران» title + BD-15 stub only. There is no «ثبت نظر» button, summary, list, form or states. Figma's PDP rating row 57:300 («★★★★☆» + «۴٫۲ از ۵ · ۱۲۸ نظر») is also stubbed.
**Fix (once BD-15 allows):**
1. Build Section (4 states) and Form (6 states) per above.
2. Restore the PDP rating row 57:300 next to the title (y 109 in Head, 185 wide, right-aligned).
3. Until real data exists, show the **No reviews** state, not the Figma sample reviews.

---
## Decisions / Figma follow-up (for Mohadeseh)
1. **Card hearts:** Figma 87:16741 / 266:67426 has them. Confirm removal also on the Favorites grid (127:468) and home/related cards. Approve a Figma edit to remove the Floating favourite from Card Shop, or accept that the build intentionally diverges.
2. **Filter:** approve archiving or removing «فیلترها» from 56:921 / 56:1968 and the prototype frames 69:15332 / 69:15505 / 69:15343, so Figma matches. This supersedes the earlier relayed "select-then-Apply" decision.
3. **Reviews:** BD-15 go or no-go, eligibility, moderation, length rules.
4. Share the live Vercel URL so the build can be checked by eye. Until then nothing above is visually verified.
