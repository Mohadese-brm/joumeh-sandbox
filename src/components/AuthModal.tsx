import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { useStore } from '../lib/store';
import { api, ApiError, type User } from '../lib/api';
import { faDigits, formatPhone } from '../lib/format';
import { devFlags } from '../config/dev';

// Auth / Modal 107:643 (login), Mode=Verify 107:941 Default · 107:1040 Error · 107:1005 Loading · 107:973 Resend · 107:1078 Success,
// mobile 107:1543…107:1678, e-mail verify 107:1095 (BD-21 stub). Mode=Signup 107:773 · Error 107:851 · Email 107:812 / 107:896, mobile 107:1375/1453/1414/1498. OTP Input 53:234 / OTP Digit 53:215.
const LEN = 6;
const ERR: Record<string, string> = {
  invalid_phone: 'شماره موبایل معتبر نیست. نمونه: ۰۹۱۲۳۴۵۶۷۸۹', invalid_email: 'ایمیل معتبر نیست.', email_not_found: 'حسابی با این ایمیل پیدا نشد. با موبایل وارد شوید.',
  rate_limited: 'تعداد درخواست‌ها زیاد است. چند دقیقه‌ی دیگر دوباره تلاش کنید.',
  wrong_code: 'کد وارد شده نادرست است', code_expired: 'کد منقضی شده است. کد جدید بگیرید.', too_many_attempts: 'تلاش‌های ناموفق زیاد بود. کد جدید بگیرید.',
  invalid_body: `کد ${faDigits(String(LEN))} رقمی را کامل وارد کنید.`, no_pending_code: 'کد جدید بگیرید.',
};
const mmss = (s: number) => faDigits(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`);

function OtpInput({ value, onChange, invalid, describedBy }: { value: string; onChange: (v: string) => void; invalid: boolean; describedBy?: string }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []); // 107:941: first box focused on open
  const set = (i: number, raw: string) => {
    const d = raw.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/\D/g, '');
    if (d.length > 1) { const v = (value.slice(0, i) + d).slice(0, LEN); onChange(v); refs.current[Math.min(v.length, LEN - 1)]?.focus(); return; }
    const arr = value.padEnd(LEN, ' ').split(''); arr[i] = d || ' '; const v = arr.join('').trimEnd().replace(/ /g, '');
    onChange(v); if (d && i < LEN - 1) refs.current[i + 1]?.focus();
  };
  return (
    <div className="otp" dir="ltr" role="group" aria-label="کد تأیید" data-figma="53:234">
      {Array.from({ length: LEN }, (_, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }} data-autofocus={i === 0 ? '' : undefined} className={`otp__d${invalid ? ' otp__d--err' : ''}`} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`رقم ${faDigits(String(i + 1))} کد تأیید`} aria-invalid={invalid} aria-describedby={describedBy} maxLength={i === 0 ? LEN : 1}
          value={value[i] ? faDigits(value[i]) : ''} onChange={e => set(i, e.target.value)}
          onKeyDown={e => { if (e.key === 'Backspace' && !value[i] && i > 0) { refs.current[i - 1]?.focus(); onChange(value.slice(0, i - 1)); } }} />))}
    </div>
  );
}

export function AuthModal() {
  const { authOpen, closeAuth, setSession, afterAuth, toast } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [tab, setTab] = useState<'mobile' | 'email'>('mobile');
  const [step, setStep] = useState<'id' | 'code' | 'done'>('id');
  const [phone, setPhone] = useState(''); const [first, setFirst] = useState(''); const [last, setLast] = useState(''); const [fe, setFe] = useState<Record<string, string>>({}); const [email, setEmail] = useState(''); const [code, setCode] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [devCode, setDevCode] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  useEffect(() => { if (step !== 'code' || left <= 0) return; const t = setTimeout(() => setLeft(l => l - 1), 1000); return () => clearTimeout(t); }, [step, left]);
  if (!authOpen) return null;
  const isMail = tab === 'email';
  const reset = () => { setStep('id'); setCode(''); setErr(''); setFe({}); setDevCode(null); setLeft(0); };
  const switchMode = (m: 'login' | 'signup') => { setMode(m); setErr(''); setFe({}); };
  const close = () => { reset(); setMode('login'); setFirst(''); setLast(''); closeAuth(); };
  const request = async (e?: React.FormEvent) => {
    e?.preventDefault(); setErr(''); setFe({});
    if (mode === 'signup' && step === 'id') {
      const f: Record<string, string> = {};
      if (!first.trim()) f.first = 'نام را وارد کنید'; if (!last.trim()) f.last = 'نام خانوادگی را وارد کنید';
      if (Object.keys(f).length) { setFe(f); setTimeout(() => document.querySelector<HTMLElement>('.auth__form [aria-invalid="true"]')?.focus(), 0); return; }
      if (isMail) { setErr('عضویت با ایمیل در انتظار تصمیم کسب‌وکار است (BD-21). فعلاً با موبایل عضو شوید.'); return; }
    }
    const latin = phone.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[\s-]/g, '');
    if (!isMail && step === 'id' && !/^09\d{9}$/.test(latin)) { setErr('شماره موبایل معتبر نیست'); setTimeout(() => document.getElementById('phone')?.focus(), 0); return; } // 107:851 copy
    setBusy(true);
    try {
      const r = await api<{ devCode?: string; resendIn?: number }>(isMail ? '/auth/email/request' : '/auth/otp/request', { method: 'POST', body: isMail ? { email } : { phone } });
      setDevCode(r.data.devCode ?? null); setCode(''); setLeft(r.data.resendIn ?? 120); setStep('code');
    } catch (x) { setErr(ERR[(x as ApiError).code] ?? 'خطایی رخ داد. دوباره تلاش کنید.'); } finally { setBusy(false); }
  };
  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (code.length !== LEN) { setErr(ERR.invalid_body); return; }
    setBusy(true);
    try {
      const r = await api<{ token: string; user: User }>(isMail ? '/auth/email/verify' : '/auth/otp/verify', { method: 'POST', body: isMail ? { email, code } : { phone, code, ...(mode === 'signup' ? { firstName: first.trim(), lastName: last.trim() } : {}) } });
      setSession(r.data.token, r.data.user); setStep('done'); const after = afterAuth;
      setTimeout(() => { close(); toast('وارد شدید'); after?.(); }, 900);
    } catch (x) { setErr(ERR[(x as ApiError).code] ?? 'خطایی رخ داد. دوباره تلاش کنید.'); } finally { setBusy(false); }
  };
  const title = step === 'id' ? (mode === 'signup' ? 'عضویت' : 'ورود') : 'کد تأیید';
  return (
    <Modal title={title} onClose={close} labelId="auth-title">
      {step === 'done' ? (
        <div className="auth__done" role="status" data-figma="107:1078"><span className="auth__doneic"><Icon name="tick" size={28} /></span><p>ورود موفق</p></div>
      ) : step === 'code' ? (
        <form onSubmit={verify} className="auth__form" noValidate data-figma={isMail ? '107:1095' : '107:941'}>
          <div>
            <p className="small" style={{ margin: 0 }}>کد {faDigits(String(LEN))} رقمی به {isMail ? <bdi dir="ltr">{email}</bdi> : <bdi dir="ltr">{formatPhone(phone)}</bdi>} ارسال شد</p>
            <button type="button" className="link auth__edit" onClick={reset}>{isMail ? 'ویرایش ایمیل' : 'ویرایش شماره'}</button>
          </div>
          <OtpInput value={code} onChange={v => { setCode(v); setErr(''); }} invalid={!!err} describedBy={err ? 'auth-err' : undefined} />
          {err && <p id="auth-err" className="err auth__err" role="alert"><Icon name="danger-circle" size={20} />{err}</p>}
          {devFlags.showDevOtpBox && devCode && <p className="stub" data-testid="dev-otp"><span><strong>{isMail ? 'ایمیل آزمایشی (BD-21)' : 'SMS آزمایشی (BD-13)'}، در انتظار تصمیم کسب‌وکار:</strong> پیامی ارسال نشد. کد محلی: <bdi dir="ltr">{devCode}</bdi></span></p>}
          <p className="small muted auth__resend" aria-live="polite">{left > 0 ? `ارسال مجدد کد تا ${mmss(left)}` : <button type="button" className="link" onClick={() => request()} disabled={busy}>ارسال مجدد کد</button>}</p>
          <button className="btn btn--primary btn--block" disabled={busy} aria-busy={busy}>{busy ? <><span className="spin" aria-hidden="true" /><span className="sr-only">در حال بررسی…</span></> : 'تأیید و ورود'}</button>
        </form>
      ) : (<>
        <div role="tablist" aria-label="روش ورود" className="tabs">
          <button role="tab" id="t-m" aria-selected={tab === 'mobile'} aria-controls="p-auth" className="tab" onClick={() => { setTab('mobile'); setErr(''); }}>استفاده از موبایل</button>
          <button role="tab" id="t-e" aria-selected={tab === 'email'} aria-controls="p-auth" className="tab" onClick={() => { setTab('email'); setErr(''); }}>استفاده از ایمیل</button>
        </div>
        <div role="tabpanel" id="p-auth" aria-labelledby={isMail ? 't-e' : 't-m'}>
          <form onSubmit={request} className="auth__form" noValidate data-figma={mode === 'signup' ? (isMail ? '107:812' : '107:773') : '107:643'}>
            {mode === 'signup' && <>
              <div className="field"><label htmlFor="su-first">نام *</label>
                <input id="su-first" className="input" autoComplete="given-name" placeholder="مثلاً سارا" required aria-required="true" value={first} onChange={e => setFirst(e.target.value)} aria-invalid={!!fe.first} aria-describedby={fe.first ? 'su-first-e' : undefined} />
                {fe.first && <p id="su-first-e" className="err auth__err"><Icon name="danger-circle" size={20} />{fe.first}</p>}</div>
              <div className="field"><label htmlFor="su-last">نام خانوادگی *</label>
                <input id="su-last" className="input" autoComplete="family-name" placeholder="مثلاً احمدی" required aria-required="true" value={last} onChange={e => setLast(e.target.value)} aria-invalid={!!fe.last} aria-describedby={fe.last ? 'su-last-e' : undefined} />
                {fe.last && <p id="su-last-e" className="err auth__err"><Icon name="danger-circle" size={20} />{fe.last}</p>}</div>
            </>}
            {isMail
              ? <div className="field"><label htmlFor="email">ایمیل</label>
                <input id="email" className="input" type="email" autoComplete="email" dir="ltr" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'auth-err' : mode === 'login' ? 'mail-note' : undefined} />
                {mode === 'login' && <p id="mail-note" className="caption muted" style={{ margin: 0 }}>ورود با ایمیل آزمایشی است (BD-21) و فقط برای حساب‌هایی که ایمیل ثبت کرده‌اند کار می‌کند.</p>}</div>
              : <div className="field"><label htmlFor="phone">شماره موبایل</label>
                <input id="phone" className="input" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" value={phone} onChange={e => setPhone(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'auth-err' : undefined} /></div>}
            {err && <p id="auth-err" className="err auth__err" role="alert"><Icon name="danger-circle" size={20} />{err}</p>}
            <button className="btn btn--primary btn--block" disabled={busy}>{busy ? 'در حال ارسال…' : 'ادامه'}</button>
            {mode === 'login'
              ? <p className="small auth__alt">هنوز عضو نیستید؟ <button type="button" className="link" onClick={() => switchMode('signup')}>ثبت‌نام کنید</button></p>
              : <p className="small auth__alt">قبلاً عضو شده‌اید؟ <button type="button" className="link" onClick={() => switchMode('login')}>ورود</button></p>}
          </form>
        </div>
      </>)}
    </Modal>
  );
}
