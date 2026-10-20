import { useNavigate } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { useIsMobile, useStore } from '../lib/store';
import { flags } from '../config/flags';
import type { Product } from '../lib/api';
/** Shared product grid. Card add-to-cart: a size must be chosen first (Figma demo 260:62447 "size required"),
 *  so the bag button opens the PDP options. No quick-add sheet is designed → flagged for Emma. */
export function ProductGrid({ products, headingLevel = 3, onFavoriteToggled }: { products: Product[]; headingLevel?: 2 | 3; onFavoriteToggled?: (id: number) => void }) {
  const mobile = useIsMobile(); const { favorites, toggleFavorite, toast } = useStore(); const nav = useNavigate();
  return (
    <ul className="pgrid">
      {products.map(p => (
        <li key={p.id}>
          <ProductCard product={p} size={mobile ? 'mobile' : 'desktop'} headingLevel={headingLevel} favorite={favorites.has(p.id)} showBadge={flags.showDiscountBadge}
            onToggleFavorite={async id => { await toggleFavorite(id); onFavoriteToggled?.(id); }}
            onAddToCart={() => { toast('برای افزودن به سبد، سایز را انتخاب کنید'); nav(`/product/${p.slug}#options`); }} />
        </li>))}
    </ul>
  );
}
export function GridSkeleton({ n = 6 }: { n?: number }) {
  return <ul className="pgrid" aria-busy="true" aria-label="در حال بارگذاری">{Array.from({ length: n }, (_, i) => <li key={i}><div className="skel pgrid__sk" /></li>)}</ul>;
}
export function ErrorState({ onRetry, text = 'بارگذاری انجام نشد.' }: { onRetry: () => void; text?: string }) {
  return <div className="state" role="alert"><p>{text}</p><button className="btn btn--outline" onClick={onRetry}>تلاش دوباره</button></div>;
}
