// Joumeh ADMIN — DEMO. Figma: ADMIN — INTERACTIVE PROTOTYPE 304:82401 (desktop 252:63866).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './admin.css';
import { aapi, AdminApiError, type Me, type Level } from './api';
import { Button, Field, Ico, Toasts, fa } from './ui';
import { faNumber } from '../lib/format';
import { Dashboard } from './pages/Dashboard';
import { ProductsList, ProductEdit, Categories } from './pages/Products';
import { OrdersList, OrderDetail } from './pages/Orders';
import { CustomersList, CustomerProfile } from './pages/Customers';
import { Reviews } from './pages/Reviews';
import { Content, ContentPage } from './pages/Content';
import { Users, Audit } from './pages/Settings';

const MeCtx = createContext<Me | null>(null);
export const useMe = () => useContext(MeCtx)!;
export const can = (me: Me, mod: string, need: Level = 'view') => ({ none: 0, view: 1, edit: 2 })[me.permissions[mod] ?? 'none'] >= ({ none: 0, view: 1, edit: 2 })[need];

/** Required on every admin screen in this build. */
export const DemoBanner = () => <div className="adm-demo" role="note">DEMO — data resets · نسخه نمایشی؛ داده‌ها نمونه‌اند و با هر راه‌اندازی مجدد پاک می‌شوند</div>;

type Nav = [to: string, label: string, ico: string, mod?: string] | [group: string];
const NAV: Nav[] = [
  ['', 'داشبورد', 'Home1', 'dashboard'], ['کاتالوگ'], ['products', 'محصولات', 'Bag2', 'products'], ['categories', 'دسته‌بندی‌ها', 'Category', 'products'], ['#', 'موجودی انبار', 'Folder2'],
  ['فروش و عملیات'], ['orders', 'سفارش‌ها', 'Buy2', 'orders'], ['#', 'ارسال و تحویل', 'Send1'], ['#', 'مرجوعی‌ها', 'RotateLeft'],
  ['مشتریان و پشتیبانی'], ['customers', 'مشتریان', 'Group1', 'customers'], ['reviews', 'نظرات', 'Message1', 'reviews'], ['#', 'پشتیبانی', 'Message1'],
  ['مالی و بازاریابی'], ['#', 'مالی و پرداخت‌ها', 'Wallet'], ['#', 'تخفیف‌ها', 'DiscountShape1'], ['content', 'محتوای سایت', 'Image', 'content'],
  ['تحلیل و سیستم'], ['#', 'گزارش‌ها', 'Graph'], ['settings', 'تنظیمات', 'Setting', 'settings'],
];

function Shell({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const nav = useNavigate(); const loc = useLocation();
  const [counts, setCounts] = useState<{ openOrders: number }>({ openOrders: 0 });
  useEffect(() => { aapi('/me').then(r => setCounts(r.counts ?? { openOrders: 0 })).catch(() => {}); }, [loc.pathname]);
  const [q, setQ] = useState('');
  return <div className="adm-shell">
    <aside className="adm-side" aria-label="منوی مدیریت">
      <div className="adm-brand"><div className="adm-logo">ج</div><div><b>جومه</b><small>پنل مدیریت</small></div></div>
      {NAV.map((n, i) => n.length === 1 ? <div key={i} className="adm-group">{n[0]}</div>
        : n[0] === '#' ? <span key={i} className="adm-nav off" title="فاز ۲ — خارج از دامنه‌ی MVP"><Ico n={n[2]} />{n[1]}<span className="adm-badge neutral nodot" style={{ marginInlineStart: 'auto' }}>فاز ۲</span></span>
        : n[3] && !can(me, n[3]) ? null
        : <NavLink key={i} end={n[0] === ''} to={n[0] ? `/admin/${n[0]}` : '/admin'} className={({ isActive }) => `adm-nav${isActive ? ' on' : ''}`}><Ico n={n[2]} />{n[1]}
          {n[0] === 'orders' && counts.openOrders > 0 && <span className="cnt" aria-label={`${counts.openOrders} سفارش باز`}>{faNumber(counts.openOrders)}</span>}</NavLink>)}
      <div className="adm-me"><div className="adm-avatar"><img src="/admin-icons/Profile1.svg" alt="" /></div><div className="who"><b>{me.name}</b><small>{me.roleLabels.join('، ')}</small></div>
        <button className="adm-btn sm" onClick={onLogout} aria-label="خروج"><img src="/admin-icons/Logout.svg" alt="" /></button></div>
    </aside>
    <div className="adm-main">
      <header className="adm-top">
        <form className="adm-search" role="search" onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/admin/orders?q=${encodeURIComponent(q.trim())}`); }}>
          <img src="/admin-icons/Search1.svg" alt="" /><input aria-label="جستجوی سفارش" placeholder="جستجوی سفارش، محصول یا مشتری..." value={q} onChange={e => setQ(e.target.value)} /></form>
        <span className="sp" />
        <span className="adm-pill">داده نمونه · نمونه اولیه</span>
        <span className="adm-ico" title="اعلان‌ها — فاز ۲"><img src="/admin-icons/Notification1.svg" alt="اعلان‌ها (فاز ۲)" /></span>
        <span className="adm-user"><span className="adm-avatar sm"><img src="/admin-icons/Profile1.svg" alt="" /></span>{me.name}<img className="chev" src="/admin-icons/Down3.svg" alt="" /></span>
      </header>
      <main className="adm-content">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductsList />} /><Route path="products/new" element={<ProductEdit />} /><Route path="products/:id" element={<ProductEdit />} />
          <Route path="categories" element={<Categories />} />
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
  useEffect(() => { aapi<DemoAcct[]>('/demo-accounts').then(r => setAccts(r.data ?? [])).catch(() => setAccts([])); }, []);
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
  const [me, setMe] = useState<Me | null>(null); const [ready, setReady] = useState(false);
  const loc = useLocation(); const nav = useNavigate();
  const load = useCallback(() => {
    aapi<Me>('/me').then(r => setMe(r.data)).catch(() => setMe(null)).finally(() => setReady(true));
  }, []);
  useEffect(load, [load]);
  useEffect(() => { const f = () => setMe(null); window.addEventListener('joumeh-admin-401', f); return () => window.removeEventListener('joumeh-admin-401', f); }, []);
  useEffect(() => { document.documentElement.lang = 'fa'; document.title = 'پنل مدیریت جومه (DEMO)'; }, []);
  if (!ready) return <div className="adm"><DemoBanner /></div>;
  if (!me) return <Login onIn={() => { load(); if (loc.pathname === '/admin/login') nav('/admin'); }} />;
  const logout = async () => { await aapi('/auth/logout', { method: 'POST' }).catch(() => {}); setMe(null); };
  return <MeCtx.Provider value={me}><div className="adm" dir="rtl"><DemoBanner /><Shell me={me} onLogout={logout} /><Toasts /></div></MeCtx.Provider>;
}
export default AdminApp;
