// Startup seed for the storefront (branch catalog-real, 2026-10-24): the REAL Joumeh catalogue from db/catalog.ts.
// The old Figma sample products, sample customer, orders, returns and favourites are no longer seeded
// (they live on only as a test fixture: tests/fixtures/sample-seed.ts).
import type { Database } from 'sql.js';
import { CATALOG, type CatalogProduct } from './catalog.js';
import { samplePlaceholdersOn, withSamplePlaceholders, sampleStatus, sampleSizeAvailable } from './sample-placeholder-data.js';
export const SAMPLE_LABEL = 'داده نمونه';
export const SAMPLE_PHONE = '09123456789';
/** Shown wherever a price would be, while price is null (owner has not sent prices yet). */
export const PRICE_ON_REQUEST = 'قیمت به‌زودی / تماس بگیرید';
const faDigit = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

export function seedCategories(db: Database) {
  db.run(`INSERT INTO categories (id, slug, name) VALUES (1,'women','زنانه'),(2,'men','مردانه')`);
}

/** Inserts the real catalogue. No price row is written while price is null (prices.amount stays NOT NULL; the API LEFT JOINs prices). */
export function seedCatalog(db: Database, catalog: CatalogProduct[] = CATALOG, opts: { sample?: boolean } = {}) {
  const sample = !!opts.sample;
  catalog.forEach((p, i) => {
    const id = i + 1; const st = sample ? sampleStatus(i) : { status: 'default', badgePercent: null };
    db.run('INSERT INTO products (id,slug,name,category_id,status,badge_percent,description,sort_rank,created_at,is_sample) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [id, p.slug, p.name, p.category === 'men' ? 2 : 1, st.status, st.badgePercent, p.description ?? '', i, '2026-10-24 12:00:00', sample ? 1 : 0]);
    if (p.price != null) {
      // salePrice (if ever set) is the payable amount; price becomes the original. Only real owner-supplied values go here.
      const sale = p.salePrice != null && p.salePrice < p.price;
      db.run('INSERT INTO prices (product_id,amount,original_amount) VALUES (?,?,?)', [id, sale ? p.salePrice : p.price, sale ? p.price : null]);
    }
    // Variants only from owner-supplied sizes/colours (none yet). SKU = P-ID based.
    for (const c of p.colours.length ? p.colours : [{ name: '', hex: null }])
      for (const s of p.sizes)
        db.run('INSERT INTO variants (product_id,size,color,color_hex,sku,available) VALUES (?,?,?,?,?,?)',
          [id, s, c.name, c.hex, `${p.pid}-${c.name || 'x'}-${s}`, p.stock === 0 || (sample && !sampleSizeAvailable(s)) ? 0 : 1]);
    p.images.forEach((im, k) => db.run('INSERT INTO images (product_id,url,alt,position) VALUES (?,?,?,?)',
      [id, im.url, `${p.name} — عکس ${faDigit(k + 1)}`, k]));
  });
}

/** design-batch-2026-10-26: placeholder business data (db/sample-placeholder-data.ts) is overlaid when the single switch is on. */
export function seed(db: Database, placeholders = samplePlaceholdersOn()) {
  seedCategories(db);
  if (placeholders) seedCatalog(db, withSamplePlaceholders(CATALOG), { sample: true });
  else seedCatalog(db);
}
