// ============================================================================================================
//  SAMPLE OVERLAY MODE — gerdoo-update-2026-10-28 (CEO request: sample data on the live Gerdoo store, clearly labelled «نمونه»).
//  NON-DESTRUCTIVE: nothing is written to the catalogue tables. The API layers labelled placeholder values over every product
//  that has NO real price yet (prices row missing), at READ time:
//    price / sale price / «جدید» status (db/sample-placeholder-data.ts rules), sizes S–XXL + colours (virtual variants, negative ids),
//    sample description (only when the real one is empty), sample rating 4.2 / 128 + 3 sample reviews (real reviews listed first).
//  A product drops out of the overlay the moment a real price is saved in the admin. Turning the flag off restores the bare catalogue.
//  Sample cart lines live in server MEMORY only (lost on restart; never in cart_items / orders).
//  While the overlay is ON, order submission and payment are REFUSED (409 sample_mode) for every cart, so nobody can order at a
//  sample price. Switch: JOUMEH_SAMPLE_OVERLAY=1 (default OFF). Not a policy: prices, sizes, colours and reviews are placeholders.
// ============================================================================================================
import { SAMPLE_DESCRIPTION, SAMPLE_REVIEWS, SAMPLE_RATING, sampleSizeAvailable } from '../db/sample-placeholder-data.js';

export const sampleOverlayOn = (env: Record<string, string | undefined> = process.env) => env.JOUMEH_SAMPLE_OVERLAY === '1';

/** Same 8 placeholder prices and sale rule (every 4th product, 20 %, R-1) as db/sample-placeholder-data.ts. Index i = product id − 1. */
const PRICES = [2_450_000, 3_200_000, 1_850_000, 4_100_000, 2_900_000, 3_650_000, 2_200_000, 5_300_000];
const isSale = (i: number) => i % 4 === 1;
const payable = (i: number) => { const p = PRICES[i % 8]; return isSale(i) ? Math.round((p * 0.8) / 10_000) * 10_000 : p; };
const COLOURS = [{ name: 'کرم (نمونه)', hex: '#E9DCC3' }, { name: 'خاکی (نمونه)', hex: '#B08A63' }, { name: 'سبزآبی (نمونه)', hex: '#1C7477' }];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

/** SQL fragments (portable SQLite + Postgres) used by PRODUCT_SQL when the overlay is on. `pr` = prices, `p` = products. */
const idx = '((p.id - 1) % 8)';
const caseOf = (vals: (number | null)[]) => `CASE ${idx} ${vals.map((v, k) => `WHEN ${k} THEN ${v ?? 'NULL'}`).join(' ')} END`;
export const OVERLAY_SQL = {
  price: `COALESCE(pr.amount, ${caseOf(PRICES.map((_, k) => payable(k)))})`,
  originalPrice: `CASE WHEN pr.amount IS NULL THEN ${caseOf(PRICES.map((p, k) => (isSale(k) ? p : null)))} ELSE pr.original_amount END`,
  currency: `CASE WHEN pr.amount IS NULL THEN 'IRT' ELSE pr.currency END`,
  status: `CASE WHEN pr.amount IS NULL THEN (CASE WHEN (p.id - 1) % 4 = 1 THEN 'sale' WHEN (p.id - 1) % 5 = 2 THEN 'new' ELSE 'default' END) ELSE p.status END`,
  badge: `CASE WHEN pr.amount IS NULL THEN (CASE WHEN (p.id - 1) % 4 = 1 THEN 20 ELSE NULL END) ELSE p.badge_percent END`,
  isSample: `CASE WHEN pr.amount IS NULL THEN 1 ELSE p.is_sample END`,
  overlay: `CASE WHEN pr.amount IS NULL THEN 1 ELSE 0 END`,
};

/** Virtual variant id: −(productId × 100 + colour × 10 + size). Never collides with real (positive) ids. */
export const virtualVariantId = (pid: number, ci: number, si: number) => -(pid * 100 + ci * 10 + si);
export function decodeVirtualVariant(id: number) {
  if (!Number.isInteger(id) || id >= 0) return null;
  const n = -id; const pid = Math.floor(n / 100), ci = Math.floor((n % 100) / 10), si = n % 10;
  const colours = coloursFor(pid);
  if (pid < 1 || ci >= colours.length || si >= SIZES.length) return null;
  return { pid, size: SIZES[si], color: colours[ci].name, available: sampleSizeAvailable(SIZES[si]) };
}
const coloursFor = (pid: number) => COLOURS.slice(0, 1 + ((pid - 1) % 3));
export const sampleVariants = (pid: number) => coloursFor(pid).flatMap((c, ci) => SIZES.map((s, si) => ({
  id: virtualVariantId(pid, ci, si), size: s, color: c.name, colorHex: c.hex, sku: `SAMPLE-${pid}-${ci}-${s}`, available: sampleSizeAvailable(s) ? 1 : 0, sample: true })));
export const sampleDescription = (real: string) => (real && real.trim() ? real : SAMPLE_DESCRIPTION);
export const sampleReviewsBlock = (real: { rating: number }[], realCount: number) => ({
  reviews: [...real, ...SAMPLE_REVIEWS.map(r => ({ ...r, createdAt: undefined }))], count: SAMPLE_RATING.count + realCount, average: SAMPLE_RATING.average, sample: true });

/** In-memory sample cart lines: cartId → (virtual variant id → quantity). Lost on restart by design (sample only). */
export class SampleCartLines {
  private m = new Map<number, Map<number, number>>();
  get(cid: number) { return [...(this.m.get(cid) ?? new Map<number, number>()).entries()].map(([variantId, quantity]) => ({ variantId, quantity })); }
  add(cid: number, vid: number, q: number) { const c = this.m.get(cid) ?? new Map<number, number>(); c.set(vid, Math.min(99, (c.get(vid) ?? 0) + q)); this.m.set(cid, c); if (this.m.size > 5000) this.m.delete(this.m.keys().next().value!); }
  has(cid: number, vid: number) { return !!this.m.get(cid)?.has(vid); }
  set(cid: number, vid: number, q: number) { this.m.get(cid)?.set(vid, q); }
  remove(cid: number, vid: number) { this.m.get(cid)?.delete(vid); }
}
export const SAMPLE_MODE_NOTICE = 'حالت نمایشی: قیمت‌ها، سایزها، رنگ‌ها و نظرها «نمونه» هستند و ثبت سفارش غیرفعال است.';
