import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { api, ApiError, type Address, type Order } from '../lib/api';
import { AddressFields, emptyAddr, type AddrValues } from '../components/AddressForm';
import { Summary } from './Cart';
import { Stub } from '../components/Stub';
import { Icon } from '../components/Icon';
import { faNumber } from '../lib/format';
import { SAMPLE_ORDERS_BLOCKED } from '../lib/siteMode';
import './Checkout.css';

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const s = ['سبد خرید', 'اطلاعات ارسال', 'پرداخت'];
  return <ol className="steps" aria-label="مراحل خرید">{s.map((l, i) => (
    <li key={l} className={i + 1 < current ? 'done' : i + 1 === current ? 'cur' : ''} aria-current={i + 1 === current ? 'step' : undefined}>
      <span className="steps__n">{i + 1 < current ? <Icon name="tick" size={16} /> : faNumber(i + 1)}</span><span>{l}</span></li>))}</ol>;
}
export function Checkout() {
  const { cart, user, authReady, openAuth, refreshCart } = useStore(); const nav = useNavigate();
  const [v, setV] = useState<AddrValues>(emptyAddr); const [method, setMethod] = useState('');
  const [methods, setMethods] = useState<{ id: string; label: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [fail, setFail] = useState('');
  useEffect(() => { void refreshCart(); api<{ id: string; label: string }[]>('/shipping-methods').then(r => setMethods(r.data)).catch(() => setFail('روش‌های ارسال بارگذاری نشد.')); }, [refreshCart]);
  useEffect(() => {
    if (!user) return;
    api<Address[]>('/addresses').then(r => { const d = r.data.find(a => a.isDefault) ?? r.data[0];
      if (d) setV({ recipient: d.recipient, phone: d.phone, province: d.province, city: d.city, line: d.line, postalCode: d.postalCode, landline: d.landline ?? '' }); }).catch(() => {});
  }, [user]);
  if (!cart || cart.items.length === 0) return <div className="wrap state" style={{ paddingBlock: 64 }}><h1 className="h-page">سبد خرید شما خالی است</h1><Link to="/" className="btn btn--primary">بازگشت به فروشگاه</Link></div>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setFail('');
    if (cart.ordersBlocked) { setFail(SAMPLE_ORDERS_BLOCKED); return; }
    if (!user) { openAuth(); return; }
    setBusy(true);
    try { const r = await api<Order>('/orders', { method: 'POST', body: { cartId: cart.cartId, address: v, shippingMethodId: method } });
      await refreshCart(); nav(`/checkout/payment?order=${r.data.id}`); }
    catch (x) { const er = x as ApiError; if (er.fields) { setErrors(er.fields); setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); } else setFail(er.code === 'sample_mode' ? SAMPLE_ORDERS_BLOCKED : 'ثبت سفارش انجام نشد. دوباره تلاش کنید.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="wrap checkout">
      <Steps current={2} />
      <form className="checkout__grid" onSubmit={submit} noValidate>
        <section className="card checkout__form" aria-labelledby="ship-h">
          <h1 id="ship-h" className="h-section">اطلاعات ارسال</h1>
          {cart.ordersBlocked && <p className="stub" role="note" data-testid="orders-blocked"><Icon name="danger-circle" size={20} /><span>{SAMPLE_ORDERS_BLOCKED}</span></p>}
          {authReady && !user && <p className="stub"><Icon name="information-circle" size={20} /><span><strong>برای ادامه وارد شوید.</strong> خرید مهمان در انتظار تصمیم کسب‌وکار است (BD-07). <button type="button" className="link" onClick={() => openAuth()}>ورود / ثبت‌نام</button></span></p>}
          <AddressFields v={v} set={setV} errors={errors} idp="co" />
          <fieldset className="checkout__methods" aria-describedby={errors.shippingMethodId ? 'm-e' : undefined}>
            <legend>روش ارسال <span className="tag-sample">داده نمونه</span></legend>
            {methods.map(m => <label key={m.id} className="radio"><input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} aria-invalid={!!errors.shippingMethodId} /><span>{m.label}</span></label>)}
            {errors.shippingMethodId && <p className="err" id="m-e">{errors.shippingMethodId}</p>}
            <Stub code="BD-02/BD-03/BD-24">روش‌ها، هزینه، زمان تحویل، پرداخت در محل و تحویل حضوری تأیید نشده‌اند؛ گزینه‌ها نمونه‌ی فیگما هستند.</Stub>
          </fieldset>
        </section>
        <Summary cart={cart} title="خلاصه‌ی سفارش">
          {fail && <p className="err" role="alert">{fail}</p>}
          <button className="btn btn--primary btn--block" disabled={busy || !!cart.ordersBlocked}>{cart.ordersBlocked ? 'ثبت سفارش غیرفعال (نمونه)' : busy ? 'در حال ثبت…' : 'ادامه و پرداخت'}</button>
        </Summary>
      </form>
    </div>
  );
}
