import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProductGrid, GridSkeleton, ErrorState } from '../components/Grid';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { useApi } from '../lib/useApi';
import { useIsMobile } from '../lib/store';
import { faNumber } from '../lib/format';
import { flags } from '../config/flags';
import { Icon } from '../components/Icon';
import { api } from '../lib/api';
import { formatPrice } from '../lib/format';
import type { Product } from '../lib/api';
import './Shop.css';

const SORTS = [['newest', 'جدیدترین'], ['bestseller', 'پرفروش‌ترین'], ['price-asc', 'ارزان‌ترین'], ['price-desc', 'گران‌ترین']] as const; // Figma 56:951
const TITLES: Record<string, { title: string; crumb: string }> = { women: { title: 'تن‌پوش‌های زنانه', crumb: 'زنانه' }, men: { title: 'تن‌پوش‌های مردانه', crumb: 'مردانه' } };
type F = { type: string[]; size: string[]; color: string[]; min: number | null; max: number | null; sale: boolean };
const list = (sp: URLSearchParams, k: string) => sp.get(k)?.split(',').filter(Boolean) ?? [];
const num = (v: string | null) => (v && Number.isFinite(+v) ? +v : null);
const fromParams = (sp: URLSearchParams): F => ({ type: list(sp, 'type'), size: list(sp, 'size'), color: list(sp, 'color'), min: num(sp.get('minPrice')), max: num(sp.get('maxPrice')), sale: sp.get('sale') === '1' });
const EMPTY: F = { type: [], size: [], color: [], min: null, max: null, sale: false };
const toQuery = (f: F): Record<string, string | null> => ({ type: f.type.join(',') || null, size: f.size.join(',') || null, color: f.color.join(',') || null,
  minPrice: f.min != null ? String(f.min) : null, maxPrice: f.max != null ? String(f.max) : null, sale: f.sale ? '1' : null });
type Opts = { types: string[]; sizes: string[]; colors: { name: string; hex: string }[]; price: { min: number; max: number } };

/** R-2 DECIDED (CEO 2026-10-21): select-then-Apply. Visuals per Figma filter sheet 69:15362 (women 69:15332, men 69:15505), round-1 M2.
 *  Footer «نمایش N محصول» applies (updates results + URL); «پاک کردن» resets all filters (and applies the reset). N is a live count for the pending choices.
 *  Category list and price bounds are derived from sample data → BD-18 stub. Desktop has no design → same controls inline (P4 interim). */
function FilterForm({ category, applied, onApply }: { category: string; applied: F; onApply: (f: F) => void }) {
  const opts = useApi<Opts>(`/filters?category=${category}`);
  const [d, setD] = useState<F>(applied);
  useEffect(() => setD(applied), [applied]);
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const q = new URLSearchParams({ category }); for (const [k, v] of Object.entries(toQuery(d))) if (v) q.set(k, v);
    let live = true; api<Product[]>(`/products?${q}`).then(r => live && setCount((r as unknown as { total: number }).total ?? null)).catch(() => live && setCount(null));
    return () => { live = false; };
  }, [category, d]);
  const tog = (k: 'type' | 'size' | 'color', v: string) => setD(x => ({ ...x, [k]: x[k].includes(v) ? x[k].filter(y => y !== v) : [...x[k], v] }));
  const lo = opts.data?.price?.min ?? 0, hi = opts.data?.price?.max ?? 0, step = 10000;
  const vMin = d.min ?? lo, vMax = d.max ?? hi; const pct = (v: number) => (hi > lo ? ((v - lo) / (hi - lo)) * 100 : 0);
  return (
    <form className="filters" onSubmit={e => { e.preventDefault(); onApply(d); }} data-figma="69:15362">
      <fieldset className="filters__grp"><legend>دسته‌بندی <span className="tag-sample">داده نمونه (BD-18)</span></legend>
        <div className="filters__checks">{(opts.data?.types ?? []).map(t => (
          <label key={t} className="fchk"><input type="checkbox" checked={d.type.includes(t)} onChange={() => tog('type', t)} /><span className="fchk__box" aria-hidden="true"><Icon name="tick" size={16} /></span><span>{t}</span></label>))}</div></fieldset>
      <fieldset className="filters__grp"><legend>سایز</legend><div className="fsizes">{opts.data?.sizes.map(s => (
        <label key={s} className="fsize"><input type="checkbox" checked={d.size.includes(s)} onChange={() => tog('size', s)} /><span>{s}</span></label>))}</div></fieldset>
      <fieldset className="filters__grp"><legend>محدوده‌ی قیمت <span className="tag-sample">داده نمونه</span></legend>
        {opts.data?.price && hi > lo && <div className="frange" style={{ ['--a' as string]: `${pct(vMin)}%`, ['--b' as string]: `${pct(vMax)}%` }}>
          <div className="frange__track" aria-hidden="true"><i /></div>
          <input type="range" min={lo} max={hi} step={step} value={vMin} aria-label="حداقل قیمت" aria-valuetext={formatPrice(vMin)}
            onChange={e => { const v = Math.min(+e.target.value, vMax); setD(x => ({ ...x, min: v <= lo ? null : v })); }} />
          <input type="range" min={lo} max={hi} step={step} value={vMax} aria-label="حداکثر قیمت" aria-valuetext={formatPrice(vMax)}
            onChange={e => { const v = Math.max(+e.target.value, vMin); setD(x => ({ ...x, max: v >= hi ? null : v })); }} />
          <div className="frange__labels caption"><span>{formatPrice(vMin)}</span><span>{formatPrice(vMax)}</span></div>
        </div>}</fieldset>
      <fieldset className="filters__grp"><legend>رنگ</legend><div className="fswatches">{opts.data?.colors.map(c => (
        <label key={c.name} className="fswatch" title={c.name}><input type="checkbox" checked={d.color.includes(c.name)} onChange={() => tog('color', c.name)} aria-label={c.name} /><span style={{ background: c.hex }} /></label>))}</div></fieldset>
      <div className="filters__act">
        <button className="btn btn--primary" aria-live="polite">{count == null ? 'نمایش محصولات' : `نمایش ${faNumber(count)} محصول`}</button>
        <button type="button" className="btn btn--outline" onClick={() => { setD(EMPTY); onApply(EMPTY); }}>پاک کردن</button>
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
  for (const [k, v] of Object.entries(toQuery(applied))) if (v) qs.set(k, v);
  const r = useApi<Product[]>(`/products?${qs}`);
  const total = (r.extra.total as number) ?? 0; const totalPages = (r.extra.totalPages as number) ?? 1;
  const nActive = applied.type.length + applied.size.length + applied.color.length + (applied.min != null || applied.max != null ? 1 : 0) + (applied.sale ? 1 : 0);
  const update = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k);
    setSp(n); window.scrollTo(0, 0);
  };
  const applyFilters = (f: F) => { update({ ...toQuery(f), page: null }); setSheet(null); setPanel(false); };
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
      {!mobile && panel && flags.filterMode === 'apply' && <div className="card shop__panel"><FilterForm category={category} applied={applied} onApply={applyFilters} /></div>}
      {r.loading ? <GridSkeleton n={9} /> : r.error ? <ErrorState onRetry={r.reload} /> : r.data!.length === 0 ? (
        <div className="state"><p>محصولی با این فیلترها پیدا نشد.</p><button className="btn btn--outline" onClick={() => applyFilters(EMPTY)}>پاک کردن فیلترها</button></div>
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
