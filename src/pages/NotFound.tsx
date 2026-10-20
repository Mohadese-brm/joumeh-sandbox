import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
// Figma 260:66609 (desktop) / 260:67502 (mobile) — 404 state (round-1 m4).
export function NotFound() {
  return (
    <div className="wrap nf">
      <h1 className="h-page nf__h">۴۰۴</h1>
      <div className="state"><span className="state__ic" aria-hidden="true"><Icon name="bag-1" size={32} /></span>
        <p className="h-section">صفحه‌ای که دنبالش هستید پیدا نشد.</p>
        <Link to="/" className="btn btn--primary">بازگشت به صفحهٔ اصلی</Link></div>
    </div>);
}
