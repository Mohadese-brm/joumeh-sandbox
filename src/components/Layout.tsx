import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { SupportChat } from './SupportChat';
import { Icon } from './Icon';
import { useStore } from '../lib/store';
import { api, type Product } from '../lib/api';
import { faNumber, formatPrice } from '../lib/format';
import { AuthModal } from './AuthModal';
import { useSiteMode, SAMPLE_ORDERS_BLOCKED } from '../lib/siteMode';
import { Toasts } from './Toasts';
import './Layout.css';

const LOGO = <img src="/img/logo-joumeh@1x.webp" srcSet="/img/logo-joumeh@1x.webp 1x, /img/logo-joumeh@2x.webp 2x" width={48} height={48} alt="" />;

function SearchBox({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState(''); const [res, setRes] = useState<Product[] | null>(null); const [err, setErr] = useState(false); const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null); const nav = useNavigate();
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); setLoading(false); return; }
    let live = true; setLoading(true); // design-batch item 12: loading state while the query runs
    const t = setTimeout(() => api<Product[]>(`/search?q=${encodeURIComponent(q.trim())}`).then(r => { if (live) { setRes(r.data); setErr(false); } }).catch(() => live && setErr(true)).finally(() => live && setLoading(false)), 200);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  return (
    <div className="search" data-figma="116:2267" role="search" onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="search__box">
        <Icon name="search-1" size={20} />
        <label htmlFor="q" className="sr-only">جستجو</label>
        <input id="q" ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="جست‌وجوی محصولات..." autoComplete="off" aria-controls="search-results" />
        <button type="button" className="search__close" onClick={onClose} aria-label="بستن جستجو"><Icon name="close" size={20} /></button>
      </div>
      {(res || err || loading) && (
        <div className="search__panel" id="search-results" aria-live="polite" aria-busy={loading}>
          {loading && !res && !err ? <p className="small search__loading" data-testid="search-loading"><span className="spinner" aria-hidden="true" />در حال جستجو…</p>
            : err ? <p className="small">جستجو انجام نشد. <button className="link" onClick={() => setQ(q + ' ')}>تلاش دوباره</button></p>
            : res!.length === 0 ? <p className="small">نتیجه‌ای برای «{q.trim()}» پیدا نشد.</p>
            : <>
              <p className="search__count">{faNumber(res!.length)} نتیجه برای «{q.trim()}»</p>
              <ul>{res!.slice(0, 3).map(p => <li key={p.id}><button type="button" className="search__item" data-figma="116:2627" onClick={() => { onClose(); nav(`/product/${p.slug}`); }}>
                <img className="search__thumb" src={p.imageUrl} alt="" width={48} height={48} />
                <span className="search__text"><span className="search__name">{p.name}</span>
                  <span className="search__price"><span className={p.status === 'sale' ? 'search__now search__now--sale' : 'search__now'}>{formatPrice(p.price)}</span>{p.originalPrice && p.status === 'sale' && <s className="search__old">{faNumber(p.originalPrice)}</s>}</span></span>
              </button></li>)}</ul>
            </>}
        </div>)}
    </div>
  );
}

export function Header() {
  const { cart, user, openAuth } = useStore(); const nav = useNavigate();
  const [search, setSearch] = useState(false); const [menu, setMenu] = useState(false);
  const loc = useLocation(); useEffect(() => { setSearch(false); setMenu(false); }, [loc.pathname]);
  const account = () => (user ? nav('/account') : openAuth(() => nav('/account')));
  const count = cart?.totals.count ?? 0;
  return (
    <header className="hdr">
      <div className="hdr__in wrap">
        <nav className="hdr__nav" aria-label="منوی اصلی">
          <button type="button" className="icon-btn hdr__menu" aria-expanded={menu} aria-controls="mmenu" onClick={() => setMenu(m => !m)} aria-label="منو">
            <Icon name="menu" />
          </button>
          <ul className="hdr__links">
            <li><NavLink to="/women">زنانه</NavLink></li><li><NavLink to="/men">مردانه</NavLink></li><li><NavLink to="/info/story">قصه‌ی ما</NavLink></li>
          </ul>
        </nav>
        <Link to="/" className="hdr__logo" aria-label="جومه — صفحه‌ی اصلی">{LOGO}</Link>
        <div className="hdr__actions">
          {/* fix2: the search icon stays in the header (mobile order bag · search · logo · menu, 54:342 / 116:2607); the field opens over it on desktop and in a panel below on mobile. */}
          <button type="button" className="icon-btn hdr__search" onClick={() => setSearch(s => !s)} aria-label="جستجو" aria-expanded={search}><Icon name="search-1" /></button>
          {search && <SearchBox onClose={() => setSearch(false)} />}
          <Link to="/cart" className="icon-btn" aria-label={`سبد خرید، ${faNumber(count)} کالا`}><Icon name="bag-1" />{count > 0 && <span className="count-dot" aria-hidden="true">{faNumber(count)}</span>}</Link>
          <button type="button" className="icon-btn hdr__profile" onClick={account} aria-label={user ? 'حساب کاربری من' : 'ورود یا ثبت‌نام'}><Icon name="profile-1" />{user && <span className="hdr__dot" aria-hidden="true" />}</button>
        </div>
      </div>
      {menu && <div id="mmenu" className="mmenu"><ul className="wrap">
        <li><NavLink to="/women"><span>زنانه</span></NavLink></li><li><NavLink to="/men"><span>مردانه</span></NavLink></li><li><NavLink to="/info/story"><span>قصه‌ی ما</span></NavLink></li></ul></div>}
    </header>
  );
}

export function Footer() {
  const mode = useSiteMode();
  return (
    <footer className="ftr">
      <div className="wrap ftr__in">
        <div className="ftr__brand"><span className="ftr__logo">{LOGO}</span><p className="small">پوشاک دست‌ساز جومه؛ الهام‌گرفته از رنگ و نور کویر ایران.</p></div>
        <nav aria-labelledby="f1"><h2 id="f1">فروشگاه</h2><ul><li><Link to="/women">زنانه</Link></li><li><Link to="/men">مردانه</Link></li><li><Link to="/women?sale=1">حراج</Link></li></ul></nav>
        <nav aria-labelledby="f2"><h2 id="f2">راهنمای خرید</h2><ul>
          {/* Policy pages are BD stubs (BD-02/04/18) and not designed → placeholder route */}
          <li><Link to="/info/shipping">ارسال و تحویل</Link></li><li><Link to="/info/returns">بازگشت کالا</Link></li><li><Link to="/info/size-guide">راهنمای سایز</Link></li><li><Link to="/support">پرسش‌های متداول</Link></li></ul></nav>
        <nav aria-labelledby="f3"><h2 id="f3">جومه</h2><ul><li><Link to="/info/story">قصه‌ی ما</Link></li><li><Link to="/support/contact">تماس با ما</Link></li><li><Link to="/info/careers">همکاری</Link></li><li><Link to="/info/blog">وبلاگ</Link></li></ul></nav>
      </div>
      {/* gerdoo-update-2026-10-28: the note only shows when the server really serves sample data (was unconditional → wrong on live Gerdoo). */}
      <div className="wrap"><p className="ftr__copy caption">© ۱۴۰۵ جومه — تمامی حقوق محفوظ است.{mode?.sampleData && <span className="ftr__sample">{mode.sampleOverlay ? 'قیمت‌ها، سایزها و نظرها نمونه‌اند (نمونه)' : 'نسخه‌ی محلی با داده نمونه'}</span>}</p></div>
    </footer>
  );
}

export function BottomNav() {
  const { cart, user, openAuth } = useStore(); const nav = useNavigate(); const count = cart?.totals.count ?? 0;
  return (
    <nav className="bnav" aria-label="ناوبری پایین">
      <NavLink to="/" end><Icon name="home-1" /><span>خانه</span></NavLink>
      <NavLink to="/women"><Icon name="category" /><span>دسته‌ها</span></NavLink>
      <NavLink to="/cart"><Icon name="bag-1" /><span>سبد{count > 0 ? ` (${faNumber(count)})` : ''}</span></NavLink>
      <button type="button" onClick={() => (user ? nav('/account') : openAuth(() => nav('/account')))}><Icon name="profile-1" /><span>پروفایل</span></button>
    </nav>
  );
}

export function Layout() {
  const loc = useLocation(); const mode = useSiteMode();
  useEffect(() => {
    if (loc.hash) { document.getElementById(loc.hash.slice(1))?.scrollIntoView(); return; }
    window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash]);
  return (<>
    <a href="#main" className="skip">رفتن به محتوای اصلی</a>
    {mode?.sampleOverlay && <p className="sample-bar" role="note" data-testid="sample-bar">{SAMPLE_ORDERS_BLOCKED}</p>}
    <Header />
    <main id="main" tabIndex={-1}><Outlet /></main>
    <Footer />
    <BottomNav />
    <AuthModal />
    <Toasts />
    <SupportChat />
  </>);
}
