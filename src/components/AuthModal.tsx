import { useState } from 'react';
import { Modal } from './Modal';
import { useStore } from '../lib/store';
import { api, ApiError, type User } from '../lib/api';
import { faDigits } from '../lib/format';

const ERR: Record<string, string> = {
  invalid_phone: 'شماره موبایل معتبر نیست. نمونه: ۰۹۱۲۳۴۵۶۷۸۹', rate_limited: 'تعداد درخواست‌ها زیاد است. چند دقیقه‌ی دیگر دوباره تلاش کنید.',
  wrong_code: 'کد واردشده درست نیست.', code_expired: 'کد منقضی شده است. کد جدید بگیرید.', too_many_attempts: 'تلاش‌های ناموفق زیاد بود. کد جدید بگیرید.',
  invalid_body: 'کد ۵ رقمی را کامل وارد کنید.', no_pending_code: 'کد جدید بگیرید.',
};
export function AuthModal() {
  const { authOpen, closeAuth, setSession, afterAuth, toast } = useStore();
  const [tab, setTab] = useState<'mobile' | 'email'>('mobile');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState(''); const [code, setCode] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [devCode, setDevCode] = useState<string | null>(null);
  if (!authOpen) return null;
  const close = () => { setStep('phone'); setCode(''); setErr(''); setDevCode(null); closeAuth(); };
  const request = async (e?: React.FormEvent) => {
    e?.preventDefault(); setErr(''); setBusy(true);
    try { const r = await api<{ devCode?: string }>('/auth/otp/request', { method: 'POST', body: { phone } }); setDevCode(r.data.devCode ?? null); setStep('code'); }
    catch (x) { setErr(ERR[(x as ApiError).code] ?? 'خطایی رخ داد. دوباره تلاش کنید.'); } finally { setBusy(false); }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const r = await api<{ token: string; user: User }>('/auth/otp/verify', { method: 'POST', body: { phone, code } });
      setSession(r.data.token, r.data.user); const after = afterAuth; close(); toast('وارد شدید'); after?.(); }
    catch (x) { setErr(ERR[(x as ApiError).code] ?? 'خطایی رخ داد. دوباره تلاش کنید.'); } finally { setBusy(false); }
  };
  return (
    <Modal title="ورود" onClose={close} labelId="auth-title">
      <div role="tablist" aria-label="روش ورود" className="tabs">
        <button role="tab" id="t-m" aria-selected={tab === 'mobile'} aria-controls="p-m" className="tab" onClick={() => setTab('mobile')}>استفاده از موبایل</button>
        <button role="tab" id="t-e" aria-selected={tab === 'email'} aria-controls="p-e" className="tab" onClick={() => setTab('email')}>استفاده از ایمیل</button>
      </div>
      {tab === 'mobile' ? (
        <div role="tabpanel" id="p-m" aria-labelledby="t-m">
          {step === 'phone' ? (
            <form onSubmit={request} className="auth__form" noValidate>
              <div className="field"><label htmlFor="phone">شماره موبایل</label>
                <input id="phone" className="input" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" value={phone} onChange={e => setPhone(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'auth-err' : undefined} /></div>
              {err && <p id="auth-err" className="err" role="alert">{err}</p>}
              <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'در حال ارسال…' : 'ادامه'}</button>
              <p className="small auth__alt">هنوز عضو نیستید؟ <span className="muted">با همین شماره ثبت‌نام می‌شوید.</span></p>
            </form>
          ) : (
            <form onSubmit={verify} className="auth__form" noValidate>
              {/* OTP entry step: inline-OTP screen (CU-16) is missing in design → system-consistent placeholder (flagged) */}
              <p className="small">کد ۵ رقمی ارسال‌شده به {faDigits(phone)} را وارد کنید. <button type="button" className="link" onClick={() => { setStep('phone'); setErr(''); }}>ویرایش شماره</button></p>
              <div className="field"><label htmlFor="otp">کد تأیید</label>
                <input id="otp" className="input" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={5} value={code} onChange={e => setCode(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'auth-err' : undefined} /></div>
              {devCode && <p className="stub" data-testid="dev-otp"><span><strong>SMS آزمایشی (BD-13، در انتظار تصمیم کسب‌وکار):</strong> پیامکی ارسال نشد. کد محلی: <bdi dir="ltr">{devCode}</bdi></span></p>}
              {err && <p id="auth-err" className="err" role="alert">{err}</p>}
              <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'در حال بررسی…' : 'ورود'}</button>
              <button type="button" className="link" onClick={() => request()}>ارسال دوباره‌ی کد</button>
            </form>
          )}
        </div>
      ) : (
        <div role="tabpanel" id="p-e" aria-labelledby="t-e" className="auth__form">
          <p className="stub"><span><strong>ورود با ایمیل — در انتظار تصمیم کسب‌وکار (BD-21).</strong> فعلاً از ورود با موبایل استفاده کنید.</span></p>
          <button className="btn btn--outline btn--block" onClick={() => setTab('mobile')}>ورود با موبایل</button>
        </div>
      )}
    </Modal>
  );
}
