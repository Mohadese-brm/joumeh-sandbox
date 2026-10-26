import { Link } from 'react-router-dom';
/** design-batch-2026-10-26 item 1 (CEO): ONE fixed full-bleed hero image with a «مشاهده» button (flags.heroMode = 'static').
 *  Source: incoming-2026-10-26/hero.png (1542×1020, untouched) → public/img/hero-{768,1024,1542}.webp.
 *  FIGMA GAP: no full-bleed hero frame exists (Hero 55:322 is the arch + copy layout); the CTA uses the Figma hero CTA style
 *  (18 SemiBold, padding 16/40, min-h 56, radius 12) and sits at the bottom inline-start corner, away from the model. */
export function HeroStatic() {
  return (
    <section className="hero-s" aria-labelledby="hero-h">
      <img className="hero-s__img" src="/img/hero-1542.webp" srcSet="/img/hero-768.webp 768w, /img/hero-1024.webp 1024w, /img/hero-1542.webp 1542w" sizes="100vw"
        width={1542} height={1020} alt="زنی با پیراهن سفید و دامن صورتی روی بام کاه‌گلی کنار بادگیر در یزد" fetchPriority="high" decoding="async" />
      <h1 id="hero-h" className="sr-only">جومه — تن‌پوش‌های زنانه و مردانه</h1>
      <div className="hero-s__ctaWrap wrap"><Link to="/women" className="btn btn--primary btn--hero hero-s__cta">مشاهده</Link></div>
    </section>
  );
}
