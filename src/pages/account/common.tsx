import { Link } from 'react-router-dom';
export const ORDER_STATUS: Record<string, [string, string]> = {
  pending: ['در انتظار پرداخت', ''], processing: ['در حال پردازش', ''], shipped: ['ارسال شده', 'chip--teal'], delivered: ['تحویل داده شده', 'chip--green'], cancelled: ['لغو شده', 'chip--red'],
};
export const RETURN_STATUS: Record<string, [string, string]> = { reviewing: ['در حال بررسی', ''], approved: ['تأیید شده', 'chip--teal'], rejected: ['رد شده', 'chip--red'], refunded: ['بازپرداخت شده', 'chip--green'] };
export const Chip = ({ s, map }: { s: string; map: Record<string, [string, string]> }) => <span className={`chip ${map[s]?.[1] ?? ''}`}>{map[s]?.[0] ?? s}</span>;
export function Empty({ title, text, cta }: { title: string; text: string; cta?: [string, string] }) {
  return <div className="card state"><p className="h-section" style={{ fontSize: 20 }}>{title}</p><p className="muted small" style={{ margin: 0 }}>{text}</p>{cta && <Link className="btn btn--primary" to={cta[0]}>{cta[1]}</Link>}</div>;
}
export function ListSkeleton({ n = 3 }: { n?: number }) { return <div aria-busy="true" aria-label="در حال بارگذاری" style={{ display: 'grid', gap: 16 }}>{Array.from({ length: n }, (_, i) => <div key={i} className="skel" style={{ blockSize: 120 }} />)}</div>; }
export function ErrorCard({ onRetry }: { onRetry: () => void }) { return <div className="card state" role="alert"><p>بارگذاری انجام نشد.</p><button className="btn btn--outline" onClick={onRetry}>تلاش دوباره</button></div>; }
