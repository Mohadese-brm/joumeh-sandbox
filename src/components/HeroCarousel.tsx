import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { flags } from '../config/flags';
// Figma component set 68:807 «Home / Hero Carousel»: 3 slides (desktop 68:636/670/704, mobile 68:738/772/806).
// R-3 DECIDED: carousel (CEO 2026-10-21). Manual only; no autoplay (autoplay hero 59:4403 deprecated).
// The set has no prev/next/dot controls → controls below are a FLAGGED placeholder for Emma.
const SLIDES = [
  { title: 'سبکی که با تو می‌ماند', text: 'الهام از رنگ خاک و نور عصر کویر؛ پارچه‌های طبیعی، دوخته‌شده با حوصله برای امروز.', img: 'product-women-arch', to: '/women', w: 560, h: 700 },
  { title: 'دست‌بافته، از دل کویر', text: 'پارچه‌های طبیعی با رنگ‌های خاک؛ هر تکه با دست و با حوصله.', img: 'product-women-lilac-shirt', to: '/women', w: 480, h: 600 },
  { title: 'سادگی که ماندگار است', text: 'کالکشن تازه‌ی مردانه؛ دوخت ساده و آرام برای هر روز.', img: 'product-men-doorway', to: '/men', w: 480, h: 600 },
];
export function HeroCarousel() {
  const [i, setI] = useState(0);
  const slides = flags.heroMode === 'carousel' ? SLIDES : SLIDES.slice(0, 1);
  const s = slides[i];
  const go = (d: number) => setI(x => (x + d + slides.length) % slides.length);
  return (
    <section className="hero" aria-roledescription="carousel" aria-label="معرفی کالکشن">
      <div className="wrap hero__in">
        <div className="hero__slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} از ${slides.length}`} key={i}>
          <div className="hero__text">
            <p className="eyebrow">کالکشن پاییز ۱۴۰۵</p>
            {i === 0 ? <h1 className="h-display">{s.title}</h1> : <><h1 className="sr-only">جومه</h1><h2 className="h-display">{s.title}</h2></>}
            <p className="muted hero__p">{s.text}</p>
            <Link to={s.to} className="btn btn--primary hero__cta">مشاهده</Link>
          </div>
          <picture className="hero__media">
            <img src={`/img/${s.img}@1x.webp`} srcSet={`/img/${s.img}@1x.webp 1x, /img/${s.img}@2x.webp 2x`} alt="" width={s.w} height={s.h} {...{ fetchpriority: "high" }} />
          </picture>
        </div>
        {slides.length > 1 && (
          <div className="hero__ctrl" data-flag="placeholder-controls">
            <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="اسلاید قبلی"><Icon name="right-2" /></button>
            <div className="hero__dots">{slides.map((_, k) => <button key={k} type="button" aria-label={`اسلاید ${k + 1}`} aria-current={k === i} className="hero__dot" onClick={() => setI(k)}><span /></button>)}</div>
            <button type="button" className="icon-btn" onClick={() => go(1)} aria-label="اسلاید بعدی"><Icon name="left-2" /></button>
          </div>)}
      </div>
    </section>
  );
}
