// Reviews — Figma proposal «Reviews / List» 346:79251 (+ Empty 346:79318, Loading 346:79329, Error 346:79340, Row menu 347:80172).
// The design is a PROPOSAL: 6 decisions are open (Mohadeseh). Moderation policy BD-15 is open; CEO decision 2026-10-21: reviews publish immediately.
// r3 (Emma RV-1/RV-2): no hide/show/delete UI and no status tabs/column. The API endpoints (POST /reviews/:id/status, DELETE /reviews/:id)
// stay in server/admin.ts, untouched, behind REVIEW_MODERATION_UI below; nothing is removed from the backend.
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLoad } from './hooks';
import { Field, NoPermission, Overflow, PageTitle, Stub, Table, fa, when } from '../ui';
import { useMe, can } from '../AdminApp';

/** Moderation actions UI is OFF until BD-15 is decided (Emma r3: removed from the UI, not just disabled). */
export const REVIEW_MODERATION_UI = false;

/** Review / Star Rating 266:70941: brand-coloured ★ (#15595b) on a subtle-border track (#e7e5e2), 14px, gap 2. Display only. */
export const Stars = ({ n }: { n: number }) => <span className="adm-stars" role="img" aria-label={`${fa(n)} از ۵ ستاره`}>
  {[0, 1, 2, 3, 4].map(i => <span key={i} className={i < n ? 'on' : ''} aria-hidden="true">★</span>)}</span>;

const HEAD = ['محصول', 'نویسنده', 'امتیاز', 'متن نظر', 'تاریخ', ''];
/** Figma 346:79318 / 346:79340: header row kept, centred state below it. */
function StateTable({ children }: { children: React.ReactNode }) {
  return <div className="adm-table-wrap"><table className="adm-table"><thead><tr>{HEAD.slice(0, 5).map(h => <th key={h}>{h}</th>)}</tr></thead></table>{children}</div>;
}
export const ReviewsEmpty = () => <StateTable><div className="adm-state2"><span className="ic"><img src="/admin-icons/Bag2.svg" alt="" /></span><b>هنوز نظری ثبت نشده</b><span>نظرات مشتریان پس از ثبت، بلافاصله اینجا نمایش داده می‌شوند. (متن پیشنهادی)</span></div></StateTable>;
export const ReviewsError = ({ retry }: { retry: () => void }) => <StateTable><div className="adm-state2" role="alert"><span className="ic err"><img src="/admin-icons/DangerTriangle.svg" alt="" /></span><b>نظرات بارگذاری نشد</b><span>اتصال برقرار نشد. دوباره تلاش کنید.</span>
  <button type="button" className="adm-btn secondary" onClick={retry}><img src="/admin-icons/Add.svg" alt="" />تلاش دوباره</button></div></StateTable>;
export const ReviewsLoading = () => <div className="adm-table-wrap" aria-busy="true" aria-label="در حال بارگذاری نظرات"><table className="adm-table"><thead><tr>{HEAD.slice(0, 5).map(h => <th key={h}>{h}</th>)}</tr></thead>
  <tbody>{[0, 1, 2, 3, 4].map(i => <tr key={i} className="adm-skel-row"><td><i style={{ width: 12 }} /> <i style={{ width: 150 }} /></td><td><i style={{ width: 64 }} /></td><td><i style={{ width: 64 }} /></td><td><i style={{ width: 160 }} /></td><td><i style={{ width: 42 }} /></td></tr>)}</tbody></table></div>;

export function Reviews() {
  const me = useMe(); const nav = useNavigate(); const [sp] = useSearchParams();
  const [rating, setRating] = useState(''); const [q, setQ] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const { data, error, loading, reload } = useLoad<any[]>(can(me, 'reviews') ? `/reviews?${new URLSearchParams({ rating, q, from, to })}` : null);
  if (!can(me, 'reviews')) return <NoPermission crumb="مشتریان و پشتیبانی / نظرات" title="نظرات محصولات" />;
  // DEMO ONLY: ?preview=empty|loading|error renders the designed state so it can be reviewed against Figma (labelled on screen).
  const preview = sp.get('preview');
  const state = preview === 'empty' ? 'empty' : preview === 'loading' ? 'loading' : preview === 'error' ? 'error'
    : loading && !data ? 'loading' : error ? 'error' : !data?.length && !(q || rating || from || to) ? 'empty' : 'list';
  return <>
    <PageTitle crumb="مشتریان و پشتیبانی / نظرات" title="نظرات محصولات" sub="نظرات بلافاصله و بدون بررسی منتشر می‌شوند · داده نمونه" />
    <div className="adm-proposal" role="note">طرح پیشنهادی — در انتظار تصمیم. (جایگاه «نظرات» در منو، پنهان/حذف نظر، نقش‌ها و پاسخ فروشگاه هنوز تصمیم‌گیری نشده‌اند — <Stub code="BD-15">سیاست بررسی نظرات</Stub>)
      {preview && <b> · پیش‌نمایش حالت «{preview}» (نسخه‌ی نمایشی)</b>}</div>
    {state === 'list' && <div className="adm-filters">
      <Field label="جستجو" grow><span className="adm-search-in"><img src="/admin-icons/Search1.svg" alt="" /><input className="adm-input" placeholder="جستجو در نام محصول، نویسنده یا متن نظر…" value={q} onChange={e => setQ(e.target.value)} /></span></Field>
      <Field label="امتیاز"><select className="adm-select" value={rating} onChange={e => setRating(e.target.value)}><option value="">همه</option>{[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{fa(r)} ستاره</option>)}</select></Field>
      <Field label="تاریخ"><span className="adm-daterange"><img src="/admin-icons/Calender1.svg" alt="" />
        <input type="date" aria-label="از تاریخ" value={from} onChange={e => setFrom(e.target.value)} /><span>تا</span><input type="date" aria-label="تا تاریخ" value={to} onChange={e => setTo(e.target.value)} /></span></Field>
      <button type="button" className="adm-btn" disabled title="فاز ۲"><img src="/admin-icons/Add.svg" alt="" />فیلترهای بیشتر</button>
    </div>}
    {state === 'loading' ? <ReviewsLoading /> : state === 'error' ? <ReviewsError retry={reload} /> : state === 'empty' ? <ReviewsEmpty /> : <>
      {!data!.length ? <div className="adm-state">نتیجه‌ای با این فیلترها پیدا نشد.</div> :
      <Table head={HEAD}>
        {data!.map(r => <tr key={r.id}>
          <td style={{ width: 210 }}><div className="adm-prod">{r.imageUrl ? <img src={r.imageUrl} alt="" /> : <span className="adm-thumb" />}<div><b>{r.product}</b><small dir="ltr">{r.sku}</small></div></div></td>
          <td style={{ width: 150 }} className="adm-muted">{r.author}</td>
          <td style={{ width: 170 }}><Stars n={r.rating} /></td>
          <td>{r.body}</td>
          <td style={{ width: 130 }} className="adm-muted nw">{when(r.createdAt).split(/[,،]/)[0]}</td>
          <td style={{ width: 60 }}><Overflow label={`گزینه‌های نظر ${r.author}`} items={[
            { label: 'مشاهده محصول در فروشگاه', icon: 'Edit2', onClick: () => window.open(`/product/${r.slug}`, '_blank') },
            { label: 'مشاهده مشتری', icon: 'Edit2', disabled: !can(me, 'customers'), hint: can(me, 'customers') ? undefined : 'دسترسی ندارید', onClick: () => nav(`/admin/customers/${r.userId}`) },
          ]} /></td></tr>)}
      </Table>}
      <span className="adm-muted">نمایش {fa(data!.length ? 1 : 0)}–{fa(data!.length)} از {fa(data!.length)} · داده نمونه</span></>}
  </>;
}
