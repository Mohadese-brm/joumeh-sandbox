import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useStore } from '../../lib/store';
import { Icon, type IconName } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import '../Account.css';
// Account nav per Figma 125:383. Icons: only home-1 and heart-1 exist in the exported pack subset; the other nav icons
// (orders, returns, location, card, help, settings, logout) were not exported in the handoff package → omitted, flagged.
const NAV: [string, string, IconName | null][] = [
  ['/account', 'نمای کلی حساب', 'home-1'], ['/account/orders', 'سفارش‌های من', 'bag-1'], ['/account/returns', 'مرجوعی‌های من', null], ['/account/addresses', 'آدرس‌ها', null],
  ['/account/favorites', 'علاقه‌مندی‌ها', 'heart-1'], ['/account/payment', 'اطلاعات پرداخت', null], ['/account/support', 'پشتیبانی', null], ['/account/settings', 'تنظیمات حساب', null],
];
export function AccountLayout() {
  const { user, authReady, openAuth, logout, toast } = useStore(); const nav = useNavigate(); const [confirm, setConfirm] = useState(false);
  if (!authReady) return <div className="wrap acc" aria-busy="true"><div className="skel" style={{ blockSize: 300, marginBlockStart: 32 }} /></div>;
  if (!user) return (
    <div className="wrap acc"><h1 className="h-page acc__h">حساب کاربری من</h1>
      <div className="card state"><p>برای مشاهده‌ی حساب کاربری وارد شوید.</p><button className="btn btn--primary" onClick={() => openAuth()}>ورود / ثبت‌نام</button></div></div>);
  return (
    <div className="wrap acc">
      <h1 className="h-page acc__h">حساب کاربری من</h1>
      <div className="acc__grid">
        <nav className="card acc__nav" aria-label="منوی حساب">
          <ul>{NAV.map(([to, label, ic]) => <li key={to}><NavLink to={to} end={to === '/account'}>{ic ? <Icon name={ic} size={20} /> : <span className="acc__noicon" aria-hidden="true" />}<span>{label}</span></NavLink></li>)}</ul>
          <button type="button" className="acc__logout" onClick={() => setConfirm(true)}><span className="acc__noicon" aria-hidden="true" />خروج</button>
        </nav>
        <div className="acc__body"><Outlet /></div>
      </div>
      {confirm && <Modal title="خروج از حساب" onClose={() => setConfirm(false)} labelId="lo-title">
        <p>آیا می‌خواهید از حساب کاربری خود خارج شوید؟</p>
        <div className="acc__dlgact"><button className="btn btn--primary" onClick={async () => { await logout(); setConfirm(false); toast('از حساب خارج شدید'); nav('/'); }}>خروج</button>
          <button className="btn btn--outline" onClick={() => setConfirm(false)}>انصراف</button></div>
      </Modal>}
    </div>
  );
}
