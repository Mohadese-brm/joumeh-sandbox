// gerdoo-update-2026-10-28: ONE-TIME admin setup page (/admin/setup). The server (server/admin-setup.ts) decides whether it is open;
// when closed every request answers 404 and this page shows «صفحه پیدا نشد». Nothing typed here is put in the URL or stored in the browser.
import { useEffect, useState } from 'react';
import { aapi, AdminApiError } from './api';
import { Button, Field } from './ui';

type Info = { open: true; role: 'owner' | 'admin'; roleLabel: string; passwordMin: number; closesAt: string };
const faNum = (n: number) => n.toLocaleString('fa-IR');
const tehran = (iso: string) => new Date(iso).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'medium', timeStyle: 'short' });

export function Setup() {
  const [info, setInfo] = useState<Info | null | 'closed'>(null);
  const [v, setV] = useState({ email: '', name: '', password: '', password2: '' });
  const [fields, setFields] = useState<Record<string, string>>({}); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => { document.title = 'راه‌اندازی پنل مدیریت جومه'; aapi<Info>('/setup').then(r => setInfo(r.data)).catch(() => setInfo('closed')); }, []);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setFields({});
    const min = info && info !== 'closed' ? info.passwordMin : 12; const f: Record<string, string> = {};
    if (v.password.length < min) f.password = `رمز عبور باید حداقل ${faNum(min)} نویسه باشد`;
    if (v.password !== v.password2) f.password2 = 'دو رمز عبور یکسان نیستند';
    if (Object.keys(f).length) { setFields(f); return; }
    setBusy(true);
    try { const r = await aapi<{ roleLabel: string }>('/setup', { method: 'POST', body: v }); setV({ email: '', name: '', password: '', password2: '' }); setDone(r.data.roleLabel); }
    catch (x) { const a = x as AdminApiError;
      if (a.fields) setFields(a.fields);
      else if (a.status === 404) setInfo('closed');
      else setErr(a.code === 'rate_limited' ? 'تعداد تلاش‌ها زیاد است؛ ۱۵ دقیقه دیگر دوباره امتحان کنید' : a.code === 'bad_origin' ? 'درخواست از نشانی دیگری ارسال شده است' : 'ساخت حساب انجام نشد'); }
    finally { setBusy(false); }
  };
  if (info === null) return <div className="adm adm-login" aria-busy="true" />;
  if (done) return <div className="adm adm-login"><div className="box" role="status" data-testid="setup-done">
    <h1><span className="adm-logo">ج</span>حساب مدیر ساخته شد</h1>
    <p>نقش: <b>{done}</b>. این صفحه از این لحظه برای همیشه بسته است.</p>
    <a className="adm-btn primary" href="/admin/login">ورود به پنل مدیریت</a></div></div>;
  if (info === 'closed') return <div className="adm adm-login"><div className="box" data-testid="setup-closed">
    <h1><span className="adm-logo">ج</span>صفحه پیدا نشد</h1><p className="adm-muted">این صفحه وجود ندارد یا دیگر در دسترس نیست.</p>
    <a href="/admin/login">ورود به پنل مدیریت</a></div></div>;
  return <div className="adm adm-login">
    <form className="box adm-setup" method="post" onSubmit={submit} noValidate data-testid="setup-form">
      <h1><span className="adm-logo">ج</span>راه‌اندازی پنل مدیریت جومه</h1>
      <p className="adm-muted">ساخت یک‌باره‌ی حساب <b>{info.roleLabel}</b>. پس از ساخت حساب، این صفحه برای همیشه بسته می‌شود.</p>
      <Field label="ایمیل" req err={fields.email}><input className={`adm-input${fields.email ? ' bad' : ''}`} name="email" type="email" autoComplete="username" dir="ltr" placeholder="name@example.com" value={v.email} onChange={set('email')} /></Field>
      <Field label="نام نمایشی" req err={fields.name}><input className={`adm-input${fields.name ? ' bad' : ''}`} name="name" autoComplete="name" value={v.name} onChange={set('name')} /></Field>
      <Field label={`رمز عبور (حداقل ${faNum(info.passwordMin)} نویسه)`} req err={fields.password}><input className={`adm-input${fields.password ? ' bad' : ''}`} name="password" type="password" autoComplete="new-password" dir="ltr" value={v.password} onChange={set('password')} /></Field>
      <Field label="تکرار رمز عبور" req err={fields.password2}><input className={`adm-input${fields.password2 ? ' bad' : ''}`} name="password2" type="password" autoComplete="new-password" dir="ltr" value={v.password2} onChange={set('password2')} /></Field>
      {err && <p role="alert" style={{ color: "#891414", margin: 0 }}>{err}</p>}
      <Button kind="primary" type="submit" disabled={busy}>{busy ? 'در حال ساخت…' : 'ساخت حساب'}</Button>
      <span className="adm-muted">این صفحه تا {tehran(info.closesAt)} (به وقت تهران) باز است، مگر اینکه زودتر حساب ساخته شود.</span>
    </form></div>;
}
