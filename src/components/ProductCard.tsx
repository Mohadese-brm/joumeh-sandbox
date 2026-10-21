import { Link } from 'react-router-dom';
import bagIcon from '../assets/icons/icon-bag-1.svg?raw';
import { formatBadge, formatPrice, faNumber } from '../lib/format';
import './ProductCard.css';

export type ProductCardData = {
  id: number; slug: string; name: string; status: 'default' | 'sale' | 'new';
  price: number; originalPrice?: number | null; badgePercent?: number | null;
  imageUrl: string; imageAlt: string;
};
type Props = { product: ProductCardData; size?: 'desktop' | 'mobile'; href?: string; onAddToCart?: (id: number) => void; headingLevel?: 2 | 3 | 4; showBadge?: boolean; children?: React.ReactNode };
// Icons use currentColor (Figma stroke #1C1917 replaced).
const svg = (raw: string) => raw.replace(/ id="[^"]*"/g, '').replace(/stroke="#1C1917"/gi, 'stroke="currentColor"').replace(/fill="#1C1917"/gi, 'fill="currentColor"');

export function ProductCard({ product, size = 'desktop', href, onAddToCart, headingLevel = 3, showBadge = true, children }: Props) {
  const isSale = product.status === 'sale' && product.originalPrice != null;
  const H = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const w = size === 'desktop' ? 282 : 171, h = size === 'desktop' ? 376 : 228;
  return (
    <article className={`pc pc--${size}`} data-figma={size === 'desktop' ? '54:106/54:123/54:139' : '54:153/54:170/54:186'}>
      <Link className="pc__link" to={href ?? `/product/${product.slug}`}>
        <div className="pc__media">
          <img src={product.imageUrl} alt={product.imageAlt} width={w} height={h} loading="lazy" />
          <span className="pc__overlay" aria-hidden="true"><span>مشاهده</span></span>
        </div>
        <H className="pc__name">{product.name}</H>
        <p className="pc__price">
          {isSale && <><span className="sr-only">قیمت اصلی </span><s className="pc__old">{faNumber(product.originalPrice!)}</s></>}
          <span className={isSale ? 'pc__now pc__now--sale' : 'pc__now'}>{isSale && <span className="sr-only">قیمت با تخفیف </span>}{formatPrice(product.price)}</span>
        </p>
      </Link>
      {children}
      {showBadge && product.status === 'sale' && product.badgePercent != null && <span className="pc__badge">{formatBadge(product.badgePercent)}</span>}
      {product.status === 'new' && <span className="pc__badge pc__badge--new">جدید</span>}
      {/* fix1 item 2 (CEO review 2026-10-21): no favourite on cards; the heart lives only on the PDP (Favorite Toggle 266:67491). */}
      <button type="button" className="pc__icon pc__cart" aria-label={`افزودن ${product.name} به سبد خرید`} onClick={() => onAddToCart?.(product.id)}>
        <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg(bagIcon) }} />
      </button>
    </article>
  );
}
