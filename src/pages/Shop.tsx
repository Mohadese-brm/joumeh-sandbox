import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProductGrid, GridSkeleton, ErrorState } from '../components/Grid';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { useApi } from '../lib/useApi';
import { useIsMobile } from '../lib/store';
import { Icon } from '../components/Icon';
import { faNumber } from '../lib/format';
import type { Product } from '../lib/api';
import './Shop.css';

const SORTS = [['newest', 'جدیدترین'], ['bestseller', 'پرفروش‌ترین'], ['price-asc', 'ارزان‌ترین'], ['price-desc', 'گران‌ترین']] as const; // Figma 56:951
const TITLES: Record<string, { title: string; crumb: string }> = { women: { title: 'تن‌پوش‌های زنانه', crumb: 'زنانه' }, men: { title: 'تن‌پوش‌های مردانه', crumb: 'مردانه' } };
/* fix1 item 4 (CEO review 2026-10-21): the design has no filter component, so the filter UI is removed (desktop panel + mobile sheet).
   Supersedes R-2 (select-then-Apply). The API still accepts filter params; the UI no longer sends them. */

/** fix1 item 3: Sort / Dropdown 268:53379 (Closed 268:53255, Open 268:53263, menu 268:53271, options Sort / Option 268:53254). Custom listbox — no native select. */
function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false); const [act, setAct] = useState(0);
  const box = useRef<HTMLDivElement>(null); const btn = useRef<HTMLButtonElement>(null);
  const cur = Math.max(0, SORTS.findIndex(s => s[0] === value));
  useEffect(() => { if (!open) return; setAct(cur);
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', out); return () => document.removeEventListener('mousedown', out); }, [open, cur]);
  const pick = (i: number) => { setOpen(false); btn.current?.focus(); if (SORTS[i][0] !== value) onChange(SORTS[i][0]); };
  const key = (e: React.KeyboardEvent) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setAct(a => Math.min(SORTS.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(a => Math.max(0, a - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setAct(0); } else if (e.key === 'End') { e.preventDefault(); setAct(SORTS.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(act); }
    else if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); }
  };
  return (
    <div className="ssel" ref={box} data-figma="268:53379">
      <span id="sort-lbl" className="ssel__label">مرتب‌سازی</span>
      <button ref={btn} type="button" id="sort" className={`ssel__field${open ? ' is-open' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-labelledby="sort-lbl sort"
        aria-controls="sort-menu" aria-activedescendant={open ? `sort-opt-${act}` : undefined} onClick={() => setOpen(o => !o)} onKeyDown={key}>
        <span className="ssel__value">{SORTS[cur][1]}</span><span className="ssel__chev" aria-hidden="true"><Icon name="chev-d" size={20} /></span>
      </button>
      {open && <ul id="sort-menu" className="ssel__menu" role="listbox" aria-labelledby="sort-lbl" data-figma="268:53271">{SORTS.map(([v, l], i) => (
        <li key={v} id={`sort-opt-${i}`} role="option" aria-selected={v === value} className={`ssel__opt${i === act ? ' is-active' : ''}`}
          onMouseEnter={() => setAct(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(i)}>
          <span>{l}</span>{v === value && <span className="ssel__tick" aria-hidden="true">✓</span>}</li>))}</ul>}
    </div>
  );
}

export function Shop({ category }: { category: 'women' | 'men' }) {
  const [sp, setSp] = useSearchParams(); const mobile = useIsMobile();
  const page = Math.max(1, Number(sp.get('page') ?? 1)); const sort = sp.get('sort') ?? 'newest';
  const [sheet, setSheet] = useState(false);
  const r = useApi<Product[]>(`/products?${new URLSearchParams({ category, sort, page: String(page) })}`);
  const total = (r.extra.total as number) ?? 0; const totalPages = (r.extra.totalPages as number) ?? 1;
  const update = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k);
    setSp(n); window.scrollTo(0, 0);
  };
  const t = TITLES[category];
  return (
    <div className="wrap shop">
      <nav className="crumbs" aria-label="مسیر صفحه"><ol><li><Link to="/">خانه</Link></li><li><span aria-current="page">{t.crumb}</span></li></ol></nav>
      {/* fix1 item 3: sort per Figma — desktop Select v2/مرتب‌سازی 56:286 (240 wide, start of the Title row 56:293, bottom-aligned with the title block);
          mobile Toolbar 56:627 › Button/Sort 56:621 (full-width outline, 32 under the title, 48 above the grid) opening Bottom Sheet/Sort 56:951. */}
      <div className="shop__head" data-figma={mobile ? '56:611' : '56:293'}>
        <div className="shop__t"><h1 className="shop__title">{t.title}</h1><p className="shop__count" aria-live="polite">{r.loading ? '…' : `${faNumber(total)} محصول`}</p></div>
        {!mobile && <SortDropdown value={sort} onChange={v => update({ sort: v, page: null })} />}
      </div>
      {mobile && <div className="shop__toolbar" data-figma="56:627"><button type="button" className="sbtn" data-figma="56:621" aria-haspopup="dialog" onClick={() => setSheet(true)}>مرتب‌سازی: {SORTS.find(s => s[0] === sort)?.[1]}</button></div>}
      {r.loading ? <GridSkeleton n={9} /> : r.error ? <ErrorState onRetry={r.reload} /> : r.data!.length === 0 ? (
        <div className="state"><p>محصولی پیدا نشد.</p></div>
      ) : <ProductGrid products={r.data!} headingLevel={2} />}
      <Pagination page={page} totalPages={totalPages} onPage={p => update({ page: p === 1 ? null : String(p) })} />
      {sheet && <Modal title="مرتب‌سازی" onClose={() => setSheet(false)} labelId="sort-title" sheet>
        <div role="radiogroup" aria-labelledby="sort-title" className="radios">{SORTS.map(([v, l]) => (
          <label key={v} className="radio"><input type="radio" name="sort" checked={sort === v} onChange={() => { update({ sort: v, page: null }); setSheet(false); }} /><span>{l}</span></label>))}</div>
      </Modal>}
    </div>
  );
}
