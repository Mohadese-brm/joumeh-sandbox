import { describe, it, expect } from 'vitest';
import { formatPrice, formatBadge, faNumber } from '../src/lib/format';
describe('format (unit)', () => {
  it('uses Persian digits and separators', () => { expect(faNumber(1480000)).toBe('۱٬۴۸۰٬۰۰۰'); });
  it('formats price with تومان', () => { expect(formatPrice(1480000)).toBe('۱٬۴۸۰٬۰۰۰ تومان'); });
  it('formats badge from data', () => { expect(formatBadge(20)).toBe('۲۰٪ تخفیف'); expect(formatBadge(16)).toBe('۱۶٪ تخفیف'); });
});
