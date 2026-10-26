import { useNavigate } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { useIsMobile, useStore } from '../lib/store';
import { flags } from '../config/flags';
import { Icon } from './Icon';
import type { Product } from '../lib/api';
/** Shared product grid. Card add-to-cart (P9 ruling): no quick-add is designed, so the bag button opens the PDP and shows
 *  the designed size-required state 260:62447 (mobile 260:63048) — no extra toast copy. */
export function ProductGrid({ products, headingLevel = 3, onFavoriteToggled, removable = false, four = false }: { products: Product[]; headingLevel?: 2 | 3; onFavoriteToggled?: (id: number) => void; removable?: boolean; four?: boolean }) {
  const mobile = useIsMobile(); const { toggleFavorite } = useStore(); const nav = useNavigate();
  return (
    <ul className={four ? 'pgrid pgrid--4' : 'pgrid'}>
      {products.map(p => (
        <li key={p.id}>
          <ProductCard product={p} size={mobile ? 'mobile' : 'desktop'} headingLevel={headingLevel} showBadge={flags.showDiscountBadge}
            onAddToCart={() => nav(`/product/${p.slug}#options`, { state: { sizeRequired: true } })}>
            {removable && <button type="button" className="fav-remove" data-figma="127:468" onClick={async () => { await toggleFavorite(p.id); onFavoriteToggled?.(p.id); }}>
              <Icon name="trash" size={20} /><span>حذف از علاقه‌مندی‌ها</span><span className="sr-only"> — {p.name}</span></button>}
          </ProductCard>
        </li>))}
    </ul>
  );
}
export function GridSkeleton({ n = 6, four = false }: { n?: number; four?: boolean }) {
  return <ul className={four ? 'pgrid pgrid--4' : 'pgrid'} aria-busy="true" aria-label="در حال بارگذاری" data-testid="grid-skeleton">{Array.from({ length: n }, (_, i) =>
    <li key={i} aria-hidden="true"><div className="pgrid__sk"><div className="skel pgrid__sk-img" /><div className="skel pgrid__sk-line" /><div className="skel pgrid__sk-line pgrid__sk-line--s" /></div></li>)}</ul>;
}
export function ErrorState({ onRetry, text = 'بارگذاری انجام نشد.' }: { onRetry: () => void; text?: string }) {
  return <div className="state" role="alert"><p>{text}</p><button className="btn btn--outline" onClick={onRetry}>تلاش دوباره</button></div>;
}
