// Reviews — NO FIGMA DESIGN. Built from the Admin table pattern (Data Table 174:14016, Tabs, Status Badge). PENDING DESIGN (Emma).
// Moderation policy BD-15 open; CEO decision 2026-10-21: reviews publish immediately. Admin can hide/unhide/delete.
import { useState } from 'react';
import { useLoad } from './hooks';
import { aapi } from '../api';
import { Button, Confirm, Empty, ErrorState, Field, Loading, NoPermission, PageTitle, REVIEW, StatusBadge, Stub, Table, Tabs, toast, when } from '../ui';
import { faNumber } from '../../lib/format';
import { useMe, can } from '../AdminApp';

export function Reviews() {
  const me = useMe(); const [status, setStatus] = useState(''); const [rating, setRating] = useState(''); const [q, setQ] = useState('');
  const { data, extra, error, loading, reload } = useLoad<any[]>(can(me, 'reviews') ? `/reviews?${new URLSearchParams({ status, rating, q })}` : null);
  const [del, setDel] = useState<any>(null);
  if (!can(me, 'reviews')) return <NoPermission />;
  const edit = can(me, 'reviews', 'edit'); const c = extra?.counts ?? {};
  const setS = async (id: number, s: string) => { try { await aapi(`/reviews/${id}/status`, { method: 'POST', body: { status: s } }); toast(s === 'rejected' ? 'نظر از فروشگاه پنهان شد' : 'نظر دوباره نمایش داده می‌شود'); reload(); } catch { toast('انجام نشد', true); } };
  const remove = async () => { try { await aapi(`/reviews/${del.id}`, { method: 'DELETE' }); setDel(null); toast('نظر حذف شد'); reload(); } catch { toast('حذف انجام نشد', true); } };
  return <>
    <div className="adm-pending" role="note">در انتظار طراحی — این صفحه در فیگما طراحی ندارد و از الگوی جدول پنل مدیریت ساخته شده است. (PENDING DESIGN)</div>
    <PageTitle crumb="مشتریان و پشتیبانی / نظرات" title="نظرات محصولات" sub={<>نظرات بلافاصله منتشر می‌شوند (تصمیم مدیرعامل، ۱۴۰۵/۰۷/۲۹). <Stub code="BD-15">سیاست بررسی نظرات</Stub></>} />
    <Tabs items={[['', 'همه', (c.published ?? 0) + (c.rejected ?? 0) + (c.pending ?? 0)], ['published', 'نمایش', c.published ?? 0], ['rejected', 'پنهان', c.rejected ?? 0]]} value={status} onChange={setStatus} />
    <div className="adm-filters">
      <Field label="جستجو" grow><input className="adm-input" placeholder="نام محصول یا متن نظر…" value={q} onChange={e => setQ(e.target.value)} /></Field>
      <Field label="امتیاز"><select className="adm-select" value={rating} onChange={e => setRating(e.target.value)}><option value="">همه</option>{[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{faNumber(r)} ستاره</option>)}</select></Field>
    </div>
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length ? <Empty title="نظری پیدا نشد" /> :
      <Table head={['محصول', 'نویسنده', 'امتیاز', 'متن نظر', 'تاریخ', 'وضعیت', '']}>
        {data.map(r => <tr key={r.id}><td><b>{r.product}</b></td><td>{r.author}</td><td><span className="adm-stars" aria-label={`${r.rating} از ۵`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></td>
          <td style={{ maxWidth: 320 }}>{r.body}</td><td className="adm-muted">{when(r.createdAt)}</td><td><StatusBadge map={REVIEW} value={r.status} /></td>
          <td style={{ whiteSpace: 'nowrap' }}>{edit && <>{r.status === 'published' ? <Button sm onClick={() => setS(r.id, 'rejected')}>پنهان کردن</Button> : <Button sm onClick={() => setS(r.id, 'published')}>نمایش</Button>}
            <Button sm onClick={() => setDel(r)} style={{ color: '#891414' }}>حذف</Button></>}</td></tr>)}
      </Table>}
    {del && <Confirm danger title="حذف نظر؟" body="این نظر برای همیشه حذف می‌شود (در نسخه‌ی نمایشی، با راه‌اندازی مجدد داده‌ها برمی‌گردند)." okLabel="حذف" onOk={remove} onClose={() => setDel(null)} />}
  </>;
}
