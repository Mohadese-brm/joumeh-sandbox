import { describe, it, expect } from 'vitest';
import { faNumber, formatPrice, formatBadge, faDigits, formatPhone, formatDate } from '../src/lib/format';
describe('format (fa-IR)', () => {
  it('Persian grouped digits + تومان', () => { expect(formatPrice(1480000)).toBe('۱٬۴۸۰٬۰۰۰ تومان'); expect(faNumber(12)).toBe('۱۲'); });
  it('badge', () => expect(formatBadge(20)).toBe('۲۰٪ تخفیف'));
  it('digits without grouping, phone', () => { expect(faDigits('10124')).toBe('۱۰۱۲۴'); expect(formatPhone('09123456789')).toBe('۰۹۱۲ ۳۴۵ ۶۷۸۹'); });
  it('Jalali date: 2026-10-04 = ۱۲ مهر ۱۴۰۵ (matches Figma 126:4163)', () => expect(formatDate('2026-10-04 12:00:00')).toBe('۱۲ مهر ۱۴۰۵'));
});
