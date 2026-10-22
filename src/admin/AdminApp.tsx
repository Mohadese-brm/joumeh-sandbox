// Joumeh ADMIN — DEMO. Figma: ADMIN — INTERACTIVE PROTOTYPE 304:82401 (desktop 252:63866).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './admin.css';
import { aapi, getAdminToken, setAdminToken, AdminApiError, type Me, type Level } from './api';
import { Button, Field, Ico, Toasts, fa } from './ui';
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
  const nav = useNavigate();
  const [q, setQ] = useState('');
  return <div className="adm-shell">
    <aside className="adm-side" aria-label="منوی مدیریت">
      <div className="adm-brand"><div className="adm-logo">ج</div><div><b>جومه</b><small>پنل مدیریت</small></div></div>
      {NAV.map((n, i) => n.length === 1 ? <div key={i} className="adm-group">{n[0]}</div>
        : n[0] === '#' ? <span key={i} className="adm-nav off" title="فاز ۲ — خارج از دامنه‌ی MVP"><Ico n={n[2]} />{n[1]}<span className="cnt">فاز ۲</span></span>
        : n[3] && !can(me, n[3]) ? null
        : <NavLink key={i} end={n[0] === ''} to={`/admin/${n[0]}`} className={({ isActive }) => `adm-nav${isActive ? ' on' : ''}`}><Ico n={n[2]} />{n[1]}</NavLink>)}
      <div className="adm-me"><div className="adm-avatar"><img src="/admin-icons/Profile1.svg" alt="" /></div><div className="who"><b>{me.name}</b><small>{me.roleLabels.join('، ')}</small></div>
        <button className="adm-btn sm" onClick={onLogout} aria-label="خروج"><img src="/admin-icons/Logout.svg" alt="" /></button></div>
    </aside>
    <div className="adm-main">
      <header className="adm-top">
        <form className="adm-search" role="search" onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/admin/orders?q=${encodeURIComponent(q.trim())}`); }}>
          <img src="/admin-icons/Search1.svg" alt="" /><input aria-label="جستجوی سفارش" placeholder="جستجوی سفارش یا مشتری…" value={q} onChange={e => setQ(e.target.value)} /></form>
        <span className="sp" />
        <span className="adm-pill">داده نمونه · نمونه اولیه</span>
        <span className="adm-ico" title="اعلان‌ها — فاز ۲"><img src="/admin-icons/Notification1.svg" alt="اعلان‌ها (فاز ۲)" /></span>
        <span style={{ fontWeight: 600 }}>{me.name}</span>
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

function Login({ onIn }: { onIn: () => void }) {
  const [phone, setPhone] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [accts, setAccts] = useState<{ phone: string; name: string; roleLabels: string[] }[]>([]);
  useEffect(() => { aapi('/demo-accounts').then(r => setAccts(r.data)).catch(() => setAccts([])); }, []);
  const go = async (p = phone) => {
    setErr(''); setBusy(true);
    try { const r = await aapi('/auth/demo-login', { method: 'POST', body: { phone: p } }); setAdminToken(r.data.token); onIn(); }
    catch (e) { const c = (e as AdminApiError).code; setErr(c === 'no_admin_access' ? 'این شماره دسترسی مدیریت ندارد' : c === 'invalid_phone' ? 'شماره موبایل معتبر نیست' : c === 'not_found' ? 'ورود نمایشی فقط در نسخه‌ی محلی فعال است' : 'ورود انجام نشد'); }
    finally { setBusy(false); }
  };
  return <div className="adm adm-login"><DemoBanner />
    <form className="box" onSubmit={e => { e.preventDefault(); go(); }}>
      <h1><span className="adm-logo">ج</span>ورود به پنل مدیریت جومه</h1>
      <Field label="شماره موبایل" req err={err}><input className={`adm-input${err ? ' bad' : ''}`} inputMode="numeric" dir="ltr" placeholder="0912 000 0001" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
      <Button kind="primary" type="submit" disabled={busy}>ورود نمایشی (بدون پیامک)</Button>
      <span className="adm-muted">نمونه اولیه — سرویس پیامک: در انتظار تصمیم کسب‌وکار (BD-13). در این نسخه کد پیامکی ارسال نمی‌شود.</span>
      {accts.length > 0 && <div className="adm-accts"><span className="adm-muted">حساب‌های نمایشی:</span>
        {accts.map(a => <button type="button" key={a.phone} onClick={() => { setPhone(a.phone); go(a.phone); }}><b>{a.name}</b> · <bdi dir="ltr">{fa(a.phone)}</bdi> · {a.roleLabels.join('، ')}</button>)}</div>}
    </form></div>;
}

export function AdminApp() {
  const [me, setMe] = useState<Me | null>(null); const [ready, setReady] = useState(false);
  const loc = useLocation(); const nav = useNavigate();
  const load = useCallback(() => {
    if (!getAdminToken()) { setMe(null); setReady(true); return; }
    aapi<Me>('/me').then(r => setMe(r.data)).catch(() => setMe(null)).finally(() => setReady(true));
  }, []);
  useEffect(load, [load]);
  useEffect(() => { const f = () => setMe(null); window.addEventListener('joumeh-admin-401', f); return () => window.removeEventListener('joumeh-admin-401', f); }, []);
  useEffect(() => { document.documentElement.lang = 'fa'; document.title = 'پنل مدیریت جومه (DEMO)'; }, []);
  if (!ready) return <div className="adm"><DemoBanner /></div>;
  if (!me) return <Login onIn={() => { load(); if (loc.pathname === '/admin/login') nav('/admin'); }} />;
  const logout = async () => { await aapi('/auth/logout', { method: 'POST' }).catch(() => {}); setAdminToken(null); setMe(null); };
  return <MeCtx.Provider value={me}><div className="adm" dir="rtl"><DemoBanner /><Shell me={me} onLogout={logout} /><Toasts /></div></MeCtx.Provider>;
}
export default AdminApp;
