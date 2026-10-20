import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useStore } from '../lib/store';
import { api, type Product } from '../lib/api';
import { faNumber, formatPrice } from '../lib/format';
import { AuthModal } from './AuthModal';
import { Toasts } from './Toasts';
import './Layout.css';

const LOGO = <img src="/img/logo-joumeh@1x.webp" srcSet="/img/logo-joumeh@1x.webp 1x, /img/logo-joumeh@2x.webp 2x" width={48} height={48} alt="" />;

function SearchBox({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState(''); const [res, setRes] = useState<Product[] | null>(null); const [err, setErr] = useState(false);
  const ref = useRef<HTMLInputElement>(null); const nav = useNavigate();
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const t = setTimeout(() => api<Product[]>(`/search?q=${encodeURIComponent(q.trim())}`).then(r => { setRes(r.data); setErr(false); }).catch(() => setErr(true)), 200);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="search" role="search" onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className="search__box">
        <Icon name="search-1" size={20} />
        <label htmlFor="q" className="sr-only">جستجو</label>
        <input id="q" ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="جستجو در جومه" autoComplete="off" aria-controls="search-results" />
        <button type="button" className="icon-btn" onClick={onClose} aria-label="بستن جستجو"><Icon name="close" size={20} /></button>
      </div>
      {(res || err) && (
        <div className="search__panel" id="search-results" aria-live="polite">
          {err ? <p className="small">جستجو انجام نشد. <button className="link" onClick={() => setQ(q + ' ')}>تلاش دوباره</button></p>
            : res!.length === 0 ? <p className="small">نتیجه‌ای برای «{q.trim()}» پیدا نشد.</p>
            : <>
              <p className="caption muted">{faNumber(res!.length)} نتیجه برای «{q.trim()}»</p>
              <ul>{res!.map(p => <li key={p.id}><button type="button" className="search__item" onClick={() => { onClose(); nav(`/product/${p.slug}`); }}>
                <img src={p.imageUrl} alt="" width={36} height={48} />
                <span><span className="search__name">{p.name}</span>
                  <span className="search__price">{p.originalPrice && p.status === 'sale' && <s className="caption muted">{faNumber(p.originalPrice)}</s>} <span className={p.status === 'sale' ? 'pc__now--sale' : ''}>{formatPrice(p.price)}</span></span></span>
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
            <span className="burger" aria-hidden="true"><i /><i /><i /></span>
          </button>
          <ul className="hdr__links">
            <li><NavLink to="/women">زنانه</NavLink></li><li><NavLink to="/men">مردانه</NavLink></li><li><Link to="/#story">قصه‌ی ما</Link></li>
          </ul>
        </nav>
        <Link to="/" className="hdr__logo" aria-label="جومه — صفحه‌ی اصلی">{LOGO}</Link>
        <div className="hdr__actions">
          {search ? <SearchBox onClose={() => setSearch(false)} /> : <button type="button" className="icon-btn" onClick={() => setSearch(true)} aria-label="جستجو"><Icon name="search-1" /></button>}
          <Link to="/cart" className="icon-btn" aria-label={`سبد خرید، ${faNumber(count)} کالا`}><Icon name="bag-1" />{count > 0 && <span className="count-dot" aria-hidden="true">{faNumber(count)}</span>}</Link>
          <button type="button" className="icon-btn hdr__profile" onClick={account} aria-label={user ? 'حساب کاربری من' : 'ورود یا ثبت‌نام'}><Icon name="profile-1" />{user && <span className="hdr__dot" aria-hidden="true" />}</button>
        </div>
      </div>
      {menu && <div id="mmenu" className="mmenu"><ul className="wrap">
        <li><NavLink to="/women">زنانه</NavLink></li><li><NavLink to="/men">مردانه</NavLink></li><li><Link to="/#story">قصه‌ی ما</Link></li></ul></div>}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap ftr__in">
        <div className="ftr__brand"><span className="ftr__logo">{LOGO}</span><p className="small">پوشاک دست‌ساز جومه؛ الهام‌گرفته از رنگ و نور کویر ایران.</p></div>
        <nav aria-labelledby="f1"><h2 id="f1">فروشگاه</h2><ul><li><Link to="/women">زنانه</Link></li><li><Link to="/men">مردانه</Link></li><li><Link to="/women?sale=1">حراج</Link></li></ul></nav>
        <nav aria-labelledby="f2"><h2 id="f2">راهنمای خرید</h2><ul>
          {/* Policy pages are BD stubs (BD-02/04/18) and not designed → placeholder route */}
          <li><Link to="/info/shipping">ارسال و تحویل</Link></li><li><Link to="/info/returns">بازگشت کالا</Link></li><li><Link to="/info/size-guide">راهنمای سایز</Link></li><li><Link to="/info/faq">پرسش‌های متداول</Link></li></ul></nav>
        <nav aria-labelledby="f3"><h2 id="f3">جومه</h2><ul><li><Link to="/#story">قصه‌ی ما</Link></li><li><Link to="/info/contact">تماس با ما</Link></li><li><Link to="/info/careers">همکاری</Link></li><li><Link to="/info/blog">وبلاگ</Link></li></ul></nav>
      </div>
      <div className="wrap"><p className="ftr__copy caption">© ۱۴۰۵ جومه — تمامی حقوق محفوظ است. <span className="ftr__sample">نسخه‌ی محلی با داده نمونه</span></p></div>
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
  const loc = useLocation();
  useEffect(() => {
    if (loc.hash) { document.getElementById(loc.hash.slice(1))?.scrollIntoView(); return; }
    window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash]);
  return (<>
    <a href="#main" className="skip">رفتن به محتوای اصلی</a>
    <Header />
    <main id="main" tabIndex={-1}><Outlet /></main>
    <Footer />
    <BottomNav />
    <AuthModal />
    <Toasts />
  </>);
}
