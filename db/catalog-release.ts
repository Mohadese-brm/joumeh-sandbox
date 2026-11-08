// Catalog release 2026-11-08. Idempotent and non-destructive.
// Applied once per database (schema_migrations id below) from migrate() when products already exist
// (the live Postgres path: migrations run on start, db:seed does not re-seed a non-empty catalogue)
// and from seed() on an empty database (in-memory preview and a fresh db:seed).
//
// What it will do on a database that still has the original catalogue:
//   • Insert the named products below, only when their slug is absent. Photos are static files in public/img/products.
//   • Set a price ONLY when that product has no prices row. An existing price is an admin edit and is left alone.
//   • Add S / M / L / XL variants ONLY when the product has no variants yet. Existing variants (and their stock flags) stay.
//   • Attach photos ONLY when the product has no images yet.
//   • Unpublish products that are still published and still have no price. Rows are never deleted.
//   • تاپ «نارنج» is the exception: no price, every size unavailable, and it stays published.
// Names, descriptions, sort order, images and publish state of products this release does not mention are not rewritten,
// except for the unpublish rule above. Running it again after the migration id is recorded is a no-op.
import type { Db } from '../server/db.js';
import { CATALOG } from './catalog.js';

export const RELEASE_ID = '0005_catalog_2026_11';
export const SIZES = ['S', 'M', 'L', 'XL'] as const;
/** The only catalogue note that identifies a shorts product (P08, several colourways, one product). */
export const SHORTS_PRICE = 1_390_000;
/** Every existing product whose category is men. */
export const MENS_PRICE = 1_490_000;
export const NARENJ_SLUG = 'narenj';

export type ReleaseColor = { name: string; key: string; hex: string | null };
export type ReleaseImage = { file: string; alt: string };
export type ReleaseProduct = {
  slug: string; name: string; category: 'women' | 'men';
  /** null = no price row. نارنج is the only new product with a null price. */
  price: number | null;
  /** Every size is inserted unavailable. */
  soldOut?: boolean;
  colors: ReleaseColor[];
  images: ReleaseImage[];
};

// Swatch hexes are sampled from the garment in the photo (a circle of colour, not a policy).
const PINK: ReleaseColor = { name: 'صورتی', key: 'pink', hex: '#C48E86' };
const CREAM: ReleaseColor = { name: 'شیری', key: 'cream', hex: '#ECD8BB' };

export const NEW_PRODUCTS: ReleaseProduct[] = [
  { slug: 'sarv', name: 'کت کتان «سرو»', category: 'women', price: 2_190_000, colors: [], images: [{ file: 'r-sarv.webp', alt: 'کت کتان «سرو»' }] },
  { slug: 'gelareh', name: 'پیراهن بلند «گلاره»', category: 'women', price: 3_790_000, colors: [PINK, CREAM], images: [
    { file: 'r-gelareh-pink.webp', alt: 'پیراهن بلند «گلاره» — صورتی' },
    { file: 'r-gelareh-cream.webp', alt: 'پیراهن بلند «گلاره» — شیری' },
  ] },
  { slug: 'yalda', name: 'شومیز «یلدا»', category: 'women', price: 1_690_000, colors: [], images: [{ file: 'r-yalda.webp', alt: 'شومیز «یلدا»' }] },
  { slug: 'yas', name: 'کت کتان «یاس»', category: 'women', price: 2_190_000, colors: [], images: [{ file: 'r-yas.webp', alt: 'کت کتان «یاس»' }] },
  { slug: 'darai', name: 'کراپ «دارایی»', category: 'women', price: 2_190_000, colors: [], images: [{ file: 'r-darai.webp', alt: 'کراپ «دارایی»' }] },
  // No price, on purpose. Stays on the shop as ناموجود; Add to Cart stays disabled.
  { slug: NARENJ_SLUG, name: 'تاپ «نارنج»', category: 'women', price: null, soldOut: true, colors: [], images: [{ file: 'r-narenj.webp', alt: 'تاپ «نارنج»' }] },
  // Price confirmed by the owner on 2026-11-08: 1,190,000 is the shirt, not the shawl.
  { slug: 'mahtab', name: 'شومیز «مهتاب»', category: 'women', price: 1_190_000, colors: [], images: [{ file: 'r-mahtab.webp', alt: 'شومیز «مهتاب»' }] },
  { slug: 'pesteh', name: 'پیراهن «پسته»', category: 'women', price: 2_690_000, colors: [], images: [{ file: 'r-pesteh.webp', alt: 'پیراهن «پسته»' }] },
  { slug: 'aseman', name: 'پیراهن بلند «آسمان»', category: 'women', price: 3_790_000, colors: [], images: [{ file: 'r-aseman.webp', alt: 'پیراهن بلند «آسمان»' }] },
  { slug: 'golnar', name: 'دامن «گلنار»', category: 'women', price: 1_490_000, colors: [], images: [{ file: 'r-golnar.webp', alt: 'دامن «گلنار»' }] },
  { slug: 'shaghayegh', name: 'روپوش بلند «شقایق»', category: 'women', price: 3_790_000, colors: [], images: [{ file: 'r-shaghayegh.webp', alt: 'روپوش بلند «شقایق»' }] },
];

export type PriceTarget = { slug: string; price: number; kind: 'shorts' | 'men' };

/** Prices for products already in db/catalog.ts. Shorts that are also categorised men take the men's price. */
export function existingPriceTargets(catalog = CATALOG): PriceTarget[] {
  const men = catalog.filter(p => p.category === 'men').map(p => ({ slug: p.slug, price: MENS_PRICE, kind: 'men' as const }));
  const menSlugs = new Set(men.map(p => p.slug));
  const shorts = catalog
    .filter(p => !menSlugs.has(p.slug) && /shorts/i.test(p.notes))
    .map(p => ({ slug: p.slug, price: SHORTS_PRICE, kind: 'shorts' as const }));
  return [...shorts, ...men];
}

/** Existing catalogue rows this release leaves without a price (they are unpublished, not deleted). */
export function unpublishedExisting(catalog = CATALOG) {
  const priced = new Set(existingPriceTargets(catalog).map(p => p.slug));
  return catalog.filter(p => !priced.has(p.slug));
}

const countOf = async (t: Db, sql: string, params: unknown[]) =>
  Number((await t.one<{ n: number }>(sql, params))?.n ?? 0);

async function categoryId(t: Db, slug: string) {
  const c = await t.one<{ id: number }>('SELECT id FROM categories WHERE slug=?', [slug]);
  if (!c) throw new Error(`catalog release: category "${slug}" is missing`);
  return c.id;
}

async function ensureImages(t: Db, id: number, images: ReleaseImage[]) {
  if (await countOf(t, 'SELECT COUNT(*) AS n FROM images WHERE product_id=?', [id]) > 0) return;
  for (const [k, im] of images.entries())
    await t.run('INSERT INTO images (product_id,url,alt,position) VALUES (?,?,?,?)', [id, `/img/products/${im.file}`, im.alt, k]);
}

async function ensureVariants(t: Db, id: number, slug: string, colors: ReleaseColor[], available: number) {
  if (await countOf(t, 'SELECT COUNT(*) AS n FROM variants WHERE product_id=?', [id]) > 0) return;
  const cols = colors.length ? colors : [{ name: '', key: 'x', hex: null }];
  for (const c of cols) for (const s of SIZES)
    await t.run('INSERT INTO variants (product_id,size,color,color_hex,sku,available) VALUES (?,?,?,?,?,?)',
      [id, s, c.name, c.hex, `rel-${slug}-${c.key}-${s}`, available]);
}

/** Inserts the listed price only when the product has none. Never updates an existing amount. */
async function ensurePrice(t: Db, id: number, price: number | null) {
  if (price == null) return;
  if (await t.one('SELECT product_id FROM prices WHERE product_id=?', [id])) return;
  await t.run('INSERT INTO prices (product_id,amount) VALUES (?,?)', [id, price]);
}

async function ensureNewProduct(t: Db, p: ReleaseProduct, sort: number) {
  const existing = await t.one<{ id: number }>('SELECT id FROM products WHERE slug=?', [p.slug]);
  const id = existing?.id ?? await t.insert(
    `INSERT INTO products (slug,name,category_id,status,description,sort_rank,created_at,is_sample,publish_state) VALUES (?,?,?,'default','',?,?,0,'published')`,
    [p.slug, p.name, await categoryId(t, p.category), sort, '2026-11-08 12:00:00']);
  // An existing row keeps its name, description and publish_state (an admin may have edited them).
  await ensurePrice(t, id, p.price);
  await ensureVariants(t, id, p.slug, p.colors, p.soldOut ? 0 : 1);
  await ensureImages(t, id, p.images);
}

async function ensureExistingPrice(t: Db, target: PriceTarget) {
  const row = await t.one<{ id: number }>('SELECT id FROM products WHERE slug=?', [target.slug]);
  if (!row) return; // do not recreate a catalogue row the database no longer has
  await ensurePrice(t, row.id, target.price);
  await ensureVariants(t, row.id, target.slug, [], 1);
}

/**
 * Applies the release. Returns true when it wrote, false when there is nothing to do
 * (already applied, or the products table is still empty — seed() calls this after it inserts).
 * Safe to call twice: the second call finds RELEASE_ID and writes nothing. The statements themselves
 * also refuse to overwrite an existing price, name, image set or variant set.
 */
export async function applyCatalogRelease(db: Db): Promise<boolean> {
  return db.tx(async t => {
    if (t.dialect === 'pg') await t.run('SELECT pg_advisory_xact_lock(7243100)');
    if (await t.one('SELECT id FROM schema_migrations WHERE id=?', [RELEASE_ID])) return false;
    if (await countOf(t, 'SELECT COUNT(*) AS n FROM products', []) === 0) return false;
    await t.syncIds();
    for (const [i, p] of NEW_PRODUCTS.entries()) await ensureNewProduct(t, p, i);
    for (const target of existingPriceTargets()) await ensureExistingPrice(t, target);
    // Hide whatever is still published with no price. نارنج has no price and is excluded. Nothing is deleted.
    await t.run(`UPDATE products SET publish_state='unpublished' WHERE publish_state='published' AND slug<>? AND NOT EXISTS (SELECT 1 FROM prices pr WHERE pr.product_id=products.id)`, [NARENJ_SLUG]);
    await t.run(`INSERT INTO schema_migrations (id, applied_at) VALUES (?, datetime('now'))`, [RELEASE_ID]);
    return true;
  });
}
