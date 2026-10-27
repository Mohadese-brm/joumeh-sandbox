// Joumeh ADMIN. Figma: ADMIN — INTERACTIVE PROTOTYPE 304:82401 (desktop 252:63866). DEMO banner only when the API reports demo mode.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './admin.css';
import { aapi, AdminApiError, type Me, type Level } from './api';
import { Button, Field, Ico, Toasts, fa, useMobile } from './ui';
import { faNumber } from '../lib/format';
import { Dashboard } from './pages/Dashboard';
import { ProductsList, ProductEdit, Categories } from './pages/Products';
import { OrdersList, OrderDetail } from './pages/Orders';
import { CustomersList, CustomerProfile } from './pages/Customers';
import { Reviews } from './pages/Reviews';
import { Content, ContentPage } from './pages/Content';
import { Users, Audit } from './pages/Settings';
import { Inventory, InventoryHistory } from './pages/Inventory';

const MeCtx = createContext<Me | null>(null);
export const useMe = () => useContext(MeCtx)!;
export const can = (me: Me, mod: string, need: Level = 'view') => ({ none: 0, view: 1, edit: 2 })[me.permissions[mod] ?? 'none'] >= ({ none: 0, view: 1, edit: 2 })[need];

/** Demo mode flag (release-gerdoo-2026-10-27). Known from the API only: /demo-accounts answers 200 only when demo is on (404 otherwise),
 *  and /me carries `demo` once signed in. Unknown/failed → false, so the live shop never shows the banner by mistake. */
const DemoCtx = createContext<{ demo: boolean; setDemo: (d: boolean) => void }>({ demo: false, setDemo: () => {} });
/** Shown on admin screens ONLY when demo mode is on (Vercel preview / local JOUMEH_ADMIN_DEMO=1); hidden on the live shop. */
export const DemoBanner = () => useContext(DemoCtx).demo ? <div className="adm-demo" role="note">DEMO — data resets · نسخه نمایشی؛ داده‌ها نمونه‌اند و با هر راه‌اندازی مجدد پاک می‌شوند</div> : null;

type Nav = [to: string, label: string, ico: string, mod?: string] | [group: string];
const NAV: Nav[] = [
  ['', 'داشبورد', 'Home1', 'dashboard'], ['کاتالوگ'], ['products', 'محصولات', 'Bag2', 'products'], ['categories', 'دسته‌بندی‌ها', 'Category', 'products'], ['inventory', 'موجودی انبار', 'Folder2', 'products'],
  ['فروش و عملیات'], ['orders', 'سفارش‌ها', 'Buy2', 'orders'], ['#', 'ارسال و تحویل', 'Send1'], ['#', 'مرجوعی‌ها', 'RotateLeft'],
  ['مشتریان و پشتیبانی'], ['customers', 'مشتریان', 'Group1', 'customers'], ['reviews', 'نظرات', 'Message1', 'reviews'], ['#', 'پشتیبانی', 'Message1'],
  ['مالی و بازاریابی'], ['#', 'مالی و پرداخت‌ها', 'Wallet'], ['#', 'تخفیف‌ها', 'DiscountShape1'], ['content', 'محتوای سایت', 'Image', 'content'],
  ['تحلیل و سیستم'], ['#', 'گزارش‌ها', 'Graph'], ['settings', 'تنظیمات', 'Setting', 'settings'],
];

/** Sidebar content — desktop aside (260) and the mobile drawer (Figma «Sidebar drawer (mobile)» 177:16745, 300 wide) share it. */
function SideNav({ me, counts, onLogout, onNav }: { me: Me; counts: { openOrders: number }; onLogout: () => void; onNav?: () => void }) {
  return <>
    <div className="adm-brand"><div className="adm-logo">ج</div><div><b>جومه</b><small>پنل مدیریت</small></div></div>
    <nav className="adm-navs" aria-label="منوی مدیریت">
      {NAV.map((n, i) => n.length === 1 ? <div key={i} className="adm-group">{n[0]}</div>
        : n[0] === '#' ? <span key={i} className="adm-nav off" title="فاز ۲ — خارج از دامنه‌ی MVP"><Ico n={n[2]} />{n[1]}<span className="adm-badge neutral nodot" style={{ marginInlineStart: 'auto' }}>فاز ۲</span></span>
        : n[3] && !can(me, n[3]) ? null
        : <NavLink key={i} end={n[0] === ''} to={n[0] ? `/admin/${n[0]}` : '/admin'} onClick={onNav} className={({ isActive }) => `adm-nav${isActive ? ' on' : ''}`}><Ico n={n[2]} />{n[1]}
          {n[0] === 'orders' && counts.openOrders > 0 && <span className="cnt" aria-label={`${counts.openOrders} سفارش باز`}>{faNumber(counts.openOrders)}</span>}</NavLink>)}
    </nav>
    <div className="adm-me"><div className="adm-avatar"><img src="/admin-icons/Profile1.svg" alt="" /></div><div className="who"><b>{me.name}</b><small>{me.roleLabels.join('، ')}</small></div>
      <button className="adm-btn sm" onClick={onLogout} aria-label="خروج"><img src="/admin-icons/Logout.svg" alt="" /></button></div>
  </>;
}

function Shell({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const nav = useNavigate(); const loc = useLocation(); const mobile = useMobile();
  const [counts, setCounts] = useState<{ openOrders: number }>({ openOrders: 0 });
  const { setDemo } = useContext(DemoCtx);
  useEffect(() => { aapi('/me').then(r => { setCounts(r.counts ?? { openOrders: 0 }); setDemo(r.demo === true); }).catch(() => {}); }, [loc.pathname, setDemo]);
  const [q, setQ] = useState(''); const [drawer, setDrawer] = useState(false); const [msearch, setMsearch] = useState(false);
  const burger = useRef<HTMLButtonElement>(null); const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setDrawer(false); setMsearch(false); window.scrollTo(0, 0); }, [loc.pathname]);
  useEffect(() => { if (!mobile) setDrawer(false); }, [mobile]);
  useEffect(() => { // drawer: Esc closes, focus moves in and back to the menu button, page behind doesn't scroll
    if (!drawer) return;
    const first = drawerRef.current?.querySelector<HTMLElement>('a,button'); first?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
      if (e.key === 'Tab' && drawerRef.current) { const f = [...drawerRef.current.querySelectorAll<HTMLElement>('a,button')]; if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); } }
    };
    window.addEventListener('keydown', k); const ov = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ov; burger.current?.focus(); };
  }, [drawer]);
  const search = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) nav(`/admin/orders?q=${encodeURIComponent(q.trim())}`); };
  return <div className="adm-shell">
    {!mobile && <aside className="adm-side" aria-label="منوی کناری"><SideNav me={me} counts={counts} onLogout={onLogout} /></aside>}
    {mobile && drawer && <div className="adm-scrim" onClick={() => setDrawer(false)}>
      <div className="adm-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-label="منوی مدیریت" onClick={e => e.stopPropagation()}>
        <SideNav me={me} counts={counts} onLogout={onLogout} onNav={() => setDrawer(false)} /></div></div>}
    <div className="adm-main">
      {mobile
        ? <header className="adm-mtop">
            <button ref={burger} type="button" className="adm-iconbtn" aria-label="باز کردن منو" aria-expanded={drawer} onClick={() => setDrawer(true)}><img src="/admin-icons/MenuHamburger.svg" alt="" width="24" height="24" /></button>
            <b className="t">جومه · مدیریت</b><span className="sp" />
            <button type="button" className="adm-iconbtn" aria-label="جستجو" aria-expanded={msearch} onClick={() => setMsearch(v => !v)}><img src="/admin-icons/Search1.svg" alt="" width="22" height="22" /></button>
            <span className="adm-iconbtn" title="اعلان‌ها — فاز ۲"><img src="/admin-icons/Notification1.svg" alt="اعلان‌ها (فاز ۲)" width="22" height="22" /></span>
            <span className="adm-iconbtn av" title={me.name}><img src="/admin-icons/Profile1.svg" alt={me.name} width="18" height="18" /></span>
          </header>
        : <header className="adm-top">
            <form className="adm-search" role="search" onSubmit={search}>
              <img src="/admin-icons/Search1.svg" alt="" /><input aria-label="جستجوی سفارش" placeholder="جستجوی سفارش، محصول یا مشتری..." value={q} onChange={e => setQ(e.target.value)} /></form>
            <span className="sp" />
            <span className="adm-pill">داده نمونه · نمونه اولیه</span>
            <span className="adm-ico" title="اعلان‌ها — فاز ۲"><img src="/admin-icons/Notification1.svg" alt="اعلان‌ها (فاز ۲)" /></span>
            <span className="adm-user"><span className="adm-avatar sm"><img src="/admin-icons/Profile1.svg" alt="" /></span>{me.name}<img className="chev" src="/admin-icons/Down3.svg" alt="" /></span>
          </header>}
      {mobile && msearch && <form className="adm-msearch" role="search" onSubmit={search}><img src="/admin-icons/Search1.svg" alt="" />
        <input autoFocus aria-label="جستجوی سفارش" placeholder="شماره سفارش یا موبایل" value={q} onChange={e => setQ(e.target.value)} /></form>}
      <main className="adm-content">
        {mobile && <span className="adm-mchip">داده نمونه · نمونه اولیه</span>}
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductsList />} /><Route path="products/new" element={<ProductEdit />} /><Route path="products/:id" element={<ProductEdit />} />
          <Route path="categories" element={<Categories />} />
          <Route path="inventory" element={<Inventory />} /><Route path="inventory/history" element={<InventoryHistory />} />
          <Route path="orders" element={<OrdersList />} /><Route path="orders/:id" element={<OrderDetail />} />
          <Route path="customers" element={<CustomersList />} /><Route path="customers/:id" element={<CustomerProfile />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="content" element={<Content />} /><Route path="content/pages/:slug" element={<ContentPage />} />
          <Route path="settings" element={<Navigate to="/admin/settings/users" replace />} /><Route path="settings/users" element={<Users />} /><Route path="settings/audit" element={<Audit />} />
          <Route path="*" element={<div className="adm-state"><b>صفحه پیدا نشد</b></div>} />
        </Routes>
      </main>
    </div>
  </div>;
}

// INTERIM e-mail + password login (admin-v1): same .adm-login frame/style as before, phone field swapped for e-mail + password.
// Emma is designing the final e-mail login screen; replace this when it lands.
type DemoAcct = { email: string; name: string; roleLabel: string; password: string };
function Login({ onIn }: { onIn: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [fields, setFields] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  // Preview only: the API answers /demo-accounts only when the demo flag is on (404 on production) — the hint is hidden otherwise.
  const [accts, setAccts] = useState<DemoAcct[]>([]);
  const { setDemo } = useContext(DemoCtx);
  useEffect(() => { aapi<DemoAcct[]>('/demo-accounts').then(r => { setAccts(r.data ?? []); setDemo(true); }).catch(() => { setAccts([]); setDemo(false); }); }, [setDemo]);
  const go = async (e = email, p = password) => {
    setErr(''); setFields({}); setBusy(true);
    try { await aapi('/auth/login', { method: 'POST', body: { email: e, password: p } }); onIn(); }
    catch (x) { const c = (x as AdminApiError).code;
      if (c === 'validation') setFields((x as AdminApiError).fields ?? {});
      else setErr(c === 'invalid_credentials' ? 'ایمیل یا رمز عبور درست نیست' : c === 'rate_limited' ? 'تعداد تلاش‌های ناموفق زیاد است؛ ۱۵ دقیقه دیگر دوباره امتحان کنید' : c === 'bad_origin' ? 'درخواست از نشانی دیگری ارسال شده است' : 'ورود انجام نشد'); }
    finally { setBusy(false); }
  };
  return <div className="adm adm-login"><DemoBanner />
    <form className="box" onSubmit={e => { e.preventDefault(); go(); }}>
      <h1><span className="adm-logo">ج</span>ورود به پنل مدیریت جومه</h1>
      <Field label="ایمیل" req err={fields.email}><input className={`adm-input${fields.email || err ? ' bad' : ''}`} type="email" autoComplete="username" dir="ltr" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <Field label="رمز عبور" req err={fields.password ?? err}><input className={`adm-input${fields.password || err ? ' bad' : ''}`} type="password" autoComplete="current-password" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} /></Field>
      <Button kind="primary" type="submit" disabled={busy}>ورود</Button>
      <span className="adm-muted">صفحه‌ی ورود موقت (interim) — طراحی نهایی ورود با ایمیل در حال انجام است.</span>
      {accts.length > 0 && <div className="adm-accts"><span className="adm-muted">حساب‌های نمایشی (فقط نسخه‌ی پیش‌نمایش):</span>
        {accts.map(a => <button type="button" key={a.email} onClick={() => { setEmail(a.email); setPassword(a.password); go(a.email, a.password); }}><b>{a.name}</b> · {a.roleLabel}<br /><span className="adm-muted">ایمیل: </span><bdi dir="ltr" style={{ whiteSpace: 'nowrap' }}>{a.email}</bdi><br /><span className="adm-muted">رمز: </span><bdi dir="ltr" style={{ whiteSpace: 'nowrap' }}>{a.password}</bdi></button>)}</div>}
    </form></div>;
}

export function AdminApp() {
  const [me, setMe] = useState<Me | null>(null); const [ready, setReady] = useState(false); const [demo, setDemo] = useState(false);
  const loc = useLocation(); const nav = useNavigate();
  const load = useCallback(() => {
    aapi<Me | null>('/auth/session').then(r => setMe(r.data ?? null))  // 200 + data:null before sign-in (no 401 in the console)
      .catch(() => setMe(null)).finally(() => setReady(true));
  }, []);
  useEffect(load, [load]);
  useEffect(() => { const f = () => setMe(null); window.addEventListener('joumeh-admin-401', f); return () => window.removeEventListener('joumeh-admin-401', f); }, []);
  useEffect(() => { document.documentElement.lang = 'fa'; document.title = demo ? 'پنل مدیریت جومه (DEMO)' : 'پنل مدیریت جومه'; }, [demo]);
  const logout = async () => { await aapi('/auth/logout', { method: 'POST' }).catch(() => {}); setMe(null); };
  return <DemoCtx.Provider value={{ demo, setDemo }}>{
    !ready ? <div className="adm"><DemoBanner /></div>
    : !me ? <Login onIn={() => { load(); if (loc.pathname === '/admin/login') nav('/admin'); }} />
    : <MeCtx.Provider value={me}><div className="adm" dir="rtl"><DemoBanner /><Shell me={me} onLogout={logout} /><Toasts /></div></MeCtx.Provider>}</DemoCtx.Provider>;
}
export default AdminApp;
