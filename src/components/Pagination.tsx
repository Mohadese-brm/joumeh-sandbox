import { Icon } from './Icon';
import { faNumber } from '../lib/format';
// KB §3 (approved, do NOT mirror): page 1 on the right; leftmost «<» = NEXT (+1); rightmost «>» = PREVIOUS (−1); Persian digits; disabled boundaries.
export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p); else if (pages[pages.length - 1] !== '…') pages.push('…');
  return (
    <nav className="pager" aria-label="صفحه‌بندی">
      <button type="button" className="pager__arrow" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="صفحه‌ی قبل"><Icon name="right-2" size={20} /></button>
      {pages.map((p, i) => p === '…' ? <span key={`e${i}`} className="pager__gap" aria-hidden="true">…</span> :
        <button type="button" key={p} className="pager__num" aria-current={p === page ? 'page' : undefined} aria-label={`صفحه‌ی ${faNumber(p)}`} onClick={() => onPage(p)}>{faNumber(p)}</button>)}
      <button type="button" className="pager__arrow" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="صفحه‌ی بعد"><Icon name="left-2" size={20} /></button>
    </nav>
  );
}
