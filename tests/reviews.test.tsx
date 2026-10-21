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

describe('ProductReviews persistence via the local API (fix2)', () => {
  it('a submitted review appears in the list and updates count + average', async () => {
    const { MemoryRouter } = await import('react-router-dom'); const { StoreProvider } = await import('../src/lib/store'); const { ProductReviews } = await import('../src/components/Reviews');
    let store = { reviews: [{ id: 1, name: 'سارا م.', rating: 4, body: 'قبلی', createdAt: '2026-10-20 10:00:00' }], count: 1, average: 4 };
    localStorage.setItem('joumeh.token', 't');
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const ok = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => ({ data }) });
      if (url.endsWith('/reviews') && init?.method === 'POST') { const b = JSON.parse(String(init.body));
        store = { reviews: [{ id: 2, name: 'نگار ر.', rating: b.rating, body: b.text, createdAt: '2026-10-21 10:00:00' }, ...store.reviews], count: 2, average: (4 + b.rating) / 2 }; return ok(store, 201); }
      if (url.endsWith('/reviews')) return ok(store);
      if (url.endsWith('/me')) return ok({ id: 1, phone: '09120000000', firstName: 'نگار', lastName: 'رضایی', email: null, emailVerified: 0 });
      if (url.includes('/favorites')) return ok([]);
      return ok(null);
    }));
    render(<MemoryRouter><StoreProvider><ProductReviews slug="women-1" /></StoreProvider></MemoryRouter>);
    expect(await screen.findByText('قبلی')).toBeInTheDocument(); expect(screen.getByText(/بر اساس ۱ نظر/)).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('.revs__add')).not.toBeNull());
    await new Promise(r => setTimeout(r, 50));
    fireEvent.click(screen.getByRole('button', { name: 'ثبت نظر' }));
    const dlg = await screen.findByRole('dialog', { name: 'ثبت نظر' });
    fireEvent.click(screen.getByLabelText('۵ از ۵')); fireEvent.change(screen.getByLabelText('متن نظر'), { target: { value: 'جدید و عالی' } });
    fireEvent.click(dlg.querySelector('button[type=submit]')!);
    expect(await screen.findByText('نظر شما ثبت شد')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.revf__full')!);
    expect(await screen.findByText('جدید و عالی')).toBeInTheDocument(); expect(screen.getByText(/بر اساس ۲ نظر/)).toBeInTheDocument(); expect(screen.getByText('۴٫۵')).toBeInTheDocument();
    vi.unstubAllGlobals(); localStorage.clear();
  });
});
