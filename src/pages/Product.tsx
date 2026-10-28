import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useStore } from '../lib/store';
import { ApiError, type Product as P, type Variant } from '../lib/api';
import { faNumber, formatBadge, formatPrice } from '../lib/format';
import { Icon } from '../components/Icon';
import { ProductGrid } from '../components/Grid';
import { Modal } from '../components/Modal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Stub } from '../components/Stub';
import { ProductReviews } from '../components/Reviews';
import { SizeGuide } from '../components/SizeGuide';
import { flags } from '../config/flags';
import { NotFound } from './NotFound';
import './Product.css';
type Detail = P & { rating?: { average: number; count: number; sample: boolean }; description: string; images: { url: string; thumb?: string; alt: string }[]; variants: Variant[]; related: P[] };

/** design-batch-2026-10-26 item 12: PDP loading state mirrors the 57:282 layout (gallery 492×615 + info column). */
function PdpSkeleton() {
  return (<div className="pdp__main pdp__main--sk" data-testid="pdp-skeleton" aria-label="در حال بارگذاری">
    <div className="pdp__info">{[60, 35, 25, 90, 80, 50].map((w, i) => <div key={i} className="skel" style={{ blockSize: i === 0 ? 40 : 20, inlineSize: `${w}%` }} />)}</div>
    <div className="pdp__gallery"><div className="skel pdp__hero" /></div></div>);
}
export function Product() {
  const { slug } = useParams(); const loc = useLocation(); const nav = useNavigate();
  const r = useApi<Detail>(`/products/${slug}`);
  const { addToCart, toast, favorites, toggleFavorite } = useStore();
  const [img, setImg] = useState(0); const [color, setColor] = useState<string | null>(null); const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [guide, setGuide] = useState(false);
  const p = r.data;
  useEffect(() => { setImg(0); setSize(null); setQty(1); setErr(''); setColor(null); }, [slug]);
  useEffect(() => { if (p && !color) setColor(p.variants[0]?.color ?? null); }, [p, color]);
  // P9: arriving from a card's bag button shows the designed size-required state (260:62447 / m 260:63048).
  const sizeRequired = !!(loc.state as { sizeRequired?: boolean } | null)?.sizeRequired;
  useEffect(() => { if (p && loc.hash === '#options') { if (sizeRequired) setErr('لطفاً سایز را انتخاب کنید.'); document.getElementById('size-group')?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus(); } }, [p, loc.hash, sizeRequired]);
  const colors = useMemo(() => p ? [...new Map(p.variants.map(v => [v.color, v.colorHex])).entries()] : [], [p]);
  const sizes = useMemo(() => p ? p.variants.filter(v => v.color === color) : [], [p, color]);
  if (r.error === 404) return <NotFound />;
  if (r.loading || !p) return <div className="wrap pdp btn-scope-m" aria-busy="true">{r.error ? <div className="state" role="alert"><p>بارگذاری انجام نشد.</p><button className="btn btn--outline" onClick={r.reload}>تلاش دوباره</button></div> : <PdpSkeleton />}</div>;
  const priced = p.price != null; // catalog-real: no price yet → «قیمت به‌زودی / تماس بگیرید», add-to-cart disabled
  const sale = priced && p.status === 'sale' && p.originalPrice != null;
  const add = async () => {
    if (!priced) return;
    const v = sizes.find(s => s.size === size);
    if (!v) { setErr('لطفاً سایز را انتخاب کنید.'); document.getElementById('size-group')?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus(); return; }
    setErr(''); setBusy(true);
    try { await addToCart(v.id, qty); toast(`«${p.name}» به سبد اضافه شد`, { label: 'مشاهده سبد', onClick: () => nav('/cart') }); }
    catch (e) { setErr((e as ApiError).code === 'variant_unavailable' ? 'این سایز ناموجود است.' : 'افزودن به سبد انجام نشد. دوباره تلاش کنید.'); }
    finally { setBusy(false); }
  };
  const catName = p.category === 'women' ? 'زنانه' : 'مردانه';
  return (
    <div className="wrap pdp btn-scope-m">
      <Breadcrumbs items={[{ label: 'خانه', to: '/' }, { label: catName, to: `/${p.category}` }, { label: p.name }]} />
      <div className="pdp__main">
        <div className="pdp__info">
          {flags.showDiscountBadge && sale && p.badgePercent != null && <span className="pdp__badge">{formatBadge(p.badgePercent)}</span>}
          {p.status === 'new' && <span className="pdp__badge pdp__badge--new">جدید</span>}
          <h1 className="h-page">{p.name}</h1>
          {/* design-batch-2026-10-26 item 10 — rating row 57:282: stars 16 #15595B + «۴٫۲ از ۵ · ۱۲۸ نظر» 14 #57534E (sample placeholder, labelled). */}
          {p.rating && p.rating.count > 0 ? <a className="pdp__rating" href="#reviews" data-figma="57:282 rating">
            <span className="pdp__stars" aria-hidden="true">{[1, 2, 3, 4, 5].map(n => <span key={n} className={n <= Math.round(p.rating!.average) ? 'is-on' : ''}><Icon name="star-1" size={16} /></span>)}</span>
            <span>{p.rating.average.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} از ۵ · {faNumber(p.rating.count)} نظر{p.rating.sample && <span className="tag-sample"> (نمونه)</span>}</span></a>
            : <p className="caption muted pdp__rating">هنوز نظری ثبت نشده است.</p>}
          <p className="pdp__price">{sale && <><span className="sr-only">قیمت اصلی </span><s>{faNumber(p.originalPrice!)}</s></>}
            <span className={sale ? 'pdp__now pdp__now--sale' : priced ? 'pdp__now' : 'pdp__now pdp__now--onreq'}>{sale && <span className="sr-only">قیمت با تخفیف </span>}{formatPrice(p.price)}</span>{!!p.sampleOverlay && priced && <span className="tag-sample"> قیمت نمونه</span>}</p>
          <p className="pdp__desc">{p.description || 'توضیحات این محصول به‌زودی اضافه می‌شود.'}</p>
          {colors.some(([c]) => c) && <fieldset className="pdp__opt"><legend>رنگ: <span className="muted">{color}</span> <span className="tag-sample">نام رنگ نمونه</span></legend>
            <div className="swatches">{colors.map(([c, hex]) => (
              <label key={c} className="swatch" title={c}><input type="radio" name="color" checked={color === c} onChange={() => { setColor(c); setSize(null); }} aria-label={c} /><span style={{ background: hex ?? '#ccc' }} /></label>))}</div></fieldset>}
          {p.variants.length > 0 && <fieldset className="pdp__opt" id="options"><legend className="pdp__sizehead"><span>سایز</span></legend>
            <button type="button" className="link pdp__guide" onClick={() => setGuide(true)}>راهنمای سایز</button>
            <div className="sizes" id="size-group" role="radiogroup" aria-label="سایز" aria-describedby={err ? 'pdp-err' : undefined}>{sizes.map(v => (
              <label key={v.id} className="size"><input type="radio" name="size" value={v.size} checked={size === v.size} disabled={!v.available} onChange={() => { setSize(v.size); setErr(''); }} />
                <span>{v.size}{!v.available && <span className="sr-only"> (ناموجود)</span>}</span></label>))}</div></fieldset>}
          {err && <p id="pdp-err" className="err" role="alert">{err}</p>}
          {!priced && <p id="pdp-onreq" className="small pdp__onreq" role="note">قیمت این محصول به‌زودی اعلام می‌شود. فعلاً امکان خرید آنلاین آن نیست؛ برای سفارش تماس بگیرید.</p>}
          <div className="pdp__buy">
            {priced && <div className="qty" role="group" aria-label="تعداد">
              <button type="button" onClick={() => setQty(q => Math.min(99, q + 1))} aria-label="افزایش تعداد"><Icon name="add" size={18} /></button>
              <output aria-live="polite">{faNumber(qty)}</output>
              <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="کاهش تعداد"><Icon name="minus" size={18} /></button>
            </div>}
            <button type="button" className="btn btn--primary pdp__add" onClick={add} disabled={busy || !priced} aria-describedby={priced ? undefined : 'pdp-onreq'}><Icon name="bag-1" size={20} />{busy ? 'در حال افزودن…' : 'افزودن به سبد خرید'}</button>
            <button type="button" className="pdp__fav" data-figma={favorites.has(p.id) ? '266:67406' : '266:67401'} aria-pressed={favorites.has(p.id)} aria-label={`${p.name} در علاقه‌مندی‌ها`} onClick={() => toggleFavorite(p.id)}><Icon name={favorites.has(p.id) ? 'heart-2' : 'heart-1'} /></button>
          </div>
          <ul className="pdp__facts">
            <li><Icon name="tick" size={18} /><span>موجودی: در انتظار تصمیم کسب‌وکار (BD-16)</span></li>
            <li><Icon name="send-1" size={18} /><span>ارسال و هزینه: در انتظار تصمیم کسب‌وکار (BD-02/BD-03)</span></li>
            <li><Icon name="information-circle" size={18} /><span>بازگشت کالا: در انتظار تصمیم کسب‌وکار (BD-04)</span></li>
          </ul>
        </div>
        <div className="pdp__gallery">
          <img className="pdp__hero" src={p.images[img]?.url} alt={p.images[img]?.alt} width={492} height={615} />
          {p.images.length > 1 && <div className="pdp__thumbs">{p.images.map((im, k) => (
            <button type="button" key={k} aria-label={`نمایش عکس ${faNumber(k + 1)}`} aria-current={k === img} onClick={() => setImg(k)}><img src={im.thumb ?? im.url} alt="" width={114} height={152} loading="lazy" /></button>))}</div>}
        </div>
      </div>
      {/* Reviews 266:71769 (m 266:71829) — fix2: live via the local API. */}
      <ProductReviews slug={p.slug} />
      {p.related.length > 0 && <section className="pdp__sec" aria-labelledby="rel-h">
        <div className="sec-head"><h2 id="rel-h" className="h-section">محصولات مشابه</h2><Link to={`/${p.category}`} className="more">مشاهده همه <Icon name="left-2" size={16} /></Link></div>
        <ProductGrid products={p.related.slice(0, 4)} four />
      </section>}
      {guide && <Modal title="راهنمای سایز" onClose={() => setGuide(false)} labelId="guide-title" sheet wide hideTitle>
        <SizeGuide name={p.name} type={p.type} sizes={[...new Set(p.variants.map(v => v.size))]} />
      </Modal>}
    </div>
  );
}
