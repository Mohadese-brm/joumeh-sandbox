import { Breadcrumbs } from '../components/Breadcrumbs';
import { STORY_TITLE, STORY_PARAGRAPHS } from '../content/story';
import './Story.css';
/** design-batch-2026-10-26 item 14 — «قصه ما» page with the CEO's exact text (src/content/story.ts).
 *  FIGMA GAP: no story-page frame exists → neutral editorial layout reusing approved tokens: breadcrumb, H1 (shop title style 30 Bold),
 *  body 16/28, and the approved Story arch image (55:350 / 69:1456) beside the text on desktop. */
export function Story() {
  return (
    <div className="wrap story-page">
      <Breadcrumbs items={[{ label: 'خانه', to: '/' }, { label: 'قصه‌ی ما' }]} />
      <article className="story-page__in" aria-labelledby="story-title" data-testid="story-text">
        <div className="story-page__text">
          <h1 id="story-title" className="story-page__title">{STORY_TITLE}</h1>
          {STORY_PARAGRAPHS.map((p, i) => <p key={i} className={i === 0 ? 'story-page__lead' : undefined}>{p}</p>)}
        </div>
        <span className="story__frame story-page__media"><img className="story__img" src="/img/story-arch@1x.webp" srcSet="/img/story-arch@1x.webp 1x, /img/story-arch@2x.webp 2x" alt="دار بافندگی با نخ‌های آبی و زرد" width={480} height={600} /></span>
      </article>
    </div>
  );
}
