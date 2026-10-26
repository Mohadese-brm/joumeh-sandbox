import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { api, type Cart as CartT, type CartItem } from '../lib/api';
import { faNumber, formatPrice } from '../lib/format';
import { Icon } from '../components/Icon';
import { Stub } from '../components/Stub';
import './Cart.css';

export function Summary({ cart, children, title = 'خلاصه سفارش' }: { cart: CartT; children?: React.ReactNode; title?: string }) {
  const t = cart.totals;
  return (
    <aside className="card summary" aria-labelledby="sum-h">
      <h2 id="sum-h" className="summary__h">{title}</h2>
      <dl>
        <div><dt>جمع کل ({faNumber(t.count)} کالا)</dt><dd>{formatPrice(t.subtotal)}</dd></div>
        {t.discount > 0 && <div><dt>تخفیف</dt><dd className="summary__disc">{formatPrice(t.discount)}−</dd></div>}
        <div><dt>ارسال</dt><dd className="small muted">در انتظار تصمیم (BD-02)</dd></div>
        <div><dt>مالیات بر ارزش افزوده</dt><dd className="small muted">در انتظار تصمیم (BD-06)</dd></div>
        <div className="summary__total"><dt>مبلغ قابل پرداخت</dt><dd>{formatPrice(t.payable)}</dd></div>
      </dl>
      <p className="caption muted">مبلغ بدون هزینه‌ی ارسال و مالیات است؛ این دو در انتظار تصمیم کسب‌وکار هستند.</p>
      {children}
    </aside>
  );
}
export function Cart() {
  const { cart, cartError, refreshCart, setCart, addToCart, toast } = useStore(); const nav = useNavigate();
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => { refreshCart().finally(() => setLoading(false)); }, [refreshCart]);
  const setQty = async (it: CartItem, q: number) => {
    if (q < 1 || q > 99) return; setBusy(it.id);
    try { const r = await api<CartT>(`/cart/${cart!.cartId}/items/${it.id}`, { method: 'PATCH', body: { quantity: q } }); setCart(r.data); }
    catch { toast('تغییر تعداد انجام نشد'); } finally { setBusy(null); }
  };
  const remove = async (it: CartItem) => {
    setBusy(it.id);
    try { const r = await api<CartT>(`/cart/${cart!.cartId}/items/${it.id}`, { method: 'DELETE' }); setCart(r.data);
      toast(`«${it.name}» از سبد حذف شد`, { label: 'بازگرداندن', onClick: () => void addToCart(it.variantId, it.quantity) }); }
    catch { toast('حذف انجام نشد'); } finally { setBusy(null); }
  };
  // design-batch-2026-10-26 item 12: loading skeleton in the 119:594 shape (rows + summary box).
  if (loading) return <div className="wrap cart" aria-busy="true" data-testid="cart-skeleton"><div className="cart__head"><h1 className="cart__title">سبد خرید</h1></div>
    <div className="cart__grid"><ul className="cart__list" aria-hidden="true">{[0, 1, 2].map(i => <li key={i} className="citem citem--sk"><div className="skel citem__img citem__skimg" /><div className="citem__info"><div className="skel" style={{ blockSize: 18, inlineSize: '60%' }} /><div className="skel" style={{ blockSize: 14, inlineSize: '40%' }} /></div></li>)}</ul>
      <div className="card summary"><div className="skel" style={{ blockSize: 200 }} /></div></div></div>;
  if (cartError) return <div className="wrap cart"><h1 className="h-page cart__h">سبد خرید</h1><div className="state" role="alert"><p>بارگذاری سبد خرید انجام نشد.</p><button className="btn btn--outline" onClick={() => { setLoading(true); refreshCart().finally(() => setLoading(false)); }}>تلاش دوباره</button></div></div>;
  if (!cart || cart.items.length === 0) return (
    <div className="wrap cart"><h1 className="h-page cart__h">سبد خرید</h1>
      <div className="state cart__empty" data-figma="119:383"><span className="state__ic" aria-hidden="true"><Icon name="bag-1" size={32} /></span><p className="h-section">سبد خرید شما خالی است</p>
        <Link to="/women" className="btn btn--primary">مشاهده محصولات</Link></div></div>);
  const unavailable = cart.items.some(i => !i.available);
  return (
    <div className="wrap cart">
      <div className="cart__head" data-figma="119:594"><h1 className="cart__title">سبد خرید</h1><span className="cart__count">{faNumber(cart.totals.count)} کالا</span></div>
      <div className="cart__grid">
        <div>
          {unavailable && <p className="stub" role="alert"><Icon name="danger-circle" size={20} /><span>برخی کالاها ناموجود شده‌اند و در جمع حساب نمی‌شوند. آن‌ها را حذف کنید.</span></p>}
          <ul className="cart__list">{cart.items.map(it => (
            <li key={it.id} className={`citem${it.available ? '' : ' citem--na'}`} aria-busy={busy === it.id}>
              <Link to={`/product/${it.slug}`} className="citem__img" tabIndex={-1} aria-hidden="true"><img src={it.imageUrl} alt="" width={72} height={96} /></Link>
              <div className="citem__info">
                <Link to={`/product/${it.slug}`} className="citem__name">{it.name}</Link>
                <p className="citem__var">رنگ: {it.color} · سایز: {it.size}</p>
                <p className="citem__unit">قیمت واحد: {it.originalPrice != null && it.price != null && it.originalPrice > it.price && <s className="muted">{faNumber(it.originalPrice)}</s>} <span className={it.originalPrice ? 'pc__now--sale' : ''}>{formatPrice(it.price)}</span></p>
                {!it.available && <p className="err">ناموجود</p>}
              </div>
              {it.available ? <div className="qty qty--pill" role="group" aria-label={`تعداد ${it.name}`}>
                <button type="button" onClick={() => setQty(it, it.quantity + 1)} disabled={busy === it.id} aria-label={`افزایش تعداد ${it.name}`}><Icon name="add" size={20} /></button>
                <output aria-live="polite">{faNumber(it.quantity)}</output>
                <button type="button" onClick={() => setQty(it, it.quantity - 1)} disabled={busy === it.id || it.quantity <= 1} aria-label={`کاهش تعداد ${it.name}`}><Icon name="minus" size={20} /></button>
              </div> : <span />}
              <div className="citem__total"><span className="caption muted">جمع</span><strong>{formatPrice(it.lineTotal)}</strong></div>
              <button type="button" className="icon-btn citem__del" onClick={() => remove(it)} disabled={busy === it.id} aria-label={`حذف ${it.name} از سبد`}><Icon name="trash" size={24} /></button>
            </li>))}</ul>
          <Stub code="BD-08/BD-16">رزرو موجودی، پیام «موجودی ناکافی» و «تغییر قیمت» به تصمیم کسب‌وکار وابسته‌اند و فعال نیستند.</Stub>
        </div>
        <Summary cart={cart}><button className="btn btn--primary btn--block" disabled={cart.totals.count === 0} onClick={() => nav('/checkout')}>ادامه فرایند خرید</button></Summary>
      </div>
    </div>
  );
}
