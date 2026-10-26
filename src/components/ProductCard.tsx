import { Link } from 'react-router-dom';
import bagIcon from '../assets/icons/icon-bag-1.svg?raw';
import { formatBadge, formatPrice, faNumber } from '../lib/format';
import './ProductCard.css';

export type ProductCardData = {
  id: number; slug: string; name: string; status: 'default' | 'sale' | 'new';
  price: number | null; originalPrice?: number | null; badgePercent?: number | null;
  imageUrl: string; imageThumb?: string; imageThumb2?: string | null; imageAlt: string;
};
type Props = { product: ProductCardData; size?: 'desktop' | 'mobile'; href?: string; onAddToCart?: (id: number) => void; headingLevel?: 2 | 3 | 4; showBadge?: boolean; children?: React.ReactNode };
// Icons use currentColor (Figma stroke #1C1917 replaced).
const svg = (raw: string) => raw.replace(/ id="[^"]*"/g, '').replace(/stroke="#1C1917"/gi, 'stroke="currentColor"').replace(/fill="#1C1917"/gi, 'fill="currentColor"');

export function ProductCard({ product, size = 'desktop', href, onAddToCart, headingLevel = 3, showBadge = true, children }: Props) {
  const priced = product.price != null; // catalog-real: null price → «قیمت به‌زودی / تماس بگیرید», no add-to-cart
  const isSale = priced && product.status === 'sale' && product.originalPrice != null;
  const H = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const w = size === 'desktop' ? 378 : 171, h = size === 'desktop' ? 504 : 228;
  const first = product.imageThumb ?? product.imageUrl;
  // design-batch-2026-10-26 item 9: hover swaps to the second photo. Graceful fallback: no second photo (or the same file) → no swap,
  // the single photo stays and only the «مشاهده» pill shows.
  const second = product.imageThumb2 && product.imageThumb2 !== first ? product.imageThumb2 : null;
  return (
    <article className={`pc pc--${size}${second ? ' pc--swap' : ''}`} data-figma={size === 'desktop' ? '56:282 card 378×504 (boxed: adidas.nl/sneakers reference)' : '54:153/54:170/54:186'}>
      <Link className="pc__link" to={href ?? `/product/${product.slug}`}>
        <div className="pc__media">
          <img className="pc__img pc__img--1" src={first} alt={product.imageAlt} width={w} height={h} loading="lazy"
            {...(product.imageThumb && product.imageThumb !== product.imageUrl ? { srcSet: `${product.imageThumb} 600w, ${product.imageUrl} 1600w`, sizes: `(min-width: 1024px) ${w}px, 50vw` } : {})} />
          {second && <img className="pc__img pc__img--2" src={second} alt="" aria-hidden="true" width={w} height={h} loading="lazy" decoding="async" />}
          <span className="pc__overlay" aria-hidden="true"><span>مشاهده</span></span>
        </div>
        <div className="pc__body">
        <H className="pc__name">{product.name}</H>
        <p className="pc__price">
          {isSale && <><span className="sr-only">قیمت اصلی </span><s className="pc__old">{faNumber(product.originalPrice!)}</s></>}
          <span className={isSale ? 'pc__now pc__now--sale' : priced ? 'pc__now' : 'pc__now pc__now--onreq'}>{isSale && <span className="sr-only">قیمت با تخفیف </span>}{formatPrice(product.price)}</span>
        </p>
        </div>
      </Link>
      {children}
      {showBadge && product.status === 'sale' && product.badgePercent != null && <span className="pc__badge">{formatBadge(product.badgePercent)}</span>}
      {product.status === 'new' && <span className="pc__badge pc__badge--new">جدید</span>}
      {/* fix1 item 2 (CEO review 2026-10-21): no favourite on cards; the heart lives only on the PDP (Favorite Toggle 266:67491). */}
      {priced && <button type="button" className="pc__icon pc__cart" aria-label={`افزودن ${product.name} به سبد خرید`} onClick={() => onAddToCart?.(product.id)}>
        <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg(bagIcon) }} />
      </button>}
    </article>
  );
}
