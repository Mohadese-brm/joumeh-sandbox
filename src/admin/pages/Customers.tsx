// Figma Customers 181:35195 (List 181:31228, Profile 181:31561). Block / export = placeholder (ADMIN-PH-PRIVACY).
import { useState } from 'react';
import { aapi } from '../api';
import { FiltersRow } from './Products';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLoad } from './hooks';
import { Ph, Badge, Button, Pager, toast, Empty, ErrorState, Field, Loading, NoPermission, ORDER_STATUS, PageTitle, REVIEW, StatusBadge, Stub, Table, fa, toman, when } from '../ui';
import { faNumber } from '../../lib/format';
import { useMe, can } from '../AdminApp';

export function CustomersList() {
  const me = useMe(); const nav = useNavigate(); const [q, setQ] = useState(''); const [page, setPage] = useState(1); const SIZE = 10;
  const { data, error, loading, reload } = useLoad<any[]>(can(me, 'customers') ? `/customers?q=${encodeURIComponent(q)}` : null);
  if (!can(me, 'customers')) return <NoPermission crumb="مشتریان و پشتیبانی / مشتریان" title="مشتریان" />;
  return <>
    <PageTitle crumb="مشتریان و پشتیبانی / مشتریان" title="مشتریان" sub={`${faNumber(data?.length ?? 0)} مشتری · داده نمونه`} />
    <FiltersRow q={q} onQ={v => { setQ(v); setPage(1); }} ph="نام یا موبایل…">
      <Field label="کانال اولیه"><select className="adm-select" disabled title="همه‌ی مشتریان نمونه از سایت هستند"><option>همه</option></select></Field>
    </FiltersRow>
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length ? <Empty title="مشتری‌ای پیدا نشد" /> :
      <><Table head={['مشتری', 'موبایل', 'کانال اولیه', 'تعداد سفارش', 'مجموع خرید (تومان)', 'آخرین سفارش']}>
        {data.slice((page - 1) * SIZE, page * SIZE).map(u => <tr key={u.id} className="click" onClick={() => nav(`/admin/customers/${u.id}`)}><td><span className="adm-avatar sm"><img src="/admin-icons/Profile1.svg" alt="" /></span> <b>{[u.firstName, u.lastName].filter(Boolean).join(' ') || 'بدون نام'}</b></td>
          <td><Ph p={u.phone} /></td><td>سایت</td><td>{faNumber(u.orders)}</td><td>{toman(u.spent)}</td><td className="adm-muted">{when(u.lastOrder)}</td></tr>)}
      </Table><Pager page={page} total={data.length} size={SIZE} onPage={setPage} /></>}
  </>;
}
export function CustomerProfile() {
  const { id } = useParams(); const me = useMe();
  const [note, setNote] = useState('');
  const { data: u, error, loading, reload, setData } = useLoad<any>(can(me, 'customers') ? `/customers/${id}` : null);
  if (!can(me, 'customers')) return <NoPermission crumb="مشتریان و پشتیبانی / مشتریان" title="مشتریان" />;
  if (loading && !u) return <Loading />; if (error) return error.status === 404 ? <Empty title="مشتری پیدا نشد" /> : <ErrorState retry={reload} />;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'بدون نام';
  return <>
    <PageTitle crumb={`مشتریان / ${name}`} title={name} sub={<><Ph p={u.phone} /> · عضویت {when(u.createdAt)} · کانال اولیه: سایت</>} />
    <div className="adm-info">مسدودسازی مشتری و خروجی اطلاعات در این نسخه نیست — <Stub code="ADMIN-PH-PRIVACY">قوانین حریم خصوصی</Stub></div>
    <div className="adm-grid2">
      <section className="adm-card"><h2>سفارش‌ها ({faNumber(u.orders.length)})</h2>
        {u.orders.length ? <Table head={['سفارش', 'تاریخ', 'مبلغ', 'وضعیت']}>{u.orders.map((o: any) => <tr key={o.id}><td>{can(me, 'orders') ? <Link to={`/admin/orders/${o.id}`}>{fa(o.orderNumber)}</Link> : fa(o.orderNumber)}</td>
          <td className="adm-muted">{when(o.createdAt)}</td><td>{toman(o.total)}</td><td><StatusBadge map={ORDER_STATUS} value={o.orderStatus} /></td></tr>)}</Table> : <Empty title="بدون سفارش" />}</section>
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="adm-card"><h2>یادداشت داخلی</h2>
          {can(me, 'customers', 'edit') && <><Field label="یادداشت (فقط برای تیم)"><textarea className="adm-textarea" placeholder="یادداشت داخلی بنویسید…" value={note} onChange={e => setNote(e.target.value)} maxLength={1000} /></Field>
            <div><Button kind="primary" disabled={!note.trim()} onClick={async () => { try { const r = await aapi(`/customers/${id}/notes`, { method: 'POST', body: { body: note } }); setData({ ...u, notes: r.data }); setNote(''); toast('یادداشت ثبت شد'); } catch { toast('ثبت یادداشت انجام نشد', true); } }}>ثبت یادداشت</Button></div></>}
          {u.notes?.length ? u.notes.map((n: any) => <div key={n.id} className="adm-sec"><span><b>{n.body}</b><br /><small className="adm-muted">{n.author} · {when(n.createdAt)}</small></span></div>) : <span className="adm-muted">یادداشتی ثبت نشده.</span>}</section>
        <section className="adm-card"><h2>اطلاعات تماس</h2><dl className="adm-dl"><dt>موبایل</dt><dd><Ph p={u.phone} /></dd><dt>ایمیل</dt><dd dir="ltr">{u.email ?? '—'}</dd></dl></section>
        <section className="adm-card"><h2>آدرس‌ها</h2>{u.addresses.length ? u.addresses.map((a: any) => <div key={a.id} className="adm-sec"><span>{a.recipient} — {a.province}، {a.city}، {a.line}{a.isDefault ? ' (پیش‌فرض)' : ''}</span></div>) : <span className="adm-muted">آدرسی ثبت نشده.</span>}</section>
        <section className="adm-card"><h2>نظرات</h2>{u.reviews.length ? u.reviews.map((r: any) => <div key={r.id} className="adm-sec"><span>{r.product} · {fa(r.rating)}★</span><StatusBadge map={REVIEW} value={r.status} /></div>) : <span className="adm-muted">نظری ثبت نشده.</span>}</section>
      </div>
    </div>
  </>;
}
