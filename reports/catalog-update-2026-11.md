# Catalogue update 2026-11-08

Preview only. This does not merge, does not push `release-gerdoo-2026-10-27` or `main`, and does not touch the live Gerdoo database. The live database changes only when this branch is later deployed there and the process starts (migrations run on start).

## What the live Postgres will change

Recorded once as `schema_migrations.id = 0005_catalog_2026_11` (`db/catalog-release.ts`). A second boot does nothing. No product row is deleted.

Applied only when `products` is already non-empty (the live database). A brand-new empty database gets the same result from `npm run db:seed`.

1. **Inserts these products if the slug is missing.** Existing slug keeps its name, description and publish state. Photos are files in the build (`public/img/products/r-*.webp`), not the in-memory upload store.
   - کت کتان «سرو» `sarv` — 2,190,000
   - پیراهن بلند «گلاره» `gelareh` — 3,790,000 — colors صورتی / شیری
   - شومیز «یلدا» `yalda` — 1,690,000
   - کت کتان «یاس» `yas` — 2,190,000
   - کراپ «دارایی» `darai` — 2,190,000
   - تاپ «نارنج» `narenj` — no price, every size unavailable, stays **published**
   - شومیز «مهتاب» `mahtab` — 1,190,000 (owner confirmed 2026-11-08: the shirt, not the shawl)
   - پیراهن «پسته» `pesteh` — 2,690,000
   - پیراهن بلند «آسمان» `aseman` — 3,790,000
   - دامن «گلنار» `golnar` — 1,490,000
   - روپوش بلند «شقایق» `shaghayegh` — 3,790,000
2. **Sets a price only when that product has no `prices` row.** An admin price already stored is left as-is.
   - Shorts: `p08` (the only catalogue note that says “Shorts”) — 1,390,000. Its existing photos stay.
   - Men: `p35` `p36` `p37` `p38` `p39` — 1,490,000 each. Their existing photos stay.
3. **Adds sizes S, M, L, XL only when the product has no variants yet.** An admin variant set is not replaced and stock flags are not rewritten.
4. **Unpublishes** every product that is still `published` and still has no price, except `narenj`. Draft and archived rows are left alone.

`JOUMEH_SAMPLE_OVERLAY` is not changed by the migration. **Live must set it off** (remove `JOUMEH_SAMPLE_OVERLAY=1` and redeploy). While it is on, every checkout returns 409 `sample_mode`. Priced products already drop out of the overlay; `narenj` is also excluded so it does not pick up a sample price.

Payment is still the labelled placeholder (BD-01, MockProvider). The order is stored; no money moves. Shipping, returns, email and opening hours are still labelled as not decided.

## Unpublished (hidden, still in the database)

These 35 keep their placeholder names. They had no price in this list.

- مجموعه یزد – ۰۱ (`p01`)
- مجموعه یزد – ۰۲ (`p02`)
- مجموعه یزد – ۰۴ (`p04`)
- مجموعه یزد – ۰۵ (`p05`)
- مجموعه یزد – ۰۶ (`p06`)
- مجموعه یزد – ۰۷ (`p07`)
- مجموعه یزد – ۰۹ (`p09`)
- مجموعه یزد – ۱۰ (`p10`)
- مجموعه یزد – ۱۱ (`p11`)
- مجموعه یزد – ۱۲ (`p12`)
- مجموعه یزد – ۱۳ (`p13`)
- مجموعه یزد – ۱۴ (`p14`)
- مجموعه یزد – ۱۵ (`p15`)
- مجموعه یزد – ۱۶ (`p16`)
- مجموعه یزد – ۱۷ (`p17`)
- مجموعه یزد – ۱۸ (`p18`)
- مجموعه یزد – ۲۰ (`p20`)
- استودیو – ۲۳ (`p23`)
- استودیو – ۲۴ (`p24`)
- استودیو – ۲۵ (`p25`)
- استودیو – ۲۶ (`p26`)
- استودیو – ۲۷ (`p27`)
- استودیو – ۲۸ (`p28`)
- استودیو – ۲۹ (`p29`)
- استودیو – ۳۰ (`p30`)
- استودیو – ۳۱ (`p31`)
- استودیو – ۳۲ (`p32`)
- استودیو – ۳۳ (`p33`)
- استودیو – ۳۴ (`p34`)
- استودیو – ۴۰ (`p40`)
- استودیو – ۴۱ (`p41`)
- استودیو – ۴۲ (`p42`)
- استودیو – ۴۳ (`p43`)
- استودیو – ۴۴ (`p44`)
- استودیو – ۴۵ (`p45`)

## Uncertain

- If live already has a **different price** on `p08` or `p35`–`p39`, that price is kept. The overlay does not write prices, so a fresh live catalogue should receive 1,390,000 and 1,490,000.
- If an admin already added variants to those products, sizes are not added or changed.
- `p08` is the only product whose catalogue note says shorts. No other shorts product was priced at 1,390,000.
- Men's prices follow `category = men` (`p35`–`p39` only).
- Color swatches for گلاره use hexes sampled from the photos (`#C48E86` صورتی, `#ECD8BB` شیری).
- Email, opening hours, shipping fees and the real payment provider were not supplied and are still placeholders.
