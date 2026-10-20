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
  it('defaults match CEO/Emma decisions', () => { expect(flags).toEqual({ showDiscountBadge: true, filterMode: 'apply', heroMode: 'carousel', priceSize: '17px' }); });
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
  it('add-to-cart and favourite are buttons outside the link; favourite exposes aria-pressed', () => {
    const add = vi.fn(), fav = vi.fn();
    rtl(<ProductCard product={sale} onAddToCart={add} onToggleFavorite={fav} favorite />);
    const b = screen.getByRole('button', { name: /سبد خرید/ }); expect(b.closest('a')).toBeNull(); fireEvent.click(b); expect(add).toHaveBeenCalledWith(1);
    const f = screen.getByRole('button', { name: /علاقه‌مندی/ }); expect(f).toHaveAttribute('aria-pressed', 'true'); fireEvent.click(f); expect(fav).toHaveBeenCalledWith(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/product/women-1');
  });
  it('image dimensions desktop/mobile', () => {
    const { container, rerender } = rtl(<ProductCard product={sale} />); expect(container.querySelector('img')).toHaveAttribute('width', '282');
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

describe('Shop filters: select-then-Apply (R-2 decided)', () => {
  it('selections stay pending until Apply; Apply updates URL + request; reset clears', async () => {
    const calls: string[] = [];
    handler = url => {
      if (url.startsWith('/api/products?')) { calls.push(url); return { json: { data: [sale], total: 1, totalPages: 1, page: 1 } }; }
      if (url.startsWith('/api/filters')) return { json: { data: { sizes: ['S', 'M'], colors: [{ name: 'مشکی', hex: '#000' }] } } };
      return { status: 404, json: { error: 'not_found' } };
    };
    rtl(<StoreProvider><Routes><Route path="/women" element={<><Shop category="women" /><Loc /></>} /></Routes></StoreProvider>, '/women');
    await screen.findByText('مانتو کتان کویری');
    fireEvent.click(screen.getByRole('button', { name: /فیلترها/ }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'M' }));
    const before = calls.length;
    await new Promise(r => setTimeout(r, 50));
    expect(calls.length).toBe(before); expect(screen.getByTestId('loc').textContent).toBe('/women'); // pending, not applied
    fireEvent.click(screen.getByRole('button', { name: 'اعمال فیلتر' }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/women?size=M'));
    await waitFor(() => expect(calls.at(-1)).toContain('size=M'));
    fireEvent.click(screen.getByRole('button', { name: /فیلترها/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'پاک کردن همه' }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/women'));
  });
  it('sort change updates URL and resets page', async () => {
    handler = url => url.startsWith('/api/products?') ? { json: { data: [sale], total: 20, totalPages: 3, page: 2 } } : { json: { data: { sizes: [], colors: [] } } };
    rtl(<StoreProvider><Routes><Route path="/women" element={<><Shop category="women" /><Loc /></>} /></Routes></StoreProvider>, '/women?page=2');
    await screen.findByText('مانتو کتان کویری');
    fireEvent.change(screen.getByLabelText('مرتب‌سازی'), { target: { value: 'price-asc' } });
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/women?sort=price-asc'));
  });
});

describe('AuthModal (mock OTP)', () => {
  const Opener = () => { const { openAuth, user } = useStore(); useEffect(() => openAuth(), [openAuth]); return <p>{user ? `user:${user.phone}` : 'guest'}</p>; };
  it('phone → code → signed in; shows labelled mock-SMS code; e-mail tab is a BD-21 stub', async () => {
    handler = (url, init) => {
      if (url === '/api/auth/otp/request') return { status: 201, json: { data: { phone: '09123456789', devCode: '12345' } } };
      if (url === '/api/auth/otp/verify') return JSON.parse(String(init?.body)).code === '12345' ? { json: { data: { token: 't', user: { id: 1, phone: '09123456789' } } } } : { status: 400, json: { error: 'wrong_code' } };
      if (url === '/api/favorites') return { json: { data: [] } };
      return { status: 401, json: {} };
    };
    const { container } = rtl(<StoreProvider><Opener /><AuthModal /></StoreProvider>);
    const dlg = await screen.findByRole('dialog', { name: 'ورود' });
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(within(dlg).getByRole('tab', { name: 'استفاده از ایمیل' })); expect(within(dlg).getByText(/BD-21/)).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole('tab', { name: 'استفاده از موبایل' }));
    fireEvent.change(within(dlg).getByLabelText('شماره موبایل'), { target: { value: '09123456789' } });
    fireEvent.click(within(dlg).getByRole('button', { name: 'ادامه' }));
    expect(await screen.findByTestId('dev-otp')).toHaveTextContent('BD-13');
    fireEvent.change(screen.getByLabelText('کد تأیید'), { target: { value: '00000' } });
    fireEvent.click(screen.getByRole('button', { name: 'ورود' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('کد واردشده درست نیست');
    fireEvent.change(screen.getByLabelText('کد تأیید'), { target: { value: '12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'ورود' }));
    expect(await screen.findByText('user:09123456789')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull(); expect(localStorage.getItem('joumeh.token')).toBe('t');
  });
  it('Escape closes the dialog', async () => {
    handler = () => ({ status: 401, json: {} });
    rtl(<StoreProvider><Opener /><AuthModal /></StoreProvider>);
    await screen.findByRole('dialog'); fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
