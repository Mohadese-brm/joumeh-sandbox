import { Link } from 'react-router-dom';
import { HeroCarousel } from '../components/HeroCarousel';
import { HeroStatic } from '../components/HeroStatic';
import { ProductGrid, GridSkeleton, ErrorState } from '../components/Grid';
import { Icon } from '../components/Icon';
import { useApi } from '../lib/useApi';
import { flags } from '../config/flags';
import type { Product } from '../lib/api';
import './Home.css';

/* design-batch-2026-10-26 items 2–4. Women feature 55:368 / Story 55:350: image 480×600 arch + copy, text vertically centred beside the
   image (Figma). Spacing (CEO): eyebrow→title 16, title→sentence 16, sentence on one line, sentence→button 32, section→section 48,
   last image→footer 80. The same spacing rules apply to every following section. */
function Feature({ id, eyebrow, title, text, img, to, alt = '', cta, ctaKind = 'primary', tone, flip = false, last = false, frame = false }: {
  id: string; eyebrow: string; title: string; text: string; img: string; to: string; alt?: string; cta: string; ctaKind?: 'primary' | 'secondary';
  tone: 'white' | 'cream'; flip?: boolean; last?: boolean; frame?: boolean }) {
  const pic = <img className={frame ? 'story__img' : 'feature__img'} src={`/img/${img}@1x.webp`} srcSet={`/img/${img}@1x.webp 1x, /img/${img}@2x.webp 2x`} alt={alt} width={480} height={600} loading="lazy" />;
  return (
    <section id={id} className={`hsec feature feature--${tone}${flip ? ' feature--flip' : ''}${last ? ' hsec--last' : ''}`} aria-labelledby={`${id}-h`}>
      <div className="wrap feature__in">
        <div className="feature__text">
          <p className="eyebrow feature__eyebrow">{eyebrow}</p>
          <h2 id={`${id}-h`} className="feature__title">{title}</h2>
          <p className="feature__desc">{text}</p>
          <Link to={to} className={`btn btn--${ctaKind} btn--v2 feature__cta`} aria-label={`${cta} — ${title}`}>{cta}</Link>
        </div>
        {frame ? <span className="story__frame feature__media">{pic}</span> : <span className="feature__media">{pic}</span>}
      </div>
    </section>
  );
}
function BestSellers({ cat, title, tone }: { cat: string; title: string; tone: 'white' | 'cream' }) {
  // "Best-selling" definition is an open item (Refinement 2) → sample rank ordering. Exactly 4 cards (Figma 55:282).
  const r = useApi<Product[]>(`/products?category=${cat}&sort=bestseller`);
  return (
    <section className={`hsec best feature--${tone}`} aria-labelledby={`b-${cat}`}>
      <div className="wrap">
        <div className="sec-head"><h2 id={`b-${cat}`} className="h-section">{title}</h2><Link to={`/${cat}`} className="more">مشاهده همه <Icon name="left-2" size={16} /></Link></div>
        {r.loading ? <GridSkeleton n={4} four /> : r.error ? <ErrorState onRetry={r.reload} /> : <ProductGrid products={r.data!.slice(0, 4)} four />}
      </div>
    </section>
  );
}
export function Home() {
  return (<>
    {flags.heroMode === 'static' ? <HeroStatic /> : <HeroCarousel />}
    <Feature id="f-women" flip tone="white" eyebrow="کالکشن پاییز ۱۴۰۵" title="تن‌پوش‌های زنانه" text="لباس‌هایی سبک و روان، با رنگ‌های گرم خاک و نور عصر کویر؛ دوخته‌شده برای روزهای آرام." img="product-women-lilac-shirt" to="/women" cta="مشاهده" />
    <BestSellers tone="white" cat="women" title="پرفروش‌های زنانه" />
    <Feature id="f-men" tone="cream" eyebrow="کالکشن پاییز ۱۴۰۵" title="تن‌پوش‌های مردانه" text="دوخت ساده، پارچه‌های طبیعی و رنگ‌های خاکی؛ برای مردی که آرامش را انتخاب می‌کند." img="product-men-doorway" to="/men" cta="مشاهده" />
    <BestSellers tone="cream" cat="men" title="پرفروش‌های مردانه" />
    {/* Story teaser 55:350 — design-batch-2026-10-26: copy now taken word-for-word from the approved «قصه ما» text (no new claims;
        the old «هر پارچه را با دست … می‌بافیم» hand-woven claim is removed). Round-1 M4 arch frame kept. */}
    <Feature id="story" flip last frame tone="white" eyebrow="قصه‌ی ما" title="پارچه‌ای که خاطره دارد" text="بعضی پارچه‌ها فقط پارچه نیستند؛ صدای یک خانواده‌اند."
      img="story-arch" alt="دار بافندگی با نخ‌های آبی و زرد" to="/info/story" cta="بیشتر بخوانید" ctaKind="secondary" />
  </>);
}
