import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Summary } from '../src/pages/Cart';
import { flags } from '../src/config/flags';
import type { Cart } from '../src/lib/api';

const cart = { cartId: 1, items: [], totals: { count: 1, subtotal: 1190000, discount: 0, payable: 1190000, shipping: null, vat: null } } as Cart;

describe('cart summary', () => {
  it('shows the merchandise total only: no shipping row and no pending-decision copy', () => {
    const { container } = render(<div lang="fa" dir="rtl"><Summary cart={cart} /></div>);
    expect(screen.getByText('جمع کل (۱ کالا)')).toBeInTheDocument();
    expect(screen.getByText('مبلغ قابل پرداخت')).toBeInTheDocument();
    expect(screen.queryByText('ارسال')).toBeNull();
    expect(container.textContent).not.toMatch(/در انتظار تصمیم/);
    expect(flags.stockNotices).toBe(false);
    expect(flags.shippingRates).toEqual([]);
  });
  it('adds a shipping line only when a configured fee is passed', () => {
    render(<div lang="fa" dir="rtl"><Summary cart={cart} shippingFee={50000} /></div>);
    expect(screen.getByText('ارسال')).toBeInTheDocument();
  });
});
