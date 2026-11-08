import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { api, ApiError, type Address, type Order } from '../lib/api';
import { AddressFields, emptyAddr, type AddrValues } from '../components/AddressForm';
import { Summary } from './Cart';
import { Icon } from '../components/Icon';
import { flags } from '../config/flags';
import { faNumber, formatPrice } from '../lib/format';
import { SAMPLE_ORDERS_BLOCKED } from '../lib/siteMode';
import { StoreContact } from '../components/StoreContact';
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
  const [errors, setErrors] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [fail, setFail] = useState('');
  const [saved, setSaved] = useState<Address[]>([]); const [picked, setPicked] = useState<number | 'new'>('new');
  const [confirmed, setConfirmed] = useState<AddrValues | null>(null);
  useEffect(() => { void refreshCart(); }, [refreshCart]);
  useEffect(() => {
    if (!user) return;
    api<Address[]>('/addresses').then(r => {
      setSaved(r.data);
      const d = r.data.find(a => a.isDefault) ?? r.data[0];
      if (d) { setPicked(d.id); setV({ recipient: d.recipient, phone: d.phone, province: d.province, city: d.city, line: d.line, postalCode: d.postalCode, landline: d.landline ?? '' }); }
    }).catch(() => {});
  }, [user]);
  const editAddress = (next: AddrValues) => { setV(next); setConfirmed(null); };
  const chooseSaved = (a: Address) => {
    setPicked(a.id); setErrors({});
    setV({ recipient: a.recipient, phone: a.phone, province: a.province, city: a.city, line: a.line, postalCode: a.postalCode, landline: a.landline ?? '' });
    setConfirmed(null);
  };
  const confirmAddress = () => {
    const latin = (s: string) => s.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s+/g, '');
    const f: Record<string, string> = {};
    if (!v.recipient.trim()) f.recipient = 'نام و نام خانوادگی را وارد کنید';
    if (!v.province) f.province = 'استان را انتخاب کنید';
    if (!v.city.trim()) f.city = 'شهر را انتخاب کنید';
    if (!v.line.trim()) f.line = 'نشانی کامل را وارد کنید';
    if (!/^09\d{9}$/.test(latin(v.phone))) f.phone = 'شماره موبایل معتبر نیست';
    if (!/^\d{10}$/.test(latin(v.postalCode))) f.postalCode = 'کد پستی باید ۱۰ رقم باشد';
    setErrors(f);
    if (Object.keys(f).length) { setConfirmed(null); setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); return; }
    setConfirmed({ ...v });
  };
  if (!cart || cart.items.length === 0) return <div className="wrap state" style={{ paddingBlock: 64 }}><h1 className="h-page">سبد خرید شما خالی است</h1><Link to="/" className="btn btn--primary">بازگشت به فروشگاه</Link></div>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setFail('');
    if (cart.ordersBlocked) { setFail(SAMPLE_ORDERS_BLOCKED); return; }
    if (!confirmed) { setFail('ابتدا آدرس را با دکمهٔ ثبت تأیید کنید.'); return; }
    if (!user) { openAuth(); return; }
    setBusy(true);
    const rate = flags.shippingRates.find(m => m.id === method);
    if (flags.shippingRates.length > 0 && !rate) { setErrors({ shippingMethodId: 'روش ارسال را انتخاب کنید' }); return; }
    try { const r = await api<Order>('/orders', { method: 'POST', body: { cartId: cart.cartId, address: confirmed, ...(rate ? { shippingMethodId: rate.id } : {}) } });
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
          <StoreContact />
          {cart.ordersBlocked && <p className="stub" role="note" data-testid="orders-blocked"><Icon name="danger-circle" size={20} /><span>{SAMPLE_ORDERS_BLOCKED}</span></p>}
          {authReady && !user && <p className="stub"><Icon name="information-circle" size={20} /><span><strong>برای ادامه وارد شوید.</strong> <button type="button" className="link" onClick={() => openAuth()}>ورود / ثبت‌نام</button></span></p>}
          {saved.length > 0 && <fieldset className="checkout__methods"><legend>انتخاب آدرس</legend>
            {saved.map(a => <label key={a.id} className="radio"><input type="radio" name="saved-address" checked={picked === a.id} onChange={() => chooseSaved(a)} /><span>{a.recipient} — {a.province}، {a.city}، {a.line}</span></label>)}
            <label className="radio"><input type="radio" name="saved-address" checked={picked === 'new'} onChange={() => { setPicked('new'); setConfirmed(null); setV(emptyAddr); }} /><span>آدرس جدید</span></label>
          </fieldset>}
          {!confirmed && (saved.length === 0 || picked === 'new') && <AddressFields v={v} set={editAddress} errors={errors} idp="co" />}
          {confirmed
            ? <p className="stub" role="status" data-testid="address-confirmed"><Icon name="tick" size={20} /><span>آدرس ثبت شد: {confirmed.recipient} — {confirmed.province}، {confirmed.city}، {confirmed.line}. <button type="button" className="link" onClick={() => setConfirmed(null)}>ویرایش</button></span></p>
            : <button type="button" className="btn btn--outline" data-testid="confirm-address" onClick={confirmAddress}>ثبت</button>}
          {confirmed && flags.shippingRates.length > 0 && <fieldset className="checkout__methods" aria-describedby={errors.shippingMethodId ? 'm-e' : undefined}>
            <legend>هزینه ارسال</legend>
            {flags.shippingRates.map(m => <label key={m.id} className="radio"><input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} aria-invalid={!!errors.shippingMethodId} /><span>{m.label} — {formatPrice(m.fee)}</span></label>)}
            {errors.shippingMethodId && <p className="err" id="m-e">{errors.shippingMethodId}</p>}
          </fieldset>}
        </section>
        <Summary cart={cart} title="خلاصه‌ی سفارش" shippingFee={flags.shippingRates.find(m => m.id === method)?.fee ?? null}>
          {fail && <p className="err" role="alert">{fail}</p>}
          <button className="btn btn--primary btn--block" disabled={busy || !!cart.ordersBlocked || !confirmed}>{cart.ordersBlocked ? 'ثبت سفارش غیرفعال (نمونه)' : !confirmed ? 'ابتدا آدرس را ثبت کنید' : busy ? 'در حال ثبت…' : 'ادامه و پرداخت'}</button>
        </Summary>
      </form>
    </div>
  );
}
