import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReviewsSection, ReviewForm } from '../src/components/Reviews';

const sample = [1, 2, 3].map(i => ({ id: String(i), name: `کاربر ${i} (نمونه)`, rating: 5 - i + 1, meta: 'نمونه', body: 'متن نمونه' }));
describe('Reviews (fix1 item 5, 266:71080 / 266:71357)', () => {
  it('list renders cards + summary when reviews exist', () => {
    render(<ReviewsSection state={{ kind: 'ready', reviews: sample, average: 4.2, count: 3 }} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3); expect(screen.getByText('کاربر 1 (نمونه)')).toBeInTheDocument();
    expect(document.querySelector('[data-figma="266:70942"]')).not.toBeNull();
  });
  it('empty / loading / error states', () => {
    const { rerender } = render(<ReviewsSection />); expect(screen.getByText('هنوز نظری برای این محصول ثبت نشده است.')).toBeInTheDocument();
    rerender(<ReviewsSection state={{ kind: 'loading' }} />); expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    const retry = vi.fn(); rerender(<ReviewsSection state={{ kind: 'error', onRetry: retry }} />); fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' })); expect(retry).toHaveBeenCalled();
  });
  it('submit: validation, then submitting → success', async () => {
    render(<ReviewsSection />); fireEvent.click(screen.getByRole('button', { name: 'ثبت نظر' }));
    const dlg = screen.getByRole('dialog', { name: 'ثبت نظر' });
    fireEvent.click(dlg.querySelector('button[type=submit]')!); expect(screen.getByText('لطفاً امتیاز و متن نظر را وارد کنید.')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('۴ از ۵')); fireEvent.change(screen.getByLabelText('متن نظر'), { target: { value: 'خوب بود' } });
    fireEvent.click(dlg.querySelector('button[type=submit]')!);
    expect(await screen.findByText('نظر شما ثبت شد', {}, { timeout: 2000 })).toBeInTheDocument();
  });
  it('failure state offers retry', async () => {
    render(<ReviewForm onClose={() => {}} submit={async () => 'fail'} />);
    fireEvent.click(screen.getByLabelText('۵ از ۵')); fireEvent.change(screen.getByLabelText('متن نظر'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'ثبت نظر' }));
    await waitFor(() => expect(screen.getByText('ثبت نظر انجام نشد. دوباره تلاش کنید.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'تلاش دوباره' })).toBeInTheDocument();
  });
});
