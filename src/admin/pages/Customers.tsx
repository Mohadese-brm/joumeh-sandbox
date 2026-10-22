// Figma Customers 181:35195 (List 181:31228, Profile 181:31561). Block / export = placeholder (ADMIN-PH-PRIVACY).
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLoad } from './hooks';
import { Ph, Empty, ErrorState, Field, Loading, NoPermission, ORDER_STATUS, PageTitle, REVIEW, StatusBadge, Stub, Table, fa, toman, when } from '../ui';
import { faNumber } from '../../lib/format';
import { useMe, can } from '../AdminApp';

export function CustomersList() {
  const me = useMe(); const nav = useNavigate(); const [q, setQ] = useState('');
  const { data, error, loading, reload } = useLoad<any[]>(can(me, 'customers') ? `/customers?q=${encodeURIComponent(q)}` : null);
  if (!can(me, 'customers')) return <NoPermission />;
  return <>
    <PageTitle crumb="مشتریان و پشتیبانی / مشتریان" title="مشتریان" sub={`${faNumber(data?.length ?? 0)} مشتری · داده نمونه`} />
    <div className="adm-filters"><Field label="جستجو" grow><input className="adm-input" placeholder="نام یا موبایل…" value={q} onChange={e => setQ(e.target.value)} /></Field></div>
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length ? <Empty title="مشتری‌ای پیدا نشد" /> :
      <Table head={['مشتری', 'موبایل', 'تعداد سفارش', 'مجموع خرید (تومان)', 'آخرین سفارش']}>
        {data.map(u => <tr key={u.id} className="click" onClick={() => nav(`/admin/customers/${u.id}`)}><td><b>{[u.firstName, u.lastName].filter(Boolean).join(' ') || 'بدون نام'}</b></td>
          <td><Ph p={u.phone} /></td><td>{faNumber(u.orders)}</td><td>{toman(u.spent)}</td><td className="adm-muted">{when(u.lastOrder)}</td></tr>)}
      </Table>}
  </>;
}
export function CustomerProfile() {
  const { id } = useParams(); const me = useMe();
  const { data: u, error, loading, reload } = useLoad<any>(can(me, 'customers') ? `/customers/${id}` : null);
  if (!can(me, 'customers')) return <NoPermission />;
  if (loading && !u) return <Loading />; if (error) return error.status === 404 ? <Empty title="مشتری پیدا نشد" /> : <ErrorState retry={reload} />;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'بدون نام';
  return <>
    <PageTitle crumb={`مشتریان / ${name}`} title={name} sub={`$<Ph p={u.phone} /> · عضویت ${when(u.createdAt)}`} />
    <div className="adm-info">مسدودسازی مشتری و خروجی اطلاعات در این نسخه نیست — <Stub code="ADMIN-PH-PRIVACY">قوانین حریم خصوصی</Stub></div>
    <div className="adm-grid2">
      <section className="adm-card"><h2>سفارش‌ها ({faNumber(u.orders.length)})</h2>
        {u.orders.length ? <Table head={['سفارش', 'تاریخ', 'مبلغ', 'وضعیت']}>{u.orders.map((o: any) => <tr key={o.id}><td>{can(me, 'orders') ? <Link to={`/admin/orders/${o.id}`}>{fa(o.orderNumber)}</Link> : fa(o.orderNumber)}</td>
          <td className="adm-muted">{when(o.createdAt)}</td><td>{toman(o.total)}</td><td><StatusBadge map={ORDER_STATUS} value={o.orderStatus} /></td></tr>)}</Table> : <Empty title="بدون سفارش" />}</section>
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="adm-card"><h2>اطلاعات تماس</h2><dl className="adm-dl"><dt>موبایل</dt><dd><Ph p={u.phone} /></dd><dt>ایمیل</dt><dd dir="ltr">{u.email ?? '—'}</dd></dl></section>
        <section className="adm-card"><h2>آدرس‌ها</h2>{u.addresses.length ? u.addresses.map((a: any) => <div key={a.id} className="adm-sec"><span>{a.recipient} — {a.province}، {a.city}، {a.line}{a.isDefault ? ' (پیش‌فرض)' : ''}</span></div>) : <span className="adm-muted">آدرسی ثبت نشده.</span>}</section>
        <section className="adm-card"><h2>نظرات</h2>{u.reviews.length ? u.reviews.map((r: any) => <div key={r.id} className="adm-sec"><span>{r.product} · {fa(r.rating)}★</span><StatusBadge map={REVIEW} value={r.status} /></div>) : <span className="adm-muted">نظری ثبت نشده.</span>}</section>
      </div>
    </div>
  </>;
}
