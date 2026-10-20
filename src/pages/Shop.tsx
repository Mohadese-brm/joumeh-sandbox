import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProductGrid, GridSkeleton, ErrorState } from '../components/Grid';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { useApi } from '../lib/useApi';
import { useIsMobile } from '../lib/store';
import { faNumber } from '../lib/format';
import { flags } from '../config/flags';
import type { Product } from '../lib/api';
import './Shop.css';

const SORTS = [['newest', 'جدیدترین'], ['bestseller', 'پرفروش‌ترین'], ['price-asc', 'ارزان‌ترین'], ['price-desc', 'گران‌ترین']] as const; // Figma 56:951
const TITLES: Record<string, { title: string; crumb: string }> = { women: { title: 'تن‌پوش‌های زنانه', crumb: 'زنانه' }, men: { title: 'تن‌پوش‌های مردانه', crumb: 'مردانه' } };
type F = { size: string[]; color: string[]; sale: boolean };
const fromParams = (sp: URLSearchParams): F => ({ size: sp.get('size')?.split(',').filter(Boolean) ?? [], color: sp.get('color')?.split(',').filter(Boolean) ?? [], sale: sp.get('sale') === '1' });

/** R-2 DECIDED (CEO 2026-10-21): select-then-Apply on desktop AND mobile. Choices stay pending until «اعمال فیلتر»; Apply updates results + URL. Reset clears.
 *  Filter panel content (size / colour / sale) is derived from data; the filter UI itself is not designed (CU-04) → flagged placeholder. */
function FilterForm({ category, applied, onApply, onCancel }: { category: string; applied: F; onApply: (f: F) => void; onCancel?: () => void }) {
  const opts = useApi<{ sizes: string[]; colors: { name: string; hex: string }[] }>(`/filters?category=${category}`);
  const [d, setD] = useState<F>(applied);
  useEffect(() => setD(applied), [applied]);
  const tog = (k: 'size' | 'color', v: string) => setD(x => ({ ...x, [k]: x[k].includes(v) ? x[k].filter(y => y !== v) : [...x[k], v] }));
  return (
    <form className="filters" onSubmit={e => { e.preventDefault(); onApply(d); }} data-flag="R-2 placeholder UI">
      <fieldset><legend>سایز</legend><div className="chips">{opts.data?.sizes.map(s => (
        <label key={s} className="chk"><input type="checkbox" checked={d.size.includes(s)} onChange={() => tog('size', s)} /><span>{s}</span></label>))}</div></fieldset>
      <fieldset><legend>رنگ <span className="tag-sample">نام رنگ‌ها نمونه</span></legend><div className="chips">{opts.data?.colors.map(c => (
        <label key={c.name} className="chk"><input type="checkbox" checked={d.color.includes(c.name)} onChange={() => tog('color', c.name)} /><span><i className="sw" style={{ background: c.hex }} />{c.name}</span></label>))}</div></fieldset>
      <fieldset><legend>تخفیف</legend><label className="chk"><input type="checkbox" checked={d.sale} onChange={e => setD(x => ({ ...x, sale: e.target.checked }))} /><span>فقط کالاهای حراج</span></label></fieldset>
      <div className="filters__act">
        <button className="btn btn--primary">اعمال فیلتر</button>
        <button type="button" className="btn btn--ghost" onClick={() => { const z = { size: [], color: [], sale: false }; setD(z); onApply(z); }}>پاک کردن همه</button>
        {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>انصراف</button>}
      </div>
    </form>
  );
}

export function Shop({ category }: { category: 'women' | 'men' }) {
  const [sp, setSp] = useSearchParams(); const mobile = useIsMobile();
  const page = Math.max(1, Number(sp.get('page') ?? 1)); const sort = sp.get('sort') ?? 'newest';
  const applied = fromParams(sp);
  const [sheet, setSheet] = useState<null | 'sort' | 'filter'>(null); const [panel, setPanel] = useState(false);
  const qs = new URLSearchParams({ category, sort, page: String(page) });
  if (applied.size.length) qs.set('size', applied.size.join(',')); if (applied.color.length) qs.set('color', applied.color.join(',')); if (applied.sale) qs.set('sale', '1');
  const r = useApi<Product[]>(`/products?${qs}`);
  const total = (r.extra.total as number) ?? 0; const totalPages = (r.extra.totalPages as number) ?? 1;
  const nActive = applied.size.length + applied.color.length + (applied.sale ? 1 : 0);
  const update = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k);
    setSp(n); window.scrollTo(0, 0);
  };
  const applyFilters = (f: F) => { update({ size: f.size.join(',') || null, color: f.color.join(',') || null, sale: f.sale ? '1' : null, page: null }); setSheet(null); setPanel(false); };
  const t = TITLES[category];
  return (
    <div className="wrap shop">
      <nav className="crumbs" aria-label="مسیر صفحه"><ol><li><Link to="/">خانه</Link></li><li><span aria-current="page">{t.crumb}</span></li></ol></nav>
      <div className="shop__head">
        <div><h1 className="h-page">{t.title}</h1><p className="muted small shop__count" aria-live="polite">{r.loading ? '…' : `${faNumber(total)} محصول`}</p></div>
        <div className="shop__tools">
          {flags.filterMode === 'apply' && <button type="button" className="btn btn--outline shop__fbtn" aria-expanded={mobile ? sheet === 'filter' : panel} onClick={() => (mobile ? setSheet('filter') : setPanel(p => !p))}>
            فیلترها{nActive ? ` (${faNumber(nActive)})` : ''}</button>}
          {mobile ? <button type="button" className="btn btn--outline" onClick={() => setSheet('sort')}>مرتب‌سازی: {SORTS.find(s => s[0] === sort)?.[1]}</button>
            : <div className="field shop__sort"><label htmlFor="sort" className="caption">مرتب‌سازی</label>
              <select id="sort" className="input" value={sort} onChange={e => update({ sort: e.target.value, page: null })}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>}
        </div>
      </div>
      {!mobile && panel && flags.filterMode === 'apply' && <div className="card shop__panel"><FilterForm category={category} applied={applied} onApply={applyFilters} onCancel={() => setPanel(false)} /></div>}
      {r.loading ? <GridSkeleton n={9} /> : r.error ? <ErrorState onRetry={r.reload} /> : r.data!.length === 0 ? (
        <div className="state"><p>محصولی با این فیلترها پیدا نشد.</p><button className="btn btn--outline" onClick={() => applyFilters({ size: [], color: [], sale: false })}>پاک کردن فیلترها</button></div>
      ) : <ProductGrid products={r.data!} headingLevel={2} />}
      <Pagination page={page} totalPages={totalPages} onPage={p => update({ page: p === 1 ? null : String(p) })} />
      {sheet === 'sort' && <Modal title="مرتب‌سازی" onClose={() => setSheet(null)} labelId="sort-title" sheet>
        <div role="radiogroup" aria-labelledby="sort-title" className="radios">{SORTS.map(([v, l]) => (
          <label key={v} className="radio"><input type="radio" name="sort" checked={sort === v} onChange={() => { update({ sort: v, page: null }); setSheet(null); }} /><span>{l}</span></label>))}</div>
      </Modal>}
      {sheet === 'filter' && <Modal title="فیلترها" onClose={() => setSheet(null)} labelId="filter-title" sheet><FilterForm category={category} applied={applied} onApply={applyFilters} /></Modal>}
    </div>
  );
}
