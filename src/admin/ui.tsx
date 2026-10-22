// Admin / * components (Figma Admin Design System 252:63841). Kept small and local to the admin.
import { useEffect, useState, type ReactNode } from 'react';
import { faDigits, faNumber, formatPhone } from '../lib/format';
/** Phone numbers read left-to-right inside RTL text. */
export const Ph = ({ p }: { p?: string | null }) => (p ? <bdi dir="ltr">{formatPhone(p)}</bdi> : <>—</>);

export const icon = (n: string) => `/admin-icons/${n}.svg`;
export const Ico = ({ n, alt = '' }: { n: string; alt?: string }) => <span className="adm-ico" aria-hidden={alt ? undefined : true}><img src={icon(n)} alt={alt} /></span>;

export function Button({ kind = 'text', sm, children, ...p }: { kind?: 'primary' | 'secondary' | 'text' | 'danger'; sm?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`adm-btn ${kind}${sm ? ' sm' : ''}`} {...p}>{children}</button>;
}
export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'brand' | 'accent';
export const Badge = ({ tone, children }: { tone: Tone; children: ReactNode }) => <span className={`adm-badge ${tone}`}>{children}</span>;

export const ORDER_STATUS: Record<string, [string, Tone]> = {
  pending: ['در انتظار پرداخت', 'neutral'], processing: ['در حال پردازش', 'warning'], shipped: ['ارسال شده', 'success'], delivered: ['تحویل داده شده', 'brand'], cancelled: ['لغو شده', 'danger'],
};
export const PAY_STATUS: Record<string, [string, Tone]> = { unpaid: ['پرداخت نشده', 'neutral'], paid: ['پرداخت شده', 'success'], failed: ['ناموفق', 'danger'], refunded: ['بازپرداخت شده', 'info'] };
export const PUBLISH: Record<string, [string, Tone]> = { published: ['منتشر شده', 'success'], draft: ['پیش‌نویس', 'neutral'], unpublished: ['متوقف', 'warning'], archived: ['بایگانی', 'neutral'] };
export const REVIEW: Record<string, [string, Tone]> = { published: ['نمایش', 'success'], rejected: ['پنهان', 'neutral'], pending: ['در انتظار', 'warning'] };
export const StatusBadge = ({ map, value }: { map: Record<string, [string, Tone]>; value: string }) => { const [l, t] = map[value] ?? [value, 'neutral' as Tone]; return <Badge tone={t}>{l}</Badge>; };

export const toman = (n: number | null | undefined) => (n == null ? '—' : faNumber(n));
export const fa = faDigits;
const dt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' });
export const when = (iso?: string | null) => (iso ? dt.format(new Date(iso.replace(' ', 'T') + 'Z')) : '—');

/** Placeholder marker: every undecided business rule is labelled with its code. */
export const Stub = ({ code, children }: { code: string; children?: ReactNode }) => <span className="adm-stub" title={`${code} — در انتظار تصمیم کسب‌وکار`}>{children ?? 'در انتظار تصمیم کسب‌وکار'} ({code})</span>;

export function PageTitle({ crumb, title, sub, actions }: { crumb?: string; title: string; sub?: ReactNode; actions?: ReactNode }) {
  return <div className="adm-head"><div className="adm-title">{crumb && <div className="adm-crumb">{crumb}</div>}<h1>{title}</h1>{sub && <p>{sub}</p>}</div>{actions && <div className="adm-actions">{actions}</div>}</div>;
}
export function Tabs<T extends string>({ items, value, onChange }: { items: [T, string, number?][]; value: T; onChange: (v: T) => void }) {
  return <div className="adm-tabs" role="tablist">{items.map(([k, l, n]) => <button key={k} role="tab" aria-selected={value === k} className={`adm-tab${value === k ? ' on' : ''}`} onClick={() => onChange(k)}>{l}{n != null && ` ${faNumber(n)}`}</button>)}</div>;
}
export function Field({ label, req, err, grow, children }: { label: string; req?: boolean; err?: string; grow?: boolean; children: ReactNode }) {
  return <label className={`adm-field${grow ? ' grow' : ''}`}><span>{label}{req && <span className="req"> *</span>}</span>{children}{err && <span className="err" role="alert">{err}</span>}</label>;
}
export function Modal({ title, children, onClose, foot }: { title: string; children: ReactNode; onClose: () => void; foot: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="adm-modal-bg" onClick={onClose}><div className="adm-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><h2>{title}</h2>{children}<div className="foot">{foot}</div></div></div>;
}
export function Confirm({ title, body, danger, okLabel, onOk, onClose }: { title: string; body: ReactNode; danger?: boolean; okLabel: string; onOk: () => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose} foot={<><Button kind={danger ? 'danger' : 'primary'} onClick={onOk}>{okLabel}</Button><Button onClick={onClose}>انصراف</Button></>}><div>{body}</div></Modal>;
}
let pushToast: (m: string, err?: boolean) => void = () => {};
export const toast = (m: string, err = false) => pushToast(m, err);
export function Toasts() {
  const [t, setT] = useState<{ m: string; err: boolean } | null>(null);
  useEffect(() => { pushToast = (m, err = false) => { setT({ m, err }); setTimeout(() => setT(null), 3000); }; }, []);
  return t ? <div className={`adm-toast${t.err ? ' error' : ''}`} role="status">{t.m}</div> : null;
}
export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => <div className="adm-state"><b>{title}</b>{children}</div>;
export const ErrorState = ({ retry }: { retry: () => void }) => <div className="adm-state" role="alert"><b>بارگذاری انجام نشد</b>اتصال را بررسی کنید و دوباره تلاش کنید.<Button kind="secondary" onClick={retry}>تلاش دوباره</Button></div>;
export const Loading = () => <div aria-busy="true" aria-label="در حال بارگذاری" style={{ display: 'grid', gap: 8 }}>{[0, 1, 2, 3].map(i => <div key={i} className="adm-skel" />)}</div>;
export const NoPermission = () => <div className="adm-state"><b>به این بخش دسترسی ندارید</b>برای دسترسی با مدیر کل (مالک) هماهنگ کنید.</div>;
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return <div className="adm-table-wrap"><table className="adm-table"><thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
export function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="adm-pager"><span className="adm-muted">نمایش {faNumber(total ? (page - 1) * size + 1 : 0)}–{faNumber(Math.min(page * size, total))} از {faNumber(total)}</span>
    <div className="pages"><button className="adm-page" aria-label="قبلی" disabled={page <= 1} onClick={() => onPage(page - 1)}><img src={icon('Right2')} alt="" /></button>
      {Array.from({ length: pages }, (_, i) => i + 1).map(p => <button key={p} className={`adm-page${p === page ? ' on' : ''}`} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>{faNumber(p)}</button>)}
      <button className="adm-page" aria-label="بعدی" disabled={page >= pages} onClick={() => onPage(page + 1)}><img src={icon('Left2')} alt="" /></button></div></div>;
}
