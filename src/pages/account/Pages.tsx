import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../lib/useApi';
import { useStore } from '../../lib/store';
import { api, ApiError, type Address, type Order, type Product, type ReturnReq, type User } from '../../lib/api';
import { faDigits, faNumber, formatDate, formatPhone, formatPrice } from '../../lib/format';
import { Chip, Empty, ErrorCard, ListSkeleton, ORDER_STATUS, RETURN_STATUS } from './common';
import { ProductGrid } from '../../components/Grid';
import { Modal } from '../../components/Modal';
import { Stub, Placeholder } from '../../components/Stub';
import { Icon } from '../../components/Icon';
import { AddressFields, emptyAddr, type AddrValues } from '../../components/AddressForm';

const Thumbs = ({ o }: { o: Order }) => <span className="thumbs">{o.items.slice(0, 3).map((i, k) => <img key={k} src={i.imageUrl} alt="" width={32} height={40} />)}</span>;
function OrderCard({ o, h = 'h3' }: { o: Order; h?: 'h2' | 'h3' }) {
  const H = h;
  return (
    <article className="card ocard">
      <div className="ocard__top"><div><H style={{ fontSize: 16 }}>سفارش <bdi>{faDigits(o.orderNumber)}</bdi></H><p className="caption muted">{formatDate(o.createdAt)}</p></div><Chip s={o.orderStatus} map={ORDER_STATUS} /></div>
      <div className="ocard__bottom"><div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Thumbs o={o} /><div className="mini"><p className="caption muted">مبلغ کالاها</p><p><strong>{formatPrice(o.total)}</strong></p></div></div>
        <Link to={`/account/orders/${o.id}`} className="link" aria-label={`مشاهده جزئیات سفارش ${faDigits(o.orderNumber)}`}>مشاهده جزئیات</Link></div>
    </article>
  );
}
export function Overview() {
  const { user, favorites } = useStore();
  const orders = useApi<Order[]>('/orders'); const addrs = useApi<Address[]>('/addresses');
  const name = user?.firstName; const def = addrs.data?.find(a => a.isDefault);
  return (<>
    <section className="card"><h2 style={{ fontSize: 22 }}>{name ? `خوش آمدید، ${name}` : 'خوش آمدید'}</h2><p className="small muted" style={{ margin: 0 }}>سفارش‌ها، آدرس‌ها و اطلاعات حسابتان را از اینجا مدیریت کنید.</p></section>
    <h2 style={{ fontSize: 18 }}>آخرین سفارش</h2>
    {orders.loading ? <ListSkeleton n={1} /> : orders.error ? <ErrorCard onRetry={orders.reload} /> : orders.data!.length ? <OrderCard o={orders.data![0]} /> : <Empty title="هنوز سفارشی ندارید" text="پس از اولین خرید، سفارش اینجا نمایش داده می‌شود." cta={['/women', 'شروع خرید']} />}
    <div className="acc__cards">
      <Link to="/account/favorites" className="card mini" style={{ color: 'inherit', textDecoration: 'none' }}><h3 style={{ fontSize: 16, display: 'flex', gap: 8 }}><Icon name="heart-1" size={20} />علاقه‌مندی‌ها</h3><p className="caption muted">{faNumber(favorites.size)} کالا</p></Link>
      <Link to="/account/addresses" className="card mini" style={{ color: 'inherit', textDecoration: 'none' }}><h3 style={{ fontSize: 16 }}>آدرس پیش‌فرض</h3><p className="caption muted">{def ? `${def.province}، ${def.city} — ${def.recipient}` : 'آدرسی ثبت نشده است'}</p></Link>
    </div>
  </>);
}
export function Orders() {
  const r = useApi<Order[]>('/orders');
  return (<>
    <div className="acc__sub"><h2>سفارش‌های من</h2></div>
    {r.loading ? <ListSkeleton /> : r.error ? <ErrorCard onRetry={r.reload} /> : r.data!.length === 0 ? <Empty title="هنوز سفارشی ندارید" text="پس از اولین خرید، سفارش‌ها اینجا نمایش داده می‌شوند." cta={['/women', 'شروع خرید']} />
      : r.data!.map(o => <OrderCard key={o.id} o={o} />)}
    <p className="caption muted">شماره‌ی سفارش‌ها نمونه است؛ قالب نهایی در انتظار تصمیم کسب‌وکار (BD-11).</p>
  </>);
}
export function OrderDetail() {
  const { id } = useParams(); const r = useApi<Order>(`/orders/${id}`);
  if (r.loading) return <ListSkeleton n={2} />;
  if (r.error) return r.error === 404 ? <Empty title="سفارش پیدا نشد" text="این سفارش در حساب شما وجود ندارد." cta={['/account/orders', 'سفارش‌های من']} /> : <ErrorCard onRetry={r.reload} />;
  const o = r.data!;
  return (<>
    <div className="acc__sub"><h2>سفارش <bdi>{faDigits(o.orderNumber)}</bdi></h2><Link to="/account/orders" className="link">بازگشت به سفارش‌ها</Link></div>
    <section className="card"><dl className="kv">
      <div><dt>تاریخ</dt><dd>{formatDate(o.createdAt)}</dd></div>
      <div><dt>وضعیت سفارش</dt><dd><Chip s={o.orderStatus} map={ORDER_STATUS} /></dd></div>
      <div><dt>وضعیت پرداخت</dt><dd>{({ paid: 'پرداخت‌شده', unpaid: 'پرداخت‌نشده', failed: 'ناموفق', refunded: 'بازپرداخت‌شده' } as Record<string, string>)[o.paymentStatus]} <span className="caption muted">(BD-01: آزمایشی)</span></dd></div>
      <div><dt>وضعیت ارسال</dt><dd>{({ unfulfilled: 'ارسال‌نشده', shipped: 'ارسال‌شده', delivered: 'تحویل‌شده' } as Record<string, string>)[o.fulfilmentStatus]} <span className="caption muted">(منبع وضعیت تحویل: BD-23)</span></dd></div>
      <div><dt>نشانی</dt><dd>{o.address.province}، {o.address.city}، {o.address.line} — {o.address.recipient}</dd></div>
    </dl></section>
    <section className="card"><h3 style={{ fontSize: 16, marginBlockEnd: 12 }}>اقلام سفارش</h3><ul className="items">{o.items.map((i, k) => (
      <li key={k}><img src={i.imageUrl} alt="" width={56} height={70} /><div className="mini"><Link to={`/product/${i.slug}`} style={{ color: 'inherit', fontWeight: 700 }}>{i.name}</Link>
        <p className="caption muted">رنگ: {i.color} · سایز: {i.size} · تعداد: {faNumber(i.quantity)}</p><p className="small">{formatPrice(i.unitPrice * i.quantity)}</p></div></li>))}</ul></section>
    <section className="card"><dl className="kv">
      <div><dt>جمع کالاها</dt><dd>{formatPrice(o.subtotal)}</dd></div>
      {o.discount > 0 && <div><dt>تخفیف</dt><dd>{formatPrice(o.discount)}−</dd></div>}
      <div><dt>ارسال</dt><dd className="caption muted">در انتظار تصمیم (BD-02)</dd></div>
      <div><dt>مالیات</dt><dd className="caption muted">در انتظار تصمیم (BD-06)</dd></div>
      <div><dt>مبلغ کالاها</dt><dd><strong>{formatPrice(o.total)}</strong></dd></div>
    </dl></section>
    <Stub code="BD-05/BD-04">لغو سفارش و درخواست مرجوعی پس از تعیین سیاست‌ها فعال می‌شوند.</Stub>
    <p className="small">مشکلی در این سفارش دارید؟ <Link to="/account/support">پشتیبانی</Link></p>
  </>);
}
export function Returns() {
  const r = useApi<ReturnReq[]>('/returns');
  return (<>
    <div className="acc__sub"><h2>مرجوعی‌های من</h2></div>
    {r.loading ? <ListSkeleton n={2} /> : r.error ? <ErrorCard onRetry={r.reload} /> : r.data!.length === 0 ? <Empty title="درخواست مرجوعی ندارید" text="درخواست‌های مرجوعی شما اینجا نمایش داده می‌شوند." />
      : r.data!.map(x => (
        <article key={x.id} className="card ocard">
          <div className="ocard__top"><div><h3>درخواست مرجوعی {x.returnNumber}</h3><p className="caption muted">{formatDate(x.createdAt)} · سفارش <bdi>{faDigits(x.orderNumber)}</bdi></p></div><Chip s={x.status} map={RETURN_STATUS} /></div>
          <div className="ocard__bottom"><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="thumbs"><img src={x.imageUrl} alt="" width={32} height={40} /></span><span className="small">{x.productName}</span></div>
            <Link to={`/account/returns/${x.id}`} className="link" aria-label={`مشاهده جزئیات مرجوعی ${x.returnNumber}`}>مشاهده جزئیات</Link></div>
        </article>))}
    <p className="stub"><Icon name="information-circle" size={20} /><span>شرایط و مهلت مرجوعی: متن سیاست مرجوعی جومه پس از تأیید نهایی اینجا قرار می‌گیرد. (BD-04)</span></p>
  </>);
}
export function ReturnDetail() {
  const { id } = useParams(); const r = useApi<ReturnReq>(`/returns/${id}`);
  if (r.loading) return <ListSkeleton n={1} />;
  if (r.error) return <Empty title="درخواست پیدا نشد" text="این درخواست در حساب شما وجود ندارد." cta={['/account/returns', 'مرجوعی‌های من']} />;
  const x = r.data!;
  return (<>
    <div className="acc__sub"><h2>درخواست مرجوعی {x.returnNumber}</h2><Link to="/account/returns" className="link">بازگشت</Link></div>
    <section className="card"><dl className="kv">
      <div><dt>وضعیت</dt><dd><Chip s={x.status} map={RETURN_STATUS} /></dd></div>
      <div><dt>تاریخ درخواست</dt><dd>{formatDate(x.createdAt)}</dd></div>
      <div><dt>سفارش</dt><dd><Link to={`/account/orders/${x.orderId}`}><bdi>{faDigits(x.orderNumber)}</bdi></Link></dd></div>
      <div><dt>کالا</dt><dd>{x.productName}</dd></div>
      <div><dt>دلیل</dt><dd>{x.reason}</dd></div>
    </dl></section>
    <Stub code="BD-04">مراحل بررسی، بازپرداخت یا تعویض پس از تعیین سیاست مرجوعی نمایش داده می‌شوند.</Stub>
  </>);
}
export function Addresses() {
  const r = useApi<Address[]>('/addresses'); const { toast } = useStore();
  const [edit, setEdit] = useState<null | 'new' | Address>(null); const [del, setDel] = useState<Address | null>(null);
  const [v, setV] = useState<AddrValues>(emptyAddr); const [errors, setErrors] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  const open = (a: 'new' | Address) => { setErrors({}); setEdit(a); setV(a === 'new' ? emptyAddr : { recipient: a.recipient, phone: a.phone, province: a.province, city: a.city, line: a.line, postalCode: a.postalCode, landline: a.landline ?? '' }); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { const res = edit === 'new' ? await api<Address[]>('/addresses', { method: 'POST', body: v }) : await api<Address[]>(`/addresses/${(edit as Address).id}`, { method: 'PUT', body: v });
      r.setData(res.data); setEdit(null); toast('آدرس ذخیره شد'); }
    catch (x) { const er = x as ApiError; if (er.fields) { setErrors(er.fields); setTimeout(() => document.querySelector<HTMLElement>('.addr-form [aria-invalid="true"]')?.focus(), 0); } else toast('ذخیره انجام نشد'); }
    finally { setBusy(false); }
  };
  const act = async (path: string, method: string, msg: string) => { try { const res = await api<Address[]>(path, { method }); r.setData(res.data); toast(msg); } catch { toast('انجام نشد'); } };
  if (edit) return (
    <form className="card addr-form" onSubmit={save} noValidate style={{ display: 'grid', gap: 20 }}>
      <h2 style={{ fontSize: 22 }}>{edit === 'new' ? 'افزودن آدرس جدید' : 'ویرایش آدرس'}</h2>
      <AddressFields v={v} set={setV} errors={errors} idp="ad" />
      <div style={{ display: 'flex', gap: 12 }}><button className="btn btn--primary" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره آدرس'}</button><button type="button" className="btn btn--outline" onClick={() => setEdit(null)}>انصراف</button></div>
    </form>);
  return (<>
    <div className="acc__sub"><h2>آدرس‌ها</h2><button className="btn btn--outline" onClick={() => open('new')}>افزودن آدرس جدید</button></div>
    {r.loading ? <ListSkeleton n={2} /> : r.error ? <ErrorCard onRetry={r.reload} /> : r.data!.length === 0 ? <Empty title="آدرسی ثبت نکرده‌اید" text="برای خرید سریع‌تر، آدرس خود را اضافه کنید." />
      : r.data!.map(a => (
        <article key={a.id} className="card ocard">
          <div className="ocard__top"><h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{a.province}، {a.city}{a.isDefault ? <span className="chip">پیش‌فرض</span> : null}</h3>
            <div className="addr__actions">
              {!a.isDefault && <button className="btn btn--ghost small" onClick={() => act(`/addresses/${a.id}/default`, 'POST', 'آدرس پیش‌فرض تغییر کرد')}>انتخاب به‌عنوان پیش‌فرض</button>}
              <button className="btn btn--ghost small" onClick={() => open(a)} aria-label={`ویرایش آدرس ${a.city}`}>ویرایش</button>
              <button className="btn btn--danger-text small" onClick={() => setDel(a)} aria-label={`حذف آدرس ${a.city}`}>حذف</button></div></div>
          <p className="small" style={{ margin: 0 }}>{a.line}</p>
          <p className="caption muted" style={{ margin: 0 }}>کد پستی: {faDigits(a.postalCode)} · گیرنده: {a.recipient} · {formatPhone(a.phone)}</p>
        </article>))}
    {del && <Modal title="حذف آدرس" onClose={() => setDel(null)} labelId="del-title"><p>آدرس «{del.province}، {del.city}» حذف شود؟</p>
      <div className="acc__dlgact"><button className="btn btn--primary" onClick={async () => { await act(`/addresses/${del.id}`, 'DELETE', 'آدرس حذف شد'); setDel(null); }}>حذف</button><button className="btn btn--outline" onClick={() => setDel(null)}>انصراف</button></div></Modal>}
  </>);
}
export function Favorites() {
  const r = useApi<Product[]>('/favorites');
  return (<>
    <div className="acc__sub"><h2>علاقه‌مندی‌ها</h2></div>
    {r.loading ? <ListSkeleton n={2} /> : r.error ? <ErrorCard onRetry={r.reload} /> : r.data!.length === 0 ? <Empty title="فهرست علاقه‌مندی‌ها خالی است" text="با زدن آیکن قلب روی محصولات، آن‌ها را اینجا ذخیره کنید." cta={['/women', 'مشاهده محصولات']} />
      : <div className="acc__favs"><ProductGrid products={r.data!} onFavoriteToggled={() => void r.reload()} /></div>}
  </>);
}
export function PaymentInfo() {
  return (<>
    <div className="acc__sub"><h2>اطلاعات پرداخت</h2></div>
    <section className="card"><Stub code="BD-01">روش‌های پرداخت ذخیره‌شده به درگاه پرداخت وابسته‌اند و هنوز تعیین نشده‌اند. طراحی: Figma 125:4203.</Stub></section>
  </>);
}
export function Support() {
  return <Placeholder title="پشتیبانی" figma="Support 246:15454 — designed, outside this build's scope"><span className="small">کانال‌ها و زمان پاسخ‌گویی: در انتظار تصمیم کسب‌وکار (BD-12).</span></Placeholder>;
}
export function Settings() {
  const { user, refreshUser } = useStore();
  const [editing, setEditing] = useState(false); const [v, setV] = useState({ firstName: '', lastName: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({}); const [state, setState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const u = user as User;
  const start = () => { setV({ firstName: u.firstName ?? '', lastName: u.lastName ?? '', email: u.email ?? '' }); setErrors({}); setState('idle'); setEditing(true); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setState('saving'); setErrors({});
    try { await api('/me', { method: 'PATCH', body: v }); await refreshUser(); setEditing(false); setState('ok'); }
    catch (x) { const er = x as ApiError; if (er.fields) { setErrors(er.fields); setState('idle'); setTimeout(() => document.querySelector<HTMLElement>('.set-form [aria-invalid="true"]')?.focus(), 0); } else setState('error'); }
  };
  const field = (k: 'firstName' | 'lastName' | 'email', label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field"><label htmlFor={`s-${k}`}>{label}</label><input id={`s-${k}`} className="input" value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `s-${k}-e` : undefined} {...props} />
      {errors[k] && <p className="err" id={`s-${k}-e`}>{errors[k]}</p>}</div>);
  return (<>
    <div className="acc__sub"><h2>تنظیمات حساب</h2></div>
    {state === 'ok' && <p className="stub" role="status" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}><Icon name="tick" size={20} /><span>تغییرات ذخیره شد.</span></p>}
    {state === 'error' && <p className="stub" role="alert" style={{ background: 'var(--red-50)', color: 'var(--red-600)' }}><Icon name="danger-circle" size={20} /><span>ذخیره انجام نشد. دوباره تلاش کنید.</span></p>}
    <section className="card">
      <div className="acc__sub" style={{ marginBlockEnd: 16 }}><h3 style={{ fontSize: 16 }}>اطلاعات شخصی</h3>{!editing && <button className="btn btn--outline" onClick={start}>ویرایش</button>}</div>
      {editing ? (
        <form className="set-form" onSubmit={save} noValidate style={{ display: 'grid', gap: 16 }}>
          <div className="grid-2">{field('firstName', 'نام', { autoComplete: 'given-name' })}{field('lastName', 'نام خانوادگی', { autoComplete: 'family-name' })}{field('email', 'ایمیل', { type: 'email', dir: 'ltr', autoComplete: 'email' })}</div>
          <p className="caption muted" style={{ margin: 0 }}>تغییر شماره موبایل نیاز به تأیید دوباره دارد (Figma Re-verify 127:5544) و در این نسخه فعال نیست.</p>
          <div style={{ display: 'flex', gap: 12 }}><button className="btn btn--primary" disabled={state === 'saving'}>{state === 'saving' ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</button><button type="button" className="btn btn--outline" onClick={() => setEditing(false)}>انصراف</button></div>
        </form>
      ) : (
        <dl className="kv">
          <div><dt>نام</dt><dd>{u.firstName || '—'}</dd></div><div><dt>نام خانوادگی</dt><dd>{u.lastName || '—'}</dd></div>
          <div><dt>شماره موبایل</dt><dd><bdi dir="ltr">{formatPhone(u.phone)}</bdi> <span className="chip chip--green">تأییدشده</span></dd></div>
          <div><dt>ایمیل</dt><dd><bdi dir="ltr">{u.email || '—'}</bdi> {u.email && <span className="chip">{u.emailVerified ? 'تأییدشده' : 'تأییدنشده'}</span>} {u.email && !u.emailVerified && <span className="caption muted">(تأیید ایمیل: BD-21)</span>}</dd></div>
        </dl>)}
    </section>
  </>);
}
