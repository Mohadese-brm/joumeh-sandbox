// Round-1 design fixes (Emma's review 2026-10-21): component-level checks + axe.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { PaymentInfo, SupportFaq, SupportContact } from '../src/pages/account/Pages';
import { NotFound } from '../src/pages/NotFound';
import { SizeGuide } from '../src/components/SizeGuide';
const rtl = (ui: React.ReactElement) => render(<div lang="fa" dir="rtl"><MemoryRouter>{ui}</MemoryRouter></div>);

describe('round 1', () => {
  it('M3 payment-info designed empty state (125:4203), static', async () => {
    const { container } = rtl(<PaymentInfo />);
    expect(screen.getByRole('heading', { name: 'کارت بانکی ذخیره نشده است' })).toBeInTheDocument();
    expect(screen.getByText('پرداخت امن از طریق درگاه بانکی')).toBeInTheDocument(); expect(container.querySelector('form, input')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('m4 404 per 260:66609', () => {
    rtl(<NotFound />); expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('۴۰۴');
    expect(screen.getByText('صفحه‌ای که دنبالش هستید پیدا نشد.')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'بازگشت به صفحهٔ اصلی' })).toHaveAttribute('href', '/');
  });
  it('P8 size guide: designed layout, values are BD-18 dashes (no invented numbers)', async () => {
    const { container } = rtl(<SizeGuide name="مانتو کتان کویری" type="مانتو" sizes={['S', 'M']} />);
    expect(screen.getByRole('table')).toBeInTheDocument(); expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(container.querySelector('tbody')!.textContent).not.toMatch(/[0-9۰-۹]/); expect(screen.getByText(/BD-18/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
  it('P6 FAQ accordion (246:15454) + contact (246:15613); ticket form not built', async () => {
    const { container } = rtl(<SupportFaq />);
    const q1 = screen.getByRole('button', { name: /پرسش نمونه ۱/ }), q2 = screen.getByRole('button', { name: /پرسش نمونه ۲/ });
    expect(q1).toHaveAttribute('aria-expanded', 'true'); fireEvent.click(q2); expect(q2).toHaveAttribute('aria-expanded', 'true'); expect(q1).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'ثبت درخواست پشتیبانی' })).toHaveAttribute('aria-disabled', 'true');
    expect(await axe(container)).toHaveNoViolations();
    rtl(<SupportContact />); expect(screen.getAllByText(/در انتظار تصمیم کسب‌وکار/).length).toBe(4);
  });
});
