// Figma Settings 184:46185 (Users & roles 184:42330, Role permissions 184:42624, Invite user 184:43107, Audit log 184:43910).
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLoad } from './hooks';
import { aapi, AdminApiError } from '../api';
import { Badge, Button, ErrorState, Field, Loading, Modal, NoPermission, PageTitle, Table, toast, when, fa } from '../ui';
import { useMe, can } from '../AdminApp';

const SecNav = () => <nav className="adm-secnav" aria-label="تنظیمات">
  <span className="off">فروشگاه (فاز ۲)</span><NavLink to="/admin/settings/users" className={({ isActive }) => isActive ? 'on' : ''}>کاربران و نقش‌ها</NavLink>
  <span className="off">پرداخت (فاز ۲)</span><span className="off">ارسال (فاز ۲)</span><span className="off">پیامک و اعلان‌ها (فاز ۲)</span>
  <NavLink to="/admin/settings/audit" className={({ isActive }) => isActive ? 'on' : ''}>سوابق سیستم</NavLink></nav>;
const STATUS: Record<string, ['success' | 'info' | 'neutral', string]> = { active: ['success', 'فعال'], invited: ['info', 'دعوت ارسال شد'], inactive: ['neutral', 'غیرفعال'] };
const LV: Record<string, string> = { none: '—', view: 'مشاهده', edit: 'ویرایش' };
const MODS: [string, string][] = [['dashboard', 'داشبورد'], ['products', 'محصولات'], ['orders', 'سفارش‌ها'], ['customers', 'مشتریان'], ['reviews', 'نظرات'], ['content', 'محتوا'], ['settings', 'تنظیمات']];

export function Users() {
  const me = useMe(); const { data, extra, error, loading, reload } = useLoad<any[]>(can(me, 'settings') ? '/users' : null);
  const [inv, setInv] = useState<{ phone: string; name: string; roles: string[] } | null>(null); const [errs, setErrs] = useState<Record<string, string>>({});
  const [ed, setEd] = useState<any>(null); const [edErr, setEdErr] = useState('');
  if (!can(me, 'settings')) return <NoPermission />;
  const edit = can(me, 'settings', 'edit'); const roles: Record<string, string> = extra?.roles ?? {};
  const invite = async () => { setErrs({}); try { await aapi('/users', { method: 'POST', body: inv }); setInv(null); toast('دعوت ثبت شد (پیامک ارسال نمی‌شود — BD-13)'); reload(); } catch (e) { setErrs((e as AdminApiError).fields ?? {}); } };
  const update = async () => { setEdErr(''); try { await aapi(`/users/${ed.id}`, { method: 'PUT', body: { roles: ed.roles, status: ed.status } }); setEd(null); toast('کاربر به‌روز شد'); reload(); }
    catch (e) { setEdErr((e as AdminApiError).code === 'last_owner' ? 'همیشه باید حداقل یک مدیر کل (مالک) فعال وجود داشته باشد.' : 'ذخیره انجام نشد'); } };
  const RolePick = ({ v, on }: { v: string[]; on: (r: string[]) => void }) => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{Object.entries(roles).map(([k, l]) =>
    <label key={k} className="adm-check"><input type="checkbox" checked={v.includes(k)} onChange={e => on(e.target.checked ? [...v, k] : v.filter(x => x !== k))} />{l}</label>)}</div>;
  return <>
    <PageTitle crumb="تحلیل و سیستم / تنظیمات / کاربران و نقش‌ها" title="کاربران و نقش‌ها" actions={edit && <Button kind="primary" onClick={() => setInv({ phone: '', name: '', roles: [] })}>دعوت کاربر</Button>} />
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}><SecNav />
      <div style={{ flex: 1, display: 'grid', gap: 16, minWidth: 0 }}>
        <div className="adm-info">یک نفر می‌تواند چند نقش داشته باشد؛ دسترسی برابر اجتماع نقش‌هاست. تخصیص نقش‌ها و سطح دسترسی‌ها در انتظار تصمیم کسب‌وکار (BD-19).</div>
        {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> :
          <Table head={['کاربر', 'موبایل', 'نقش‌ها', 'وضعیت', 'آخرین ورود', '']}>{data!.map(a => <tr key={a.id}><td><b>{a.name}</b></td><td><bdi dir="ltr">{fa(a.phone)}</bdi></td>
            <td>{a.roleLabels.map((l: string) => <span key={l} className="adm-tag">{l}</span>)}</td><td><Badge tone={STATUS[a.status][0]}>{STATUS[a.status][1]}</Badge></td><td className="adm-muted">{when(a.lastLogin)}</td>
            <td>{edit && <Button sm onClick={() => { setEdErr(''); setEd({ ...a }); }}>ویرایش</Button>}</td></tr>)}</Table>}
        <section className="adm-card"><h2>ماتریس دسترسی (پیش‌فرض نمونه — BD-19)</h2>
          <Table head={['نقش', ...MODS.map(m => m[1])]}>{Object.entries(extra?.permissions ?? {}).map(([r, p]: [string, any]) => <tr key={r}><td><b>{roles[r]}</b></td>{MODS.map(([m]) => <td key={m}>{LV[p[m]]}</td>)}</tr>)}</Table></section>
      </div></div>
    {inv && <Modal title="دعوت کاربر" onClose={() => setInv(null)} foot={<><Button kind="primary" onClick={invite}>ثبت دعوت</Button><Button onClick={() => setInv(null)}>انصراف</Button></>}>
      <Field label="نام" req err={errs.name}><input className="adm-input" value={inv.name} onChange={e => setInv({ ...inv, name: e.target.value })} /></Field>
      <Field label="شماره موبایل" req err={errs.phone}><input className="adm-input" dir="ltr" inputMode="numeric" value={inv.phone} onChange={e => setInv({ ...inv, phone: e.target.value })} /></Field>
      <Field label="نقش‌ها" req err={errs.roles}><RolePick v={inv.roles} on={r => setInv({ ...inv, roles: r })} /></Field>
      <span className="adm-muted">پیامک دعوت ارسال نمی‌شود (BD-13). در نسخه‌ی نمایشی، مالک کاربر دعوت‌شده را «فعال» می‌کند.</span></Modal>}
    {ed && <Modal title={`ویرایش ${ed.name}`} onClose={() => setEd(null)} foot={<><Button kind="primary" onClick={update}>ذخیره</Button><Button onClick={() => setEd(null)}>انصراف</Button></>}>
      <Field label="نقش‌ها"><RolePick v={ed.roles} on={r => setEd({ ...ed, roles: r })} /></Field>
      <Field label="وضعیت"><select className="adm-select" value={ed.status} onChange={e => setEd({ ...ed, status: e.target.value })}><option value="active">فعال</option><option value="invited">دعوت‌شده</option><option value="inactive">غیرفعال</option></select></Field>
      {edErr && <div className="adm-warnbox" role="alert">{edErr}</div>}</Modal>}
  </>;
}
const ACT: Record<string, string> = { login: 'ورود', create: 'ایجاد', update: 'ویرایش', note: 'یادداشت', invite: 'دعوت', hide: 'پنهان کردن', unhide: 'نمایش', delete: 'حذف', rename: 'تغییر نام', publish: 'انتشار', 'save-draft': 'ذخیره پیش‌نویس' };
export function Audit() {
  const me = useMe(); const { data, error, loading, reload } = useLoad<any[]>(can(me, 'settings') ? '/audit' : null);
  if (!can(me, 'settings')) return <NoPermission />;
  return <>
    <PageTitle crumb="تحلیل و سیستم / تنظیمات / سوابق سیستم" title="سوابق سیستم" sub="چه کسی، چه چیزی را، چه زمانی تغییر داد" />
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}><SecNav /><div style={{ flex: 1, minWidth: 0 }}>
      {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> :
        <Table head={['زمان', 'کاربر', 'عملیات', 'موضوع', 'جزئیات']}>{data!.map(l => <tr key={l.id}><td className="adm-muted">{when(l.createdAt)}</td><td>{l.actor ?? '—'}</td>
          <td>{ACT[l.action] ?? l.action}</td><td>{l.entity} {l.entityId && fa(l.entityId)}</td><td className="adm-muted">{l.detail}</td></tr>)}</Table>}
    </div></div>
  </>;
}
