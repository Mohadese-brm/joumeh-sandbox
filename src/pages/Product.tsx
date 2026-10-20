import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../lib/useApi';
import { useStore } from '../lib/store';
import { ApiError, type Product as P, type Variant } from '../lib/api';
import { faNumber, formatBadge, formatPrice } from '../lib/format';
import { Icon } from '../components/Icon';
import { ProductGrid } from '../components/Grid';
import { Modal } from '../components/Modal';
import { Stub } from '../components/Stub';
import { flags } from '../config/flags';
import { NotFound } from './NotFound';
import './Product.css';
type Detail = P & { description: string; images: { url: string; alt: string }[]; variants: Variant[]; related: P[] };

export function Product() {
  const { slug } = useParams(); const loc = useLocation(); const nav = useNavigate();
  const r = useApi<Detail>(`/products/${slug}`);
  const { addToCart, toast, favorites, toggleFavorite } = useStore();
  const [img, setImg] = useState(0); const [color, setColor] = useState<string | null>(null); const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [guide, setGuide] = useState(false);
  const p = r.data;
  useEffect(() => { setImg(0); setSize(null); setQty(1); setErr(''); setColor(null); }, [slug]);
  useEffect(() => { if (p && !color) setColor(p.variants[0]?.color ?? null); }, [p, color]);
  useEffect(() => { if (p && loc.hash === '#options') document.getElementById('size-group')?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus(); }, [p, loc.hash]);
  const colors = useMemo(() => p ? [...new Map(p.variants.map(v => [v.color, v.colorHex])).entries()] : [], [p]);
  const sizes = useMemo(() => p ? p.variants.filter(v => v.color === color) : [], [p, color]);
  if (r.error === 404) return <NotFound />;
  if (r.loading || !p) return <div className="wrap pdp" aria-busy="true">{r.error ? <div className="state" role="alert"><p>بارگذاری انجام نشد.</p><button className="btn btn--outline" onClick={r.reload}>تلاش دوباره</button></div> : <div className="skel" style={{ blockSize: 480, marginBlock: 32 }} />}</div>;
  const sale = p.status === 'sale' && p.originalPrice != null;
  const add = async () => {
    const v = sizes.find(s => s.size === size);
    if (!v) { setErr('لطفاً سایز را انتخاب کنید.'); document.getElementById('size-group')?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus(); return; }
    setErr(''); setBusy(true);
    try { await addToCart(v.id, qty); toast('به سبد خرید اضافه شد', { label: 'مشاهده سبد', onClick: () => nav('/cart') }); }
    catch (e) { setErr((e as ApiError).code === 'variant_unavailable' ? 'این سایز ناموجود است.' : 'افزودن به سبد انجام نشد. دوباره تلاش کنید.'); }
    finally { setBusy(false); }
  };
  const catName = p.category === 'women' ? 'زنانه' : 'مردانه';
  return (
    <div className="wrap pdp">
      <nav className="crumbs" aria-label="مسیر صفحه"><ol><li><Link to="/">خانه</Link></li><li><Link to={`/${p.category}`}>{catName}</Link></li><li><span aria-current="page">{p.name}</span></li></ol></nav>
      <div className="pdp__main">
        <div className="pdp__info">
          {flags.showDiscountBadge && sale && p.badgePercent != null && <span className="pdp__badge">{formatBadge(p.badgePercent)}</span>}
          {p.status === 'new' && <span className="pdp__badge pdp__badge--new">جدید</span>}
          <h1 className="h-page">{p.name}</h1>
          <p className="caption muted pdp__rating">امتیاز و نظرات: در انتظار تصمیم کسب‌وکار (BD-15)</p>
          <p className="pdp__price">{sale && <><span className="sr-only">قیمت اصلی </span><s>{faNumber(p.originalPrice!)}</s></>}
            <span className={sale ? 'pdp__now pdp__now--sale' : 'pdp__now'}>{sale && <span className="sr-only">قیمت با تخفیف </span>}{formatPrice(p.price)}</span></p>
          <p className="small muted">{p.description}</p>
          <fieldset className="pdp__opt"><legend>رنگ: <span className="muted">{color}</span> <span className="tag-sample">نام رنگ نمونه</span></legend>
            <div className="swatches">{colors.map(([c, hex]) => (
              <label key={c} className="swatch" title={c}><input type="radio" name="color" checked={color === c} onChange={() => { setColor(c); setSize(null); }} aria-label={c} /><span style={{ background: hex ?? '#ccc' }} /></label>))}</div></fieldset>
          <fieldset className="pdp__opt" id="options"><legend className="pdp__sizehead"><span>سایز</span></legend>
            <button type="button" className="link pdp__guide" onClick={() => setGuide(true)}>راهنمای سایز</button>
            <div className="sizes" id="size-group" role="radiogroup" aria-label="سایز" aria-describedby={err ? 'pdp-err' : undefined}>{sizes.map(v => (
              <label key={v.id} className="size"><input type="radio" name="size" value={v.size} checked={size === v.size} disabled={!v.available} onChange={() => { setSize(v.size); setErr(''); }} />
                <span>{v.size}{!v.available && <span className="sr-only"> (ناموجود)</span>}</span></label>))}</div></fieldset>
          {err && <p id="pdp-err" className="err" role="alert">{err}</p>}
          <div className="pdp__buy">
            <div className="qty" role="group" aria-label="تعداد">
              <button type="button" onClick={() => setQty(q => Math.min(99, q + 1))} aria-label="افزایش تعداد"><Icon name="add" size={18} /></button>
              <output aria-live="polite">{faNumber(qty)}</output>
              <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="کاهش تعداد"><Icon name="minus" size={18} /></button>
            </div>
            <button type="button" className="btn btn--primary pdp__add" onClick={add} disabled={busy}><Icon name="bag-1" size={20} />{busy ? 'در حال افزودن…' : 'افزودن به سبد خرید'}</button>
            <button type="button" className="icon-btn pdp__fav" aria-pressed={favorites.has(p.id)} aria-label={`${p.name} در علاقه‌مندی‌ها`} onClick={() => toggleFavorite(p.id)}><Icon name="heart-1" /></button>
          </div>
          <ul className="pdp__facts">
            <li><Icon name="tick" size={18} /><span>موجودی: در انتظار تصمیم کسب‌وکار (BD-16)</span></li>
            <li><Icon name="send-1" size={18} /><span>ارسال و هزینه: در انتظار تصمیم کسب‌وکار (BD-02/BD-03)</span></li>
            <li><Icon name="information-circle" size={18} /><span>بازگشت کالا: در انتظار تصمیم کسب‌وکار (BD-04)</span></li>
          </ul>
        </div>
        <div className="pdp__gallery">
          <img className="pdp__hero" src={p.images[img]?.url} alt={p.images[img]?.alt} width={480} height={600} />
          {p.images.length > 1 && <div className="pdp__thumbs">{p.images.map((im, k) => (
            <button type="button" key={k} aria-label={`نمایش عکس ${faNumber(k + 1)}`} aria-current={k === img} onClick={() => setImg(k)}><img src={im.url} alt="" width={96} height={120} loading="lazy" /></button>))}</div>}
        </div>
      </div>
      <section className="pdp__sec" aria-labelledby="rev-h">
        <h2 id="rev-h" className="h-section">نظرات کاربران</h2>
        <Stub code="BD-15">نظرات و امتیازها پس از تصمیم درباره‌ی بخش نظرات نمایش داده می‌شوند. نظرهای نمونه‌ی فیگما عمداً نمایش داده نشده‌اند.</Stub>
      </section>
      {p.related.length > 0 && <section className="pdp__sec" aria-labelledby="rel-h">
        <div className="sec-head"><h2 id="rel-h" className="h-section">محصولات مشابه</h2><Link to={`/${p.category}`} className="more">مشاهده همه <Icon name="left-2" size={16} /></Link></div>
        <div className="pgrid--4"><ProductGrid products={p.related} /></div>
      </section>}
      {guide && <Modal title="راهنمای سایز" onClose={() => setGuide(false)} labelId="guide-title">
        <Stub code="BD-18">جدول سایز نهایی هنوز تأیید نشده است. طراحی: Figma 245:61044 / 245:61112.</Stub>
      </Modal>}
    </div>
  );
}
