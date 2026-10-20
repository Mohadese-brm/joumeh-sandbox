import { Link } from 'react-router-dom';
import { HeroCarousel } from '../components/HeroCarousel';
import { ProductGrid, GridSkeleton, ErrorState } from '../components/Grid';
import { Icon } from '../components/Icon';
import { useApi } from '../lib/useApi';
import type { Product } from '../lib/api';
import './Home.css';

function Feature({ title, text, img, to, w, h, tone, flip = false }: { title: string; text: string; img: string; to: string; w: number; h: number; tone: 'white' | 'cream'; flip?: boolean }) {
  return (
    <section className={`feature feature--${tone}${flip ? ' feature--flip' : ''}`} aria-labelledby={`f-${to}`}>
      <div className="wrap feature__in">
        <div className="feature__text">
          <p className="eyebrow">کالکشن پاییز ۱۴۰۵</p>
          <h2 id={`f-${to}`} className="h-page">{title}</h2>
          <p className="muted small">{text}</p>
          <Link to={to} className="btn btn--primary" aria-label={`مشاهده‌ی ${title}`}>مشاهده</Link>
        </div>
        <img className="feature__img" src={`/img/${img}@1x.webp`} srcSet={`/img/${img}@1x.webp 1x, /img/${img}@2x.webp 2x`} alt="" width={w} height={h} loading="lazy" />
      </div>
    </section>
  );
}
function BestSellers({ cat, title, tone }: { cat: string; title: string; tone: 'white' | 'cream' }) {
  // "Best-selling" definition is an open item (Refinement 2) → sample rank ordering.
  const r = useApi<Product[]>(`/products?category=${cat}&sort=bestseller`);
  return (
    <section className={`best feature--${tone}`} aria-labelledby={`b-${cat}`}>
      <div className="wrap">
        <div className="sec-head"><h2 id={`b-${cat}`} className="h-section">{title}</h2><Link to={`/${cat}`} className="more">مشاهده همه <Icon name="left-2" size={16} /></Link></div>
        {r.loading ? <GridSkeleton n={4} /> : r.error ? <ErrorState onRetry={r.reload} /> : <div className="pgrid--4"><ProductGrid products={r.data!.slice(0, 4)} /></div>}
      </div>
    </section>
  );
}
export function Home() {
  return (<>
    <HeroCarousel />
    <Feature flip tone="white" title="تن‌پوش‌های زنانه" text="لباس‌هایی سبک و روان، با رنگ‌های گرم خاک و نور عصر کویر؛ دوخته‌شده برای روزهای آرام." img="product-women-lilac-shirt" to="/women" w={480} h={600} />
    <BestSellers tone="white" cat="women" title="پرفروش‌های زنانه" />
    <Feature tone="cream" title="تن‌پوش‌های مردانه" text="دوخت ساده، پارچه‌های طبیعی و رنگ‌های خاکی؛ برای مردی که آرامش را انتخاب می‌کند." img="product-men-doorway" to="/men" w={480} h={600} />
    <BestSellers tone="cream" cat="men" title="پرفروش‌های مردانه" />
    <section id="story" className="feature feature--white feature--flip story" aria-labelledby="story-h">
      <div className="wrap feature__in">
        <div className="feature__text">
          <p className="eyebrow">قصه‌ی ما</p>
          <h2 id="story-h" className="h-page">هر تار، قصه‌ای از کویر</h2>
          <p className="muted small">جومه از دل کویر آمده است؛ از رنگ خاک، نور گرم بعدازظهر و صدای آرام دار قالی. هر پارچه را با دست و با حوصله می‌بافیم تا لباسی بسازیم که سال‌ها با تو بماند.</p>
          <Link to="/info/story" className="btn btn--secondary">بیشتر بخوانید</Link>
        </div>
        {/* Round-1 M4: crop exported read-only from ArchImage/Story 69:1456 (55:282); arch radii top w/2, bottom w×0.057 */}
        <img className="feature__img story__img" src="/img/story-arch@1x.webp" srcSet="/img/story-arch@1x.webp 1x, /img/story-arch@2x.webp 2x" alt="دار بافندگی با نخ‌های آبی و زرد" width={480} height={600} loading="lazy" />
      </div>
    </section>
  </>);
}
