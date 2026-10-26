// Figma Orders 180:33841 (List 180:24895, Detail · Paid 180:26696, Cancel modal 180:30099, Change status 291:56417).
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLoad } from './hooks';
import { aapi, AdminApiError } from '../api';
import { FiltersRow } from './Products';
import { Ph, Badge, MCard, MList, useMobile, Banner, Overflow, Button, Confirm, Empty, ErrorState, Field, Loading, Modal, NoPermission, ORDER_STATUS, PAY_STATUS, PageTitle, StatusBadge, Stub, Table, Tabs, fa, toast, toman, when } from '../ui';
import { faNumber } from '../../lib/format';
import { useMe, can } from '../AdminApp';

const TABS: [string, string][] = [['', 'همه'], ['pending', 'در انتظار پرداخت'], ['processing', 'در حال پردازش'], ['shipped', 'ارسال شده'], ['delivered', 'تحویل داده شده'], ['cancelled', 'لغو شده']];
export function OrdersList() {
  const me = useMe(); const nav = useNavigate(); const [sp] = useSearchParams(); const mobile = useMobile();
  const [status, setStatus] = useState(''); const [q, setQ] = useState(sp.get('q') ?? '');
  const { data, extra, error, loading, reload } = useLoad<any[]>(can(me, 'orders') ? `/orders?${new URLSearchParams({ status, q })}` : null);
  if (!can(me, 'orders')) return <NoPermission crumb="فروش و عملیات / سفارش‌ها" title="سفارش‌ها" />;
  const counts = extra?.counts ?? {}; const all = Object.values(counts).reduce((a: number, b) => a + (b as number), 0) as number;
  return <>
    <PageTitle crumb="فروش و عملیات / سفارش‌ها" title="سفارش‌ها" sub={`${faNumber(all)} سفارش · داده نمونه`}
      actions={<Button ico="Download" disabled title="خروجی فایل در نسخه‌ی نمایشی نیست">خروجی (نمونه اولیه)</Button>} />
    <Tabs items={TABS.map(([k, l]) => [k, l, k ? counts[k] ?? 0 : all])} value={status} onChange={setStatus} />
    <FiltersRow q={q} onQ={setQ} ph="شماره سفارش، نام یا موبایل مشتری…">
      <Field label="وضعیت"><select className="adm-select" value={status} onChange={e => setStatus(e.target.value)}>{TABS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="کانال"><select className="adm-select" disabled title="همه‌ی سفارش‌های نمونه از سایت است"><option>همه</option></select></Field>
    </FiltersRow>
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length ? <Empty title="سفارشی پیدا نشد">فیلترها را تغییر دهید.</Empty> : mobile
      ? <MList>{data.map(o => <OrderCard key={o.id} o={o} onClick={() => nav(`/admin/orders/${o.id}`)} />)}</MList> :
      <Table head={['سفارش', 'تاریخ', 'مشتری', 'کانال (نمونه)', 'اقلام', 'مبلغ (تومان)', 'پرداخت', 'ارسال', 'وضعیت سفارش']}>
        {data.map(o => <tr key={o.id} className="click" onClick={() => nav(`/admin/orders/${o.id}`)}>
          <td style={{ color: 'var(--a-brand)', fontWeight: 600 }}>{fa(o.orderNumber)}</td><td className="adm-muted">{when(o.createdAt)}</td><td>{o.customer}<br /><small className="adm-muted"><Ph p={o.phone} /></small></td>
          <td title="داده نمونه — همه‌ی سفارش‌های نمونه از سایت است">سایت <small className="adm-muted">(نمونه)</small></td><td>{faNumber(o.items)} قلم</td><td>{toman(o.total)}</td><td><StatusBadge map={PAY_STATUS} value={o.paymentStatus} /></td><td><Fulfil s={o.orderStatus} /></td><td><StatusBadge map={ORDER_STATUS} value={o.orderStatus} /></td></tr>)}
      </Table>}
  </>;
}

/** Figma 180:30160 mobile order card: «سفارش ۱۰۱۲۴» + amount · «سارا م. · سایت» + time · badges. */
export function OrderCard({ o, onClick }: { o: any; onClick?: () => void }) {
  return <MCard onClick={onClick} label={`سفارش ${fa(o.orderNumber)}`}>
    <div className="adm-mrow"><b style={{ color: 'var(--a-brand)' }}>سفارش {fa(o.orderNumber)}</b><b>{toman(o.total)} تومان</b></div>
    <div className="adm-mrow"><span className="adm-muted">{o.customer} · سایت</span><small className="adm-muted">{when(o.createdAt)}</small></div>
    <div className="adm-mrow"><span className="adm-badges"><StatusBadge map={PAY_STATUS} value={o.paymentStatus} /><StatusBadge map={ORDER_STATUS} value={o.orderStatus} /></span></div>
  </MCard>;
}

/** «ارسال» (fulfilment) badge derived from order status — carrier data is BD-23. */
const Fulfil = ({ s }: { s: string }) => s === 'delivered' ? <Badge tone="success">تحویل شده</Badge> : s === 'shipped' ? <Badge tone="info">ارسال شده</Badge> : s === 'cancelled' ? <Badge tone="neutral">—</Badge> : <Badge tone="warning">ارسال نشده</Badge>;
const NEXT_LABEL: Record<string, string> = { processing: 'شروع آماده‌سازی', shipped: 'ثبت ارسال', delivered: 'ثبت تحویل' };
const STEPS = ['placed', 'processing', 'shipped', 'delivered'];
const STEP_LABEL: Record<string, string> = { placed: 'ثبت سفارش', processing: 'در حال پردازش', shipped: 'ارسال شده', delivered: 'تحویل داده شده', cancelled: 'لغو شده' };
export function OrderDetail() {
  const { id } = useParams(); const me = useMe(); const mobile = useMobile();
  const { data: o, extra, error, loading, reload, setData } = useLoad<any>(can(me, 'orders') ? `/orders/${id}` : null);
  const [ask, setAsk] = useState<string | null>(null); const [reason, setReason] = useState(''); const [desc, setDesc] = useState(''); const [rErr, setRErr] = useState(''); const [note, setNote] = useState('');
  if (!can(me, 'orders')) return <NoPermission crumb="فروش و عملیات / سفارش‌ها" title="سفارش‌ها" />;
  if (loading && !o) return <Loading />; if (error) return error.status === 404 ? <Empty title="سفارش پیدا نشد" /> : <ErrorState retry={reload} />;
  const edit = can(me, 'orders', 'edit');
  const change = async (to: string) => {
    setRErr('');
    try { const r = await aapi(`/orders/${id}/status`, { method: 'POST', body: { status: to, reason: to === 'cancelled' ? (reason ? (desc.trim() ? `${reason} — ${desc.trim()}` : reason) : '') : reason } }); setData(r.data); setAsk(null); setReason(''); toast(`وضعیت سفارش: ${ORDER_STATUS[to][0]}`); }
    catch (e) { const er = e as AdminApiError; if (er.fields?.reason) setRErr(er.fields.reason); else { setAsk(null); toast(er.code === 'invalid_transition' ? 'این تغییر وضعیت مجاز نیست؛ صفحه به‌روز شد' : 'تغییر وضعیت انجام نشد', true); reload(); } }
  };
  const addNote = async () => { try { const r = await aapi(`/orders/${id}/notes`, { method: 'POST', body: { body: note } }); setData(r.data); setNote(''); toast('یادداشت ثبت شد'); } catch { toast('ثبت یادداشت انجام نشد', true); } };
  const next = o.allowed.find((s: string) => s !== 'cancelled');
  const done = new Set(o.events.map((e: any) => e.status)); const evAt = (s: string) => o.events.find((e: any) => e.status === s);
  const a = o.address ?? {};
  return <>
    <PageTitle crumb={`فروش و عملیات / سفارش‌ها / سفارش ${fa(o.orderNumber)}`} title={`سفارش ${fa(o.orderNumber)}`} sub={`${when(o.createdAt)} · سایت`}
      actions={<>{edit && next && !mobile && <Button kind="primary" onClick={() => setAsk(next)}>{NEXT_LABEL[next]}</Button>}
        {edit && <Overflow button="secondary" label="بیشتر" items={[{ label: 'لغو سفارش', danger: true, disabled: !o.allowed.includes('cancelled'), hint: o.allowed.includes('cancelled') ? undefined : 'در این وضعیت مجاز نیست', onClick: () => { setRErr(''); setReason(''); setDesc(''); setAsk('cancelled'); } }]} />}
        <Button ico="DocumentDownload1" disabled title="ADMIN-PH-INVOICE">چاپ فاکتور (نمونه اولیه)</Button></>} />
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><StatusBadge map={PAY_STATUS} value={o.paymentStatus} /><StatusBadge map={ORDER_STATUS} value={o.orderStatus} /></div>
    {mobile && <div className="adm-mactions">{edit && next && <Button kind="primary" onClick={() => setAsk(next)}>{NEXT_LABEL[next]}</Button>}
      {o.phone && <a className="adm-btn secondary" href={`tel:${o.phone}`}>تماس با مشتری</a>}</div>}
    <div className="adm-grid2">
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="adm-card"><h2>اقلام سفارش</h2>
          {mobile ? <MList>{o.lines.map((l: any) => <div key={l.id} className="adm-mrow" style={{ flexWrap: 'nowrap' }}><div className="adm-prod">{l.imageUrl ? <img src={l.imageUrl} alt="" /> : <span className="adm-thumb" />}<div><b>{l.name}</b><small>{l.color} · {faNumber(l.quantity)} عدد · {fa(l.size)}</small></div></div><span className="nw">{toman(l.unitPrice * l.quantity)}</span></div>)}</MList> :
          <Table head={['محصول', 'تنوع', 'تعداد', 'قیمت واحد', 'جمع']}>{o.lines.map((l: any) => <tr key={l.id}>
            <td><div className="adm-prod">{l.imageUrl ? <img src={l.imageUrl} alt="" /> : <span className="adm-thumb" />}<div><b>{l.name}</b><small dir="ltr">{l.sku}</small></div></div></td>
            <td>{l.color} · {l.size}</td><td>{faNumber(l.quantity)}</td><td>{toman(l.unitPrice)}</td><td>{toman(l.unitPrice * l.quantity)}</td></tr>)}</Table>}
          <dl className="adm-dl"><dt>جمع اقلام</dt><dd>{toman(o.subtotal)}</dd><dt>تخفیف</dt><dd>{o.discount ? toman(o.discount) : '—'}</dd>
            <dt>هزینه ارسال</dt><dd>{o.shippingFee == null ? <Stub code="BD-02" /> : toman(o.shippingFee)}</dd><dt>مالیات بر ارزش افزوده</dt><dd>{o.vatAmount == null ? <Stub code="BD-06" /> : toman(o.vatAmount)}</dd>
            <dt><b>مبلغ پرداختی</b></dt><dd><b>{toman(o.total)} تومان (نمونه)</b></dd></dl></section>
        <section className="adm-card"><h2>مشتری و آدرس</h2>
          <dl className="adm-dl"><dt>نام</dt><dd>{o.customer}</dd><dt>موبایل</dt><dd><Ph p={o.phone} /></dd><dt>آدرس</dt><dd>{[a.province, a.city, a.line].filter(Boolean).join('، ')}</dd><dt>کد پستی</dt><dd>{fa(a.postalCode ?? '—')}</dd></dl>
          {o.userId && can(me, 'customers') && <Link className="adm-btn sm" to={`/admin/customers/${o.userId}`}>مشاهده پروفایل مشتری</Link>}</section>
        <section className="adm-card"><h2>یادداشت داخلی</h2>
          {edit && <><Field label="یادداشت (فقط برای تیم)"><textarea className="adm-textarea" placeholder="یادداشت داخلی بنویسید…" value={note} onChange={e => setNote(e.target.value)} maxLength={1000} /></Field>
            <div><Button kind="primary" disabled={!note.trim()} onClick={addNote}>ثبت یادداشت</Button></div></>}
          {o.notes.length ? o.notes.map((n: any) => <div key={n.id} className="adm-sec"><span><b>{n.body}</b><br /><small className="adm-muted">{n.author} · {when(n.createdAt)}</small></span></div>) : <span className="adm-muted">یادداشتی ثبت نشده.</span>}</section>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="adm-card"><h2>پرداخت</h2><dl className="adm-dl"><dt>وضعیت</dt><dd><StatusBadge map={PAY_STATUS} value={o.paymentStatus} /></dd><dt>درگاه</dt><dd><Stub code="BD-01" /></dd><dt>مبلغ</dt><dd>{toman(o.total)}</dd></dl></section>
        <section className="adm-card"><h2>ارسال</h2><dl className="adm-dl"><dt>روش ارسال</dt><dd>{o.shippingMethod ?? <Stub code="BD-02" />}</dd><dt>کد رهگیری</dt><dd><Stub code="BD-23" /></dd></dl></section>
        <section className="adm-card"><h2>روند سفارش</h2><ol className="adm-timeline">
          {(o.orderStatus === 'cancelled' ? ['placed', ...o.events.filter((e: any) => e.status !== 'placed').map((e: any) => e.status)] : STEPS).map((s: string) => { const e = evAt(s);
            return <li key={s} className={done.has(s) || (s === 'placed') ? '' : 'todo'}><span className="dot" /><span><b>{STEP_LABEL[s] ?? s}</b><br /><small className="adm-muted">{e ? `${when(e.createdAt)} · ${e.actor}` : '—'}</small></span></li>; })}
        </ol></section>
      </div>
    </div>
    {ask && ask !== 'cancelled' && <Confirm title="تغییر وضعیت سفارش؟" body={<>وضعیت از «{ORDER_STATUS[o.orderStatus][0]}» به «{ORDER_STATUS[ask][0]}» تغییر می‌کند. اطلاع‌رسانی پیامکی به مشتری: <Stub code="BD-13" /></>} okLabel="تأیید" onOk={() => change(ask)} onClose={() => setAsk(null)} />}
    {ask === 'cancelled' && <Modal title={`لغو سفارش ${fa(o.orderNumber)}`} onClose={() => setAsk(null)} foot={<><Button kind="danger" ico="CloseCircle" onClick={() => change('cancelled')}>لغو سفارش</Button><Button kind="secondary" ico="CloseTeal" onClick={() => setAsk(null)}>انصراف</Button></>}>
      <p style={{ margin: 0 }}>سفارش {fa(o.orderNumber)} لغو می‌شود. این کار در سوابق سیستم ثبت می‌شود.</p>
      <Field label="دلیل (الزامی)" req err={rErr}><select className={`adm-select${rErr ? ' bad' : ''}`} value={reason} onChange={e => setReason(e.target.value)} aria-label="دلیل لغو">
        <option value="">انتخاب کنید</option>{(extra?.cancelReasons ?? []).map((r: string) => <option key={r} value={r}>{r}</option>)}</select></Field>
      <Field label="توضیح (اختیاری)"><textarea className="adm-textarea" value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} /></Field>
      <Banner tone="warning">فهرست دلایل نمونه است. قوانین لغو و بازپرداخت در انتظار تصمیم کسب‌وکار است (BD-05 / BD-01)؛ در این نسخه بازپرداخت خودکار انجام نمی‌شود.</Banner></Modal>}
    <span className="adm-muted">{extra && 'انتقال‌های مجاز وضعیت: نمونه، در انتظار تصمیم (BD-05 / BD-23).'}</span>
  </>;
}
