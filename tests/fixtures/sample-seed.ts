// TEST FIXTURE ONLY (moved from db/seed.ts on branch catalog-real, 2026-10-24). Never loaded by the app.
// It keeps cart/checkout/order/return logic under test while the real catalogue has no prices yet.
// «داده نمونه» — SAMPLE DATA ONLY. Names/prices copied from Figma ft9A3u7cpJwySe9AfPWBBb frames 55:282, 56:282, 57:282, 119:594, 125:383,
// 126:4163, 126:35068, 126:36113, 127:4624 as visual samples. Not real catalogue, customer or order data.
import type { Db } from '../../server/db';
import { SAMPLE_LABEL, SAMPLE_PHONE, seedCategories } from '../../db/seed';
export { SAMPLE_LABEL, SAMPLE_PHONE };
type P = [name: string, status: 'default' | 'sale' | 'new', price: number, original: number | null, badge: number | null];
// BD-10: Figma shows مانتو کتان کویری at ۱٬۸۵۰٬۰۰۰ (shop 56:282) and ۱٬۴۸۰٬۰۰۰/۱٬۸۵۰٬۰۰۰ (home/PDP). One source here: the PDP sample. Unresolved.
// R-1: its badge is 16 (desktop) vs 20 (mobile) in Figma. Value supplied by flag `r1SampleBadgePercent` (server/config.ts).
export const WOMEN: P[] = [
  ['مانتو کتان کویری', 'sale', 1480000, 1850000, null],
  ['پیراهن لینن شنی', 'sale', 1290000, 1590000, 19],
  ['کیمونو دست‌باف', 'new', 2450000, null, null],
  ['تونیک نخی آفتاب', 'default', 980000, null, null],
  ['کت بلند خاکی', 'new', 2890000, null, null],
  ['دامن پلیسه‌ی ماسه', 'default', 1390000, null, null],
  ['جلیقه‌ی بافت', 'sale', 1590000, 1890000, 16],
  ['شلوار گشاد کتان', 'sale', 1150000, 1390000, 17],
  ['شال پشمی دار', 'default', 690000, null, null],
];
export const MEN: P[] = [
  ['پیراهن لینن کویر', 'default', 1190000, null, null],
  ['شلوار کتان خاکی', 'sale', 1350000, 1590000, 15],
  ['کت نخی سبک', 'new', 2250000, null, null],
  ['جلیقه‌ی پشمی', 'default', 1450000, null, null],
];
const WOMEN_IMG = ['/img/product-women-lilac-shirt@1x.webp', '/img/product-women-arch@1x.webp'];
const MEN_IMG = '/img/product-men-doorway@1x.webp'; // Figma: every men's product uses the same photo (handoff README)
const COLORS: [string, string][] = [['قهوه‌ای خاکی', '#946F5D'], ['کرم', '#FDF7DB'], ['سبزآبی', '#1C7477'], ['نارنجی', '#FF8847'], ['مشکی', '#1C1917']];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const DESC = 'متن نمونه‌ی توضیحات محصول. توضیحات نهایی، جنس و راهنمای شست‌وشو پس از تأیید محتوا جایگزین می‌شود. (داده نمونه)';
const faDigit = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

export async function seedSample(db: Db, opts: { r1SampleBadgePercent: number | null } = { r1SampleBadgePercent: 20 }) {
  await seedCategories(db);
  let id = 0;
  const add = async (cat: number, base: P[], count: number, prefix: string) => {
    for (let i = 0; i < count; i++) {
      const [n, status, price, orig, badge0] = base[i % base.length];
      const round = Math.floor(i / base.length);
      const name = round ? `${n} ${faDigit(round + 1)}` : n;
      id++;
      const badge = status === 'sale' ? (id === 1 ? opts.r1SampleBadgePercent : badge0) : null;
      await db.run('INSERT INTO products (id,slug,name,category_id,status,badge_percent,description,sort_rank,created_at,is_sample) VALUES (?,?,?,?,?,?,?,?,?,1)',
        [id, `${prefix}-${i + 1}`, name, cat, status, badge, DESC, i, `2026-10-${String(20 - (i % 20)).padStart(2, '0')} 10:00:00`]);
      await db.run('INSERT INTO prices (product_id,amount,original_amount) VALUES (?,?,?)', [id, price, orig]);
      const cols = [COLORS[i % COLORS.length], COLORS[(i + 1) % COLORS.length]];
      for (const [c, hex] of cols) for (const s of SIZES)
        await db.run('INSERT INTO variants (product_id,size,color,color_hex,sku,available) VALUES (?,?,?,?,?,?)', [id, s, c, hex, `SAMPLE-${id}-${hex.slice(1)}-${s}`, s === 'XXL' ? 0 : 1]);
      const imgs = cat === 1 ? [WOMEN_IMG[i % 2], WOMEN_IMG[(i + 1) % 2], WOMEN_IMG[i % 2], WOMEN_IMG[(i + 1) % 2]] : [MEN_IMG, MEN_IMG];
      for (const [p, url] of imgs.entries()) await db.run('INSERT INTO images (product_id,url,alt,position) VALUES (?,?,?,?)', [id, url, `${name} — عکس ${faDigit(p + 1)} (${SAMPLE_LABEL})`, p]);
    }
  };
  await add(1, WOMEN, 27, 'women'); // Figma 56:282: «۲۷ محصول»
  await add(2, MEN, 16, 'men');     // men's count not stated in Figma → sample count
  // Sample signed-in customer (Figma 125:383 «سارا»), sample orders/returns/addresses/favourites.
  await db.run(`INSERT INTO users (id,phone,first_name,last_name,email,email_verified) VALUES (1,?, 'سارا','احمدی','sara@example.com',0)`, [SAMPLE_PHONE]);
  await db.run(`INSERT INTO addresses (user_id,recipient,phone,province,city,line,postal_code,is_default) VALUES
    (1,'سارا احمدی','09123456789','تهران','تهران','خیابان نمونه، کوچه‌ی نمونه، پلاک ۱۲، واحد ۳','1234567890',1),
    (1,'سارا احمدی','09123456789','اصفهان','کاشان','بلوار نمونه، کوچه‌ی دوم، پلاک ۸','8715987654',0)`);
  await db.run('INSERT INTO favorites (user_id,product_id) VALUES (1,2),(1,5),(1,9)');
  const addr = JSON.stringify({ recipient: 'سارا احمدی', phone: '09123456789', province: 'تهران', city: 'تهران', line: 'خیابان نمونه، کوچه‌ی نمونه، پلاک ۱۲، واحد ۳', postalCode: '1234567890' });
  const orders: [number, string, string, string, string, [number, number][]][] = [
    [10124, 'processing', 'paid', 'unfulfilled', '2026-10-04', [[1, 1], [4, 1]]],
    [10108, 'shipped', 'paid', 'shipped', '2026-09-25', [[1, 1]]],
    [10091, 'delivered', 'paid', 'delivered', '2026-09-11', [[3, 1], [2, 1]]],
    [10076, 'cancelled', 'refunded', 'unfulfilled', '2026-08-24', [[5, 1]]],
    [10042, 'delivered', 'paid', 'delivered', '2026-08-10', [[9, 1]]],
  ];
  for (const [oid, os, ps, fs, date, items] of orders) {
    let sub = 0; let disc = 0;
    for (const [pid, q] of items) { const pr = (await db.one<{ amount: number; original_amount: number | null }>('SELECT amount, original_amount FROM prices WHERE product_id=?', [pid]))!; const r = [pr.amount, pr.original_amount] as number[]; sub += (r[1] ?? r[0]) * q; disc += ((r[1] ?? r[0]) - r[0]) * q; }
    await db.run(`INSERT INTO orders (id,user_id,order_number,order_status,payment_status,fulfilment_status,shipping_method,shipping_fee,vat_amount,subtotal,discount,total,address_json,is_sample,created_at)
      VALUES (?,1,?,?,?,?,NULL,NULL,NULL,?,?,?,?,1,?)`, [oid, String(oid), os, ps, fs, sub, disc, sub - disc, addr, `${date} 12:00:00`]);
    for (const [pid, q] of items) {
      const v = (await db.one<Record<string, unknown>>('SELECT p.name, pr.amount, v.id, v.size, v.color FROM products p JOIN prices pr ON pr.product_id=p.id JOIN variants v ON v.product_id=p.id WHERE p.id=? AND v.size=\'M\' ORDER BY v.id LIMIT 1', [pid]))!; const p = [v.name, v.amount, v.id, v.size, v.color];
      await db.run('INSERT INTO order_items (order_id,product_id,variant_id,name,size,color,unit_price,quantity) VALUES (?,?,?,?,?,?,?,?)', [oid, pid, p[2], p[0], p[3], p[4], p[1], q]);
    }
  }
  await db.run(`INSERT INTO returns (user_id,order_id,product_id,return_number,status,reason,created_at) VALUES
    (1,10091,3,'م-۲۰۳','reviewing','دلیل نمونه (داده نمونه)','2026-09-19 10:00:00'),
    (1,10042,9,'م-۱۸۷','refunded','دلیل نمونه (داده نمونه)','2026-08-20 10:00:00')`);
}

/** Seeder for createDb(sampleSeed) in tests: the old sample catalogue + sample customer/orders/returns. */
import { config } from '../../server/config';
export const sampleSeed = (db: Db) => seedSample(db, { r1SampleBadgePercent: config.r1SampleBadgePercent });
