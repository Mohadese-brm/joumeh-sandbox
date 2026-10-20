import { Link } from 'react-router-dom';
// Figma 260:66609 (desktop) / 260:67502 (mobile) — 404 state, page 04.
export function NotFound() {
  return <div className="wrap state" style={{ paddingBlock: 96 }}><h1 className="h-page">صفحه پیدا نشد</h1><p className="muted">صفحه‌ای که دنبالش هستید وجود ندارد یا جابه‌جا شده است.</p><Link to="/" className="btn btn--primary">بازگشت به خانه</Link></div>;
}
