// Business-decision stubs. Each is UNKNOWN until the CEO decides (ux-architecture/F-Business-Decisions.md).
// BD-xx STUB — awaiting business decision (owner: CEO). Do not ship as policy.
export const PENDING = 'در انتظار تصمیم کسب‌وکار';
export const BD = {
  'BD-01': 'payment provider (Shaparak PSP) — MockProvider only',
  'BD-02': 'shipping methods / fees / zones / free-shipping threshold',
  'BD-03': 'delivery-time promise',
  'BD-04': 'return / exchange / refund policy',
  'BD-05': 'cancellation policy',
  'BD-06': 'VAT display',
  'BD-07': 'guest checkout model',
  'BD-08': 'reservation TTL & oversell',
  'BD-10': 'single price source (sample conflict)',
  'BD-11': 'order number format',
  'BD-13': 'SMS provider & templates — console adapter only',
  'BD-15': 'reviews & ratings',
  'BD-16': 'stock messaging',
  'BD-17': 'discount code rules',
  'BD-18': 'taxonomy & size charts',
  'BD-21': 'e-mail OTP',
  'BD-23': 'delivered-status source',
  'BD-24': 'pickup / COD',
} as const;
export type BdCode = keyof typeof BD;
export const stub = (code: BdCode) => ({ code, status: 'STUB', label: PENDING, note: BD[code] });
// BD-02 STUB: the shipping options shown in Figma 58:790 are design samples (they contradict each other). Fee = null (undecided).
export const SAMPLE_SHIPPING_METHODS = [
  { id: 'sample-post', label: 'پست پیشتاز — ۳ تا ۵ روز کاری', fee: null },
  { id: 'sample-tipax', label: 'تیپاکس — ۲ تا ۳ روز کاری', fee: null },
  { id: 'sample-courier', label: 'پیک موتوری (فقط یزد) — همان روز', fee: null },
];
