// ============================================================================================================
//  SAMPLE / PLACEHOLDER BUSINESS DATA — design-batch-2026-10-26
//  Everything in this file is DEMO DATA for layout and flow testing (prices, sizes, colours, stock, ratings,
//  reviews, descriptions). It is NOT the owner's real data and NOT policy. Every product it touches is stored with
//  is_sample = 1 and the UI labels it «داده نمونه» / «(نمونه)».
//  ONE SWITCH: set JOUMEH_SAMPLE_PLACEHOLDERS=0 to serve the bare real catalogue (null prices, no variants) again.
//  Do not add shipping, returns, payment or stock policies here — those stay BD stubs (BD-02/04/06/16).
// ============================================================================================================
import type { CatalogProduct } from './catalog.js';

/** The single on/off switch (read at seed time). Default ON for this branch so search, cart and PDP can be exercised. */
export const samplePlaceholdersOn = () => process.env.JOUMEH_SAMPLE_PLACEHOLDERS !== '0';
export const SAMPLE_TAG = '(نمونه)';

/** Placeholder prices in Toman — round demo values only. */
const SAMPLE_PRICES = [2_450_000, 3_200_000, 1_850_000, 4_100_000, 2_900_000, 3_650_000, 2_200_000, 5_300_000];
/** Swatch colours from the Figma PDP (57:282) colour options; names are sample names. */
const SAMPLE_COLOURS = [
  { name: 'کرم (نمونه)', hex: '#E9DCC3' }, { name: 'خاکی (نمونه)', hex: '#B08A63' }, { name: 'سبزآبی (نمونه)', hex: '#1C7477' },
];
/** Sizes as drawn on the Figma PDP (S–XXL, XXL shown disabled). */
const SAMPLE_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
export const SAMPLE_DESCRIPTION = 'توضیحات نمونه: این متن جای توضیح واقعی محصول است و پس از دریافت اطلاعات از جومه جایگزین می‌شود. جنس پارچه، دوخت و نگهداری در این بخش نوشته می‌شود. (نمونه)';

export type SampleOverlay = { status: 'default' | 'sale' | 'new'; badgePercent: number | null };
/** Every 4th product is shown as a sale (20 % — the R-1 badge value), every 5th as «جدید». Demo only. */
export const sampleStatus = (i: number): SampleOverlay =>
  i % 4 === 1 ? { status: 'sale', badgePercent: 20 } : i % 5 === 2 ? { status: 'new', badgePercent: null } : { status: 'default', badgePercent: null };

/** Returns a copy of the catalogue with placeholder price/sizes/colours/stock/description filled in where the owner has not sent data. */
export function withSamplePlaceholders(catalog: CatalogProduct[]): CatalogProduct[] {
  return catalog.map((p, i) => {
    const price = p.price ?? SAMPLE_PRICES[i % SAMPLE_PRICES.length];
    const sale = sampleStatus(i).status === 'sale';
    return { ...p,
      price, salePrice: p.salePrice ?? (sale ? Math.round((price * 0.8) / 10_000) * 10_000 : null),
      sizes: p.sizes.length ? p.sizes : SAMPLE_SIZES,
      colours: p.colours.length ? p.colours : SAMPLE_COLOURS.slice(0, 1 + (i % 3)),
      stock: p.stock ?? 1,
      description: p.description ?? SAMPLE_DESCRIPTION };
  });
}
/** XXL is drawn disabled in Figma → sample "unavailable" size. Not a stock policy. */
export const sampleSizeAvailable = (size: string) => size !== 'XXL';

/** Placeholder reviews — texts copied from the Figma reviews frame 266:71769, all marked «(نمونه)». */
export const SAMPLE_REVIEWS = [
  { id: 'sample-1', name: 'سارا م. (نمونه)', rating: 5, meta: '۲ هفته پیش · سایز M (نمونه)', body: 'متن نمونهٔ نظر کاربر دربارهٔ کیفیت پارچه و دوخت. (نمونه)', sample: true },
  { id: 'sample-2', name: 'نگار ر. (نمونه)', rating: 4, meta: '۱ ماه پیش · سایز L (نمونه)', body: 'متن نمونهٔ نظر کاربر دربارهٔ اندازه و راحتی. (نمونه)', sample: true },
  { id: 'sample-3', name: 'مریم ک. (نمونه)', rating: 5, meta: '۲ ماه پیش · سایز S (نمونه)', body: 'متن نمونهٔ نظر کاربر دربارهٔ رنگ و ارسال. (نمونه)', sample: true },
];
/** Figma shows «۴٫۲ از ۵ · ۱۲۸ نظر» — a sample aggregate, shown only while placeholders are on. */
export const SAMPLE_RATING = { average: 4.2, count: 128 };
