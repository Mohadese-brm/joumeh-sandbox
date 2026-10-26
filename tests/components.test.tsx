import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { axe } from 'jest-axe';
import { ProductCard } from '../src/components/ProductCard';
import { Pagination } from '../src/components/Pagination';
import { Stub } from '../src/components/Stub';
import { flags } from '../src/config/flags';
import { StoreProvider } from '../src/lib/store';
import { Shop } from '../src/pages/Shop';
import { AuthModal } from '../src/components/AuthModal';
import { useStore } from '../src/lib/store';
import { useEffect } from 'react';

const sale = { id: 1, slug: 'women-1', name: 'مانتو کتان کویری', status: 'sale' as const, price: 1480000, originalPrice: 1850000, badgePercent: 20, imageUrl: '/x.webp', imageAlt: 'alt', category: 'women' };
const rtl = (ui: React.ReactElement, path = '/') => render(<div lang="fa" dir="rtl"><MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter></div>);

describe('flags (decision log)', () => {
  it('defaults match CEO/Emma decisions', () => { expect(flags).toEqual({ showDiscountBadge: true, filterMode: 'off', heroMode: 'static', priceSize: '17px' }); }); // heroMode → 'static': design-batch-2026-10-26 item 1 (CEO)
});

describe('ProductCard', () => {
  it('sale: struck original + teal sale price + badge from data (20%)', () => {
    const { container } = rtl(<ProductCard product={sale} />);
    expect(container.querySelector('s')).toHaveTextContent('۱٬۸۵۰٬۰۰۰'); expect(container.querySelector('.pc__now--sale')).toHaveTextContent('۱٬۴۸۰٬۰۰۰ تومان');
    expect(screen.getByText('۲۰٪ تخفیف')).toBeInTheDocument();
  });
  it('badge hidden when showBadge=false; new badge uses new style', () => {
    const { container, rerender } = rtl(<ProductCard product={sale} showBadge={false} />); expect(container.querySelector('.pc__badge')).toBeNull();
    rerender(<div lang="fa" dir="rtl"><MemoryRouter><ProductCard product={{ ...sale, status: 'new', originalPrice: null, badgePercent: null }} /></MemoryRouter></div>);
    expect(screen.getByText('جدید')).toHaveClass('pc__badge--new');
  });
  it('add-to-cart is a button outside the link; no favourite on cards (fix1 item 2)', () => {
    const add = vi.fn();
    rtl(<ProductCard product={sale} onAddToCart={add} />);
    const b = screen.getByRole('button', { name: /سبد خرید/ }); expect(b.closest('a')).toBeNull(); fireEvent.click(b); expect(add).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('button', { name: /علاقه‌مندی/ })).toBeNull(); expect(document.querySelector('.pc__fav')).toBeNull();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/product/women-1');
  });
  it('image dimensions desktop/mobile', () => {
    const { container, rerender } = rtl(<ProductCard product={sale} />); expect(container.querySelector('img')).toHaveAttribute('width', '378'); // design-batch-2026-10-26: Shop 56:282 card 378×504, fluid
    rerender(<div><MemoryRouter><ProductCard product={sale} size="mobile" /></MemoryRouter></div>); expect(container.querySelector('img')).toHaveAttribute('height', '228');
  });
  it('has no axe violations', async () => { const { container } = rtl(<ProductCard product={sale} headingLevel={2} />); expect(await axe(container)).toHaveNoViolations(); });
});

describe('Pagination (approved direction, never mirrored)', () => {
  it('DOM order: previous(>) first = rightmost in RTL, pages ascending, next(<) last', () => {
    const on = vi.fn(); rtl(<Pagination page={1} totalPages={3} onPage={on} />);
    const btns = within(screen.getByRole('navigation')).getAllByRole('button');
    expect(btns[0]).toHaveAccessibleName('صفحه‌ی قبل'); expect(btns[0]).toBeDisabled();
    expect(btns.slice(1, 4).map(b => b.textContent)).toEqual(['۱', '۲', '۳']);
    expect(btns[4]).toHaveAccessibleName('صفحه‌ی بعد'); fireEvent.click(btns[4]); expect(on).toHaveBeenCalledWith(2);
    expect(btns[1]).toHaveAttribute('aria-current', 'page');
  });
  it('last page disables next; hidden for one page', () => {
    const { container, rerender } = rtl(<Pagination page={3} totalPages={3} onPage={() => {}} />);
    expect(screen.getByRole('button', { name: 'صفحه‌ی بعد' })).toBeDisabled();
    rerender(<MemoryRouter><Pagination page={1} totalPages={1} onPage={() => {}} /></MemoryRouter>); expect(container.querySelector('nav')).toBeNull();
  });
  it('axe clean', async () => { const { container } = rtl(<Pagination page={2} totalPages={5} onPage={() => {}} />); expect(await axe(container)).toHaveNoViolations(); });
});

describe('Stub', () => { it('labels BD code and pending text', () => { rtl(<Stub code="BD-06">x</Stub>); expect(screen.getByText(/در انتظار تصمیم کسب‌وکار \(BD-06\)/)).toBeInTheDocument(); }); });

// ---- Components with API: mock fetch ----
type Handler = (url: string, init?: RequestInit) => unknown;
let handler: Handler;
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const body = handler(url, init) as { status?: number; json: unknown } | undefined;
    const status = body?.status ?? 200;
    return { ok: status < 400, status, json: async () => body?.json ?? {} } as Response;
  }));
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => vi.unstubAllGlobals());
const Loc = () => { const l = useLocation(); return <output data-testid="loc">{l.pathname + l.search}</output>; };

describe('Shop: no filter UI, designed sort (fix1 items 3–4)', () => {
  it('renders no filter controls', async () => {
    handler = url => url.startsWith('/api/products?') ? { json: { data: [sale], total: 9, totalPages: 1, page: 1 } } : { status: 404, json: { error: 'not_found' } };
    rtl(<StoreProvider><Routes><Route path="/women" element={<><Shop category="women" /><Loc /></>} /></Routes></StoreProvider>, '/women');
    await screen.findByText('مانتو کتان کویری');
    expect(screen.queryByRole('button', { name: /فیلتر/ })).toBeNull(); expect(document.querySelector('.filters, .shop__panel')).toBeNull();
    expect(document.querySelector('[data-figma^="268:53379"]')).not.toBeNull();
  });
  it('sort change updates URL and resets page', async () => {
    handler = url => url.startsWith('/api/products?') ? { json: { data: [sale], total: 20, totalPages: 3, page: 2 } } : { json: { data: { sizes: [], colors: [] } } };
    rtl(<StoreProvider><Routes><Route path="/women" element={<><Shop category="women" /><Loc /></>} /></Routes></StoreProvider>, '/women?page=2');
    await screen.findByText('مانتو کتان کویری');
    fireEvent.click(document.getElementById('sort')!);
    expect(screen.getByRole('option', { name: /جدیدترین/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('option', { name: 'ارزان‌ترین' }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/women?sort=price-asc'));
  });
});

describe('AuthModal (mock OTP)', () => {
  const Opener = () => { const { openAuth, user } = useStore(); useEffect(() => openAuth(), [openAuth]); return <p>{user ? `user:${user.phone}` : 'guest'}</p>; };
  it('phone → code → signed in; shows labelled mock-SMS code; e-mail tab is a BD-21 stub', async () => {
    handler = (url, init) => {
      if (url === '/api/auth/otp/request') return { status: 201, json: { data: { phone: '09123456789', devCode: '123456' } } };
      if (url === '/api/auth/otp/verify') return JSON.parse(String(init?.body)).code === '123456' ? { json: { data: { token: 't', user: { id: 1, phone: '09123456789' } } } } : { status: 400, json: { error: 'wrong_code' } };
      if (url === '/api/favorites') return { json: { data: [] } };
      return { status: 401, json: {} };
    };
    const { container } = rtl(<StoreProvider><Opener /><AuthModal /></StoreProvider>);
    const dlg = await screen.findByRole('dialog', { name: 'ورود' });
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(within(dlg).getByRole('tab', { name: 'استفاده از ایمیل' })); expect(within(dlg).getByText(/BD-21/)).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('button', { name: 'ثبت‌نام کنید' }));
    const su = screen.getByRole('dialog', { name: 'عضویت' }); expect(within(su).getByLabelText('نام *')).toBeInTheDocument(); expect(within(su).getByLabelText('نام خانوادگی *')).toBeInTheDocument();
    expect(screen.queryByText(/حساب دارید/)).toBeNull();
    fireEvent.click(within(su).getByRole('tab', { name: 'استفاده از ایمیل' })); expect(within(su).getByLabelText('ایمیل')).toBeInTheDocument(); expect(within(su).queryByText(/ورود با ایمیل آزمایشی/)).toBeNull(); // R3-1
    fireEvent.click(within(su).getByRole('tab', { name: 'استفاده از موبایل' }));
    fireEvent.click(within(su).getByRole('button', { name: 'ادامه' })); expect(await within(su).findByText('نام را وارد کنید')).toBeInTheDocument();
    expect(within(su).getByLabelText('نام *')).toHaveAttribute('aria-invalid', 'true');
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(within(su).getByRole('button', { name: 'ورود' })); expect(screen.getByRole('dialog', { name: 'ورود' })).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('tab', { name: 'استفاده از موبایل' }));
    fireEvent.change(within(dlg).getByLabelText('شماره موبایل'), { target: { value: '09123456789' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'ادامه' }));
    expect(await screen.findByTestId('dev-otp')).toHaveTextContent('BD-13');
    expect(screen.getByRole('dialog', { name: 'کد تأیید' })).toBeInTheDocument();
    expect(screen.getByText(/ارسال مجدد کد تا/)).toBeInTheDocument();
    const first = screen.getByLabelText('رقم ۱ کد تأیید'); expect(document.activeElement).toBe(first); // 107:941 first box focused
    fireEvent.change(first, { target: { value: '000000' } }); // paste fills all 6 digits
    expect(screen.getByLabelText('رقم ۶ کد تأیید')).toHaveValue('۰');
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'تأیید و ورود' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('کد وارد شده نادرست است');
    fireEvent.change(first, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'تأیید و ورود' }));
    expect(await screen.findByText('ورود موفق')).toBeInTheDocument();
    expect(await screen.findByText('user:09123456789', {}, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 3000 });
    expect(localStorage.getItem('joumeh.token')).toBe('t');
  });
  it('Escape closes the dialog', async () => {
    handler = () => ({ status: 401, json: {} });
    rtl(<StoreProvider><Opener /><AuthModal /></StoreProvider>);
    await screen.findByRole('dialog'); fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

// design-batch-2026-10-26 item 9 — hover swap with graceful fallback
describe('ProductCard second image', () => {
  const base = { id: 1, slug: 'x', name: 'X', status: 'default' as const, price: 1000, imageUrl: '/a.webp', imageThumb: '/a-t.webp', imageAlt: 'x' };
  it('renders a second image only when it differs', () => {
    const { container, rerender } = rtl(<ProductCard product={{ ...base, imageThumb2: '/b-t.webp' }} />);
    expect(container.querySelectorAll('img')).toHaveLength(2); expect(container.querySelector('.pc--swap')).not.toBeNull();
    rerender(<div><MemoryRouter><ProductCard product={{ ...base, imageThumb2: '/a-t.webp' }} /></MemoryRouter></div>);
    expect(container.querySelectorAll('img')).toHaveLength(1); expect(container.querySelector('.pc--swap')).toBeNull();
    rerender(<div><MemoryRouter><ProductCard product={{ ...base, imageThumb2: null }} /></MemoryRouter></div>);
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });
});
