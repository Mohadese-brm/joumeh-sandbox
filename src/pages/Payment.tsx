import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { api, type Order } from '../lib/api';
import { faDigits, formatPrice } from '../lib/format';
import { Placeholder, Stub } from '../components/Stub';
import { Steps } from './Checkout';
// PLACEHOLDER: payment step is NOT designed (CU-18/19/20; handoff README "Missing for development"). BD-01: MockProvider only.
export function Payment() {
  const [sp] = useSearchParams(); const id = sp.get('order'); const nav = useNavigate();
  const o = useApi<Order>(id ? `/orders/${id}` : null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const pay = async (outcome: 'success' | 'failure') => {
    setBusy(true); setMsg('');
    try { const s = await api<{ ref: string }>(`/orders/${id}/payment`, { method: 'POST' });
      const r = await api<{ paymentStatus: string }>('/payments/mock/complete', { method: 'POST', body: { ref: s.data.ref, outcome } });
      if (r.data.paymentStatus === 'paid') nav(`/checkout/confirmation/${id}`); else { setMsg('پرداخت ناموفق بود (آزمایشی). سفارش پرداخت‌نشده باقی ماند.'); o.reload(); } }
    catch { setMsg('شروع پرداخت انجام نشد.'); } finally { setBusy(false); }
  };
  return (
    <div className="wrap checkout"><Steps current={3} />
      <Placeholder title="پرداخت" figma="CU-18 / CU-19 / CU-20 — Missing">
        <Stub code="BD-01">درگاه پرداخت (شاپرک) انتخاب نشده است. فقط پرداخت آزمایشی (MockProvider) فعال است؛ هیچ پولی جابه‌جا نمی‌شود.</Stub>
        {!id || o.error ? <p className="err">سفارش پیدا نشد. <Link to="/account/orders">سفارش‌های من</Link></p> : o.data && <>
          <p>سفارش <bdi>{faDigits(o.data.orderNumber)}</bdi> · مبلغ اقلام: <strong>{formatPrice(o.data.total)}</strong> <span className="caption muted">(بدون ارسال و مالیات — BD-02/BD-06)</span></p>
          {o.data.paymentStatus === 'paid' ? <Link className="btn btn--primary" to={`/checkout/confirmation/${id}`}>مشاهده‌ی تأیید سفارش</Link> : <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn--primary" disabled={busy} onClick={() => pay('success')}>پرداخت آزمایشی موفق</button>
            <button className="btn btn--outline" disabled={busy} onClick={() => pay('failure')}>شبیه‌سازی پرداخت ناموفق</button></div>}
          {msg && <p className="err" role="alert">{msg}</p>}
        </>}
      </Placeholder>
    </div>
  );
}
export function Confirmation({ id }: { id: string }) {
  const o = useApi<Order>(`/orders/${id}`);
  return (
    <div className="wrap checkout">
      <Placeholder title="سفارش ثبت شد" figma="order confirmation — Missing">
        {o.data ? <>
          <p>شماره سفارش: <bdi>{faDigits(o.data.orderNumber)}</bdi> <span className="caption muted">(قالب شماره در انتظار تصمیم — BD-11)</span></p>
          <p className="small">وضعیت پرداخت: {o.data.paymentStatus === 'paid' ? 'پرداخت‌شده (آزمایشی)' : 'پرداخت‌نشده'} · وضعیت سفارش: {o.data.orderStatus === 'processing' ? 'در حال پردازش' : o.data.orderStatus}</p>
          <Stub code="BD-03/BD-13">زمان تحویل و پیامک تأیید سفارش تعیین نشده‌اند.</Stub>
          <Link className="btn btn--primary" to={`/account/orders/${id}`}>مشاهده‌ی سفارش</Link>
        </> : o.error ? <p className="err">سفارش پیدا نشد.</p> : <p aria-busy="true">…</p>}
      </Placeholder>
    </div>
  );
}
