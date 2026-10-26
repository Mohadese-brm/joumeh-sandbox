// Figma Settings 184:46185 (Users & roles 184:42330 — reduced to the read-only v1 users list; Audit log 184:43910).
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLoad } from './hooks';
import { FiltersRow } from './Products';
import { Badge, Button, ErrorState, Field, Loading, NoPermission, PageTitle, Table, when, fa } from '../ui';
import { useMe, can } from '../AdminApp';

const SecNav = () => <nav className="adm-secnav" aria-label="تنظیمات">
  <span className="off">فروشگاه (فاز ۲)</span><NavLink to="/admin/settings/users" className={({ isActive }) => isActive ? 'on' : ''}>کاربران</NavLink>
  <span className="off">پرداخت (فاز ۲)</span><span className="off">ارسال (فاز ۲)</span><span className="off">پیامک و اعلان‌ها (فاز ۲)</span>
  <NavLink to="/admin/settings/audit" className={({ isActive }) => isActive ? 'on' : ''}>سوابق سیستم</NavLink></nav>;
const STATUS: Record<string, ['success' | 'info' | 'neutral', string]> = { active: ['success', 'فعال'], invited: ['info', 'دعوت ارسال شد'], inactive: ['neutral', 'غیرفعال'] };

// admin-v1: read-only. Two admins with the same full access (Owner + business owner); accounts are created once with
// `npm run admin:setup` on the server (passwords typed at runtime). INTERIM screen until Emma's final users design.
export function Users() {
  const me = useMe(); const { data, extra, error, loading, reload } = useLoad<any[]>(can(me, 'settings') ? '/users' : null);
  if (!can(me, 'settings')) return <NoPermission crumb="تحلیل و سیستم / تنظیمات" title="کاربران" />;
  return <>
    <PageTitle crumb="تحلیل و سیستم / تنظیمات / کاربران" title="کاربران" />
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}><SecNav />
      <div style={{ flex: 1, display: 'grid', gap: 16, minWidth: 0 }}>
        <div className="adm-info">نسخه ۱: حداکثر {fa(extra?.maxAdmins ?? 2)} مدیر با دسترسی کامل و یکسان به همه‌ی بخش‌ها (مالک + صاحب کسب‌وکار). نقش‌های جداگانه در این نسخه وجود ندارد.</div>
        {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> :
          <Table head={['کاربر', 'ایمیل', 'نقش', 'دسترسی', 'وضعیت', 'آخرین ورود']}>{data!.map(a => <tr key={a.id}><td><b>{a.name}</b>{a.isDemo ? <span className="adm-tag">نمونه</span> : null}</td><td><bdi dir="ltr">{a.email}</bdi></td>
            <td><span className="adm-tag">{a.roleLabel}</span></td><td>کامل</td><td><Badge tone={STATUS[a.status]?.[0] ?? 'neutral'}>{STATUS[a.status]?.[1] ?? a.status}</Badge></td><td className="adm-muted">{when(a.lastLogin)}</td></tr>)}</Table>}
        <span className="adm-muted">صفحه‌ی موقت (interim). حساب‌های واقعی یک بار با اسکریپت راه‌اندازی روی سرور ساخته می‌شوند (<bdi dir="ltr">npm run admin:setup</bdi>)؛ دعوت و ویرایش نقش در این نسخه نیست.</span>
      </div></div>
  </>;
}
const ACT: Record<string, string> = { login: 'ورود', create: 'ایجاد', update: 'ویرایش', note: 'یادداشت', invite: 'دعوت', hide: 'پنهان کردن', unhide: 'نمایش', delete: 'حذف', rename: 'تغییر نام', publish: 'انتشار', 'save-draft': 'ذخیره پیش‌نویس' };
export function Audit() {
  const me = useMe(); const { data, error, loading, reload } = useLoad<any[]>(can(me, 'settings') ? '/audit' : null);
  const [q, setQ] = useState(''); const [act, setAct] = useState('');
  if (!can(me, 'settings')) return <NoPermission crumb="تحلیل و سیستم / تنظیمات" title="سوابق سیستم" />;
  return <>
    <PageTitle crumb="تحلیل و سیستم / تنظیمات / سوابق سیستم" title="سوابق سیستم" sub="چه کسی، چه چیزی را، چه زمانی تغییر داد" actions={<Button ico="Download" disabled title="خروجی فایل در نسخه‌ی نمایشی نیست">خروجی (نمونه اولیه)</Button>} />
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}><SecNav /><div style={{ flex: 1, minWidth: 0 }}>
      <FiltersRow q={q} onQ={setQ} ph="کاربر، موضوع یا جزئیات…"><Field label="عملیات"><select className="adm-select" value={act} onChange={e => setAct(e.target.value)}><option value="">همه</option>{Object.entries(ACT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field></FiltersRow>
      {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> :
        <Table head={['زمان', 'کاربر', 'عملیات', 'موضوع', 'جزئیات']}>{data!.filter(l => (!act || l.action === act) && (!q || [l.actor, l.entity, l.detail].join(' ').includes(q))).map(l => <tr key={l.id}><td className="adm-muted">{when(l.createdAt)}</td><td>{l.actor ?? '—'}</td>
          <td>{ACT[l.action] ?? l.action}</td><td>{l.entity} {l.entityId && fa(l.entityId)}</td><td className="adm-muted">{l.detail}</td></tr>)}</Table>}
    </div></div>
  </>;
}
