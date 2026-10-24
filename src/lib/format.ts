const nf = new Intl.NumberFormat('fa-IR');
export const faNumber = (n: number) => nf.format(n);
/** Persian digits without grouping (phones, postal codes, order numbers). */
export const faDigits = (s: string | number) => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);
/** catalog-real: shown instead of a price while the owner has not set one (price null). */
export const PRICE_ON_REQUEST = 'قیمت به‌زودی / تماس بگیرید';
export const formatPrice = (n: number | null | undefined) => (n == null ? PRICE_ON_REQUEST : `${faNumber(n)} تومان`); // «تومان» per Figma 54:119
export const formatBadge = (percent: number) => `${faNumber(percent)}٪ تخفیف`;
const df = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' });
export const formatDate = (iso: string) => df.format(new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z')));
export const formatPhone = (p: string) => faDigits(p.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3'));
