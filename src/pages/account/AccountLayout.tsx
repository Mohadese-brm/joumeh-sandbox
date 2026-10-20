import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { Icon, type IconName } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import '../Account.css';
// Account nav per Figma Account / Navigation 124:4322 (e.g. 124:3979). Icons exported read-only from that component (round 1, M1).
const NAV: [string, string, IconName][] = [
  ['/account', 'نمای کلی حساب', 'nav-home'], ['/account/orders', 'سفارش‌های من', 'nav-orders'], ['/account/returns', 'مرجوعی‌های من', 'nav-returns'], ['/account/addresses', 'آدرس‌ها', 'nav-location'],
  ['/account/favorites', 'علاقه‌مندی‌ها', 'nav-heart'], ['/account/payment', 'اطلاعات پرداخت', 'nav-card'], ['/account/support', 'پشتیبانی', 'nav-support'], ['/account/settings', 'تنظیمات حساب', 'nav-settings'],
];
export function AccountNav() {
  const { logout, toast } = useStore(); const nav = useNavigate(); const [confirm, setConfirm] = useState(false);
  return (<>
    <nav className="card acc__nav" aria-label="منوی حساب">
      <ul>{NAV.map(([to, label, ic]) => <li key={to}><NavLink to={to} end={to === '/account'}><Icon name={ic} size={20} /><span>{label}</span></NavLink></li>)}</ul>
      <button type="button" className="acc__logout" onClick={() => setConfirm(true)}><Icon name="nav-logout" size={20} /><span>خروج</span></button>
    </nav>
    {confirm && <Modal title="خروج از حساب" onClose={() => setConfirm(false)} labelId="lo-title">
      <p>آیا می‌خواهید از حساب کاربری خود خارج شوید؟</p>
      <div className="acc__dlgact"><button className="btn btn--primary" onClick={async () => { await logout(); setConfirm(false); toast('از حساب خارج شدید'); nav('/'); }}>خروج</button>
        <button className="btn btn--outline" onClick={() => setConfirm(false)}>انصراف</button></div>
    </Modal>}
  </>);
}
export function AccountLayout() {
  const { user, authReady, openAuth } = useStore(); const support = useLocation().pathname.startsWith('/account/support');
  if (!authReady) return <div className="wrap acc" aria-busy="true"><div className="skel" style={{ blockSize: 300, marginBlockStart: 32 }} /></div>;
  if (!user) return (
    <div className="wrap acc"><h1 className="h-page acc__h">حساب کاربری من</h1>
      <div className="card state"><p>برای مشاهده‌ی حساب کاربری وارد شوید.</p><button className="btn btn--primary" onClick={() => openAuth()}>ورود / ثبت‌نام</button></div></div>);
  return (
    <div className="wrap acc">
      <h1 className="h-page acc__h">{support ? 'پشتیبانی' : 'حساب کاربری من'}</h1>
      <div className="acc__grid">
        <AccountNav />
        <div className="acc__body"><Outlet /></div>
      </div>
    </div>
  );
}
/** Public entry for the footer links (پرسش‌های متداول / تماس با ما). Same frames 246:15454 / 246:15613; the account menu shows only when signed in. */
export function SupportLayout() {
  const { user } = useStore();
  return (
    <div className="wrap acc">
      <h1 className="h-page acc__h">پشتیبانی</h1>
      {user ? <div className="acc__grid"><AccountNav /><div className="acc__body"><Outlet /></div></div> : <div className="acc__body acc__body--solo"><Outlet /></div>}
    </div>
  );
}
