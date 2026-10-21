import { useState } from 'react';
import { Modal } from './Modal';
import { faNumber } from '../lib/format';
import './Reviews.css';

/** fix1 item 5 — Review / Section 266:71080 (d: 266:70942 / 70976 / 70987 / 71001 · m: 266:71012 / 71044 / 71055 / 71069)
 *  and Review / Form 266:71357 (d: 266:71081…71195 · m: 266:71221…71331). UI ONLY.
 *  BLOCKED BD-15: whether reviews ship, who may review, moderation, length rules, average/count rounding. No review API exists,
 *  so the section shows the designed «No reviews» state (Figma sample reviews are not shipped) and submit does not persist anything. */
export type Review = { id: string; name: string; rating: number; meta: string; body: string };
export type SectionState = { kind: 'loading' } | { kind: 'error'; onRetry: () => void } | { kind: 'ready'; reviews: Review[]; average?: number; count?: number };
type SubmitResult = 'ok' | 'fail';
/** STUB (BD-15): no backend. Resolves 'ok' after a short delay so the Submitting → Success states can be seen. */
const stubSubmit = (_r: { rating: number; text: string }) => new Promise<SubmitResult>(res => setTimeout(() => res('ok'), 600));

const stars = (n: number) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));

export function StarRating({ value, onChange, invalid }: { value: number; onChange: (n: number) => void; invalid?: boolean }) {
  // Review / Star Rating 266:70941: 28px glyphs, gap 4; filled #15595B, empty #E7E5E2. No designed hover; global focus ring only.
  return (
    <div className="stars" role="radiogroup" aria-label="امتیاز شما" aria-invalid={invalid || undefined} data-figma="266:70941">
      {[1, 2, 3, 4, 5].map(n => (
        <label key={n} className={`stars__s${n <= value ? ' is-on' : ''}`}>
          <input type="radio" name="review-rating" value={n} checked={value === n} onChange={() => onChange(n)} aria-label={`${faNumber(n)} از ۵`} />
          <span aria-hidden="true">★</span>
        </label>))}
    </div>
  );
}

export function ReviewForm({ onClose, submit = stubSubmit }: { onClose: () => void; submit?: typeof stubSubmit }) {
  const [rating, setRating] = useState(0); const [text, setText] = useState('');
  const [phase, setPhase] = useState<'edit' | 'invalid' | 'sending' | 'done' | 'fail'>('edit');
  const send = async () => {
    if (!rating || !text.trim()) { setPhase('invalid'); return; }
    setPhase('sending'); setPhase((await submit({ rating, text: text.trim() })) === 'ok' ? 'done' : 'fail');
  };
  return (
    <Modal title="ثبت نظر" onClose={onClose} labelId="revf-title" sheet>
      {phase === 'done' ? (
        <div className="revf" data-figma="266:71187">
          <div className="revf__ok" role="status"><span className="revf__okic" aria-hidden="true">✓</span>
            <p className="revf__okt">نظر شما ثبت شد</p>
            <p className="revf__oks">پس از بررسی منتشر می‌شود (نمونه — قوانین بررسی هنوز تصمیم‌گیری نشده).</p></div>
          <button type="button" className="btn btn--primary revf__full" onClick={onClose} data-autofocus>بستن</button>
        </div>
      ) : (
        <form className="revf" noValidate onSubmit={e => { e.preventDefault(); send(); }} data-figma={phase === 'invalid' ? '266:71134' : phase === 'sending' ? '266:71159' : phase === 'fail' ? '266:71195' : '266:71081'}>
          <div className="revf__grp"><span className="revf__lbl" id="revf-rate">امتیاز شما</span>
            <StarRating value={rating} onChange={n => { setRating(n); if (phase === 'invalid') setPhase('edit'); }} invalid={phase === 'invalid' && !rating} /></div>
          <div className="revf__grp"><label className="revf__lbl" htmlFor="revf-text">متن نظر</label>
            <textarea id="revf-text" className={`revf__ta${phase === 'invalid' && !text.trim() ? ' is-err' : ''}`} placeholder="—" value={text}
              aria-invalid={phase === 'invalid' && !text.trim() ? true : undefined} aria-describedby="revf-help revf-err"
              onChange={e => { setText(e.target.value); if (phase === 'invalid') setPhase('edit'); }} />
            <p id="revf-help" className="revf__help">قوانین طول متن و بررسی نظر هنوز تعیین نشده است (تصمیم باز).</p>
            {phase === 'invalid' && <p id="revf-err" className="revf__err" role="alert">لطفاً امتیاز و متن نظر را وارد کنید.</p>}
            {phase === 'fail' && <p id="revf-err" className="revf__fail" role="alert">ثبت نظر انجام نشد. دوباره تلاش کنید.</p>}
          </div>
          <div className="revf__act">
            <button type="submit" className="btn btn--primary" disabled={phase === 'sending'} aria-busy={phase === 'sending' || undefined}>
              {phase === 'sending' ? <><span className="spin" aria-hidden="true" /><span className="sr-only">در حال ثبت</span></> : phase === 'fail' ? 'تلاش دوباره' : 'ثبت نظر'}</button>
            <button type="button" className="btn btn--outline" onClick={onClose}>انصراف</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function ReviewsSection({ state = { kind: 'ready', reviews: [] } }: { state?: SectionState }) {
  const [open, setOpen] = useState(false);
  const fig = state.kind === 'loading' ? '266:70987' : state.kind === 'error' ? '266:71001' : state.reviews.length ? '266:70942' : '266:70976';
  return (
    <section className="revs" aria-labelledby="rev-h" data-figma={fig}>
      <div className="revs__head"><h2 id="rev-h" className="revs__title">نظرات کاربران</h2>
        <button type="button" className="btn btn--secondary revs__add" onClick={() => setOpen(true)}>ثبت نظر</button></div>
      {state.kind === 'loading' && <div className="revs__box" aria-busy="true"><span className="revs__sk" /><span className="revs__sk revs__sk--s" /><span className="sr-only">در حال بارگذاری نظرات</span></div>}
      {state.kind === 'error' && <div className="revs__box" role="alert"><p className="revs__errt">بارگذاری نظرات انجام نشد.</p><button type="button" className="revs__retry" onClick={state.onRetry}>تلاش دوباره</button></div>}
      {state.kind === 'ready' && state.reviews.length === 0 && <div className="revs__box"><p className="revs__nt">هنوز نظری برای این محصول ثبت نشده است.</p><p className="revs__ns">اولین نفری باشید که نظر می‌دهد.</p></div>}
      {state.kind === 'ready' && state.reviews.length > 0 && <>
        <div className="revs__sum"><div className="revs__avg">
          <span className="revs__score">{faNumber(state.average ?? 0).replace('.', '٫')}</span>
          <span className="revs__stars" aria-label={`${faNumber(state.average ?? 0)} از ۵`}>{stars(state.average ?? 0)}</span>
          <span className="revs__based">از ۵ · بر اساس {faNumber(state.count ?? state.reviews.length)} نظر</span></div></div>
        <ul className="revs__list">{state.reviews.map(r => (
          <li key={r.id} className="revc"><div className="revc__top"><span className="revc__name">{r.name}</span><span className="revc__stars" aria-label={`${faNumber(r.rating)} از ۵`}>{stars(r.rating)}</span></div>
            <p className="revc__meta">{r.meta}</p><p className="revc__body">{r.body}</p></li>))}</ul></>}
      {open && <ReviewForm onClose={() => setOpen(false)} />}
    </section>
  );
}
