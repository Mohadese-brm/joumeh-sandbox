// Figma Products 178:24124 (List 178:16092, Edit 178:18759, Create 178:18374, Publish confirm 178:19734, Archive 178:19769) · Categories 178:24125.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLoad } from './hooks';
import { aapi, AdminApiError } from '../api';
import { Button, Confirm, Empty, ErrorState, Field, Ico, Loading, NoPermission, PageTitle, Pager, PUBLISH, StatusBadge, Stub, Table, Tabs, fa, toast, toman } from '../ui';
import { faNumber } from '../../lib/format';
import { useMe, can } from '../AdminApp';

const STATES: [string, string][] = [['', 'همه'], ['published', 'منتشر شده'], ['draft', 'پیش‌نویس'], ['unpublished', 'متوقف'], ['archived', 'بایگانی']];
export function ProductsList() {
  const me = useMe(); const nav = useNavigate();
  const [state, setState] = useState(''); const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ state, q, category: cat, page: String(page) }).toString();
  const { data, extra, error, loading, reload } = useLoad<any[]>(can(me, 'products') ? `/products?${qs}` : null);
  const cats = useLoad<any[]>(can(me, 'products') ? '/categories' : null);
  if (!can(me, 'products')) return <NoPermission />;
  const counts = extra?.counts ?? {};
  return <>
    <PageTitle crumb="کاتالوگ / محصولات" title="محصولات" sub={`${faNumber(extra?.allCount ?? 0)} محصول · داده نمونه`}
      actions={can(me, 'products', 'edit') && <><Button kind="primary" onClick={() => nav('/admin/products/new')}><img src="/admin-icons/Add1.svg" alt="" />افزودن محصول</Button>
        <Button disabled title="ADMIN-PH: خروجی فایل در نسخه‌ی نمایشی نیست"><img src="/admin-icons/Download.svg" alt="" />خروجی (نمونه اولیه)</Button></>} />
    <Tabs items={STATES.map(([k, l]) => [k, l, k ? counts[k] ?? 0 : extra?.allCount])} value={state} onChange={v => { setState(v); setPage(1); }} />
    <div className="adm-filters">
      <Field label="جستجو" grow><input className="adm-input" placeholder="جستجو در نام، شناسه…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></Field>
      <Field label="دسته"><select className="adm-select" value={cat} onChange={e => { setCat(e.target.value); setPage(1); }}><option value="">همه</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
    </div>
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length ? <Empty title={q || state || cat ? 'نتیجه‌ای پیدا نشد' : 'هنوز محصولی ثبت نشده'}>فیلترها را تغییر دهید.</Empty> : <>
      <Table head={['محصول', 'دسته', 'قیمت (تومان)', 'تنوع', 'وضعیت', '']}>
        {data.map(p => <tr key={p.id} className="click" onClick={() => nav(`/admin/products/${p.id}`)}>
          <td><div className="adm-prod">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span className="adm-thumb" />}<div><b>{p.name}</b><small dir="ltr">{p.slug}</small></div></div></td>
          <td>{p.categoryName}</td>
          <td>{p.originalPrice && <span className="adm-del">{toman(p.originalPrice)}</span>}<b style={{ color: p.originalPrice ? 'var(--a-primary)' : undefined }}>{toman(p.price)}</b></td>
          <td>{faNumber(p.variantCount)}{p.unavailableCount > 0 && <span style={{ color: '#891414' }}> ({faNumber(p.unavailableCount)} ناموجود)</span>}</td>
          <td><StatusBadge map={PUBLISH} value={p.publishState} /></td><td><Ico n="MoreCircle" /></td></tr>)}
      </Table>
      <Pager page={page} total={extra.total} size={extra.pageSize} onPage={setPage} /></>}
  </>;
}

type Form = { name: string; slug: string; categoryId: number | string; status: string; price: number | string; originalPrice: number | string | null; description: string; variants?: any[]; publishState?: string; images?: any[] };
export function ProductEdit() {
  const { id } = useParams(); const isNew = !id; const me = useMe(); const nav = useNavigate();
  const { data, error, loading, reload } = useLoad<any>(isNew ? null : `/products/${id}`);
  const cats = useLoad<any[]>('/categories');
  const [f, setF] = useState<Form>({ name: '', slug: '', categoryId: '', status: 'default', price: '', originalPrice: '', description: '' });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [confirm, setConfirm] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setF({ ...data, originalPrice: data.originalPrice ?? '' }); }, [data]);
  const edit = can(me, 'products', 'edit');
  if (!can(me, 'products')) return <NoPermission />;
  if (!isNew && loading && !data) return <Loading />; if (error) return error.status === 404 ? <Empty title="محصول پیدا نشد" /> : <ErrorState retry={reload} />;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setSaving(true); setErrs({});
    const body = { ...f, price: Number(f.price), originalPrice: f.originalPrice === '' ? null : Number(f.originalPrice), categoryId: Number(f.categoryId), variants: f.variants?.map(v => ({ id: v.id, available: !!v.available })) };
    try {
      const r = await aapi(isNew ? '/products' : `/products/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast(isNew ? 'پیش‌نویس محصول ساخته شد' : 'تغییرات ذخیره شد'); if (isNew) nav(`/admin/products/${r.data.id}`); else reload();
    } catch (e) { const er = e as AdminApiError; if (er.fields) setErrs(er.fields); toast('ذخیره انجام نشد — خطاها را بررسی کنید', true); }
    finally { setSaving(false); }
  };
  const setState = async (s: string) => { setConfirm(null); try { await aapi(`/products/${id}/state`, { method: 'POST', body: { state: s } }); toast(s === 'published' ? 'محصول منتشر شد' : 'وضعیت محصول تغییر کرد'); reload(); } catch { toast('تغییر وضعیت انجام نشد', true); } };
  const ps = data?.publishState;
  return <>
    <PageTitle crumb={`کاتالوگ / محصولات / ${isNew ? 'افزودن' : f.name}`} title={isNew ? 'افزودن محصول' : f.name || 'محصول'} sub={!isNew && <StatusBadge map={PUBLISH} value={ps} />}
      actions={edit && <>
        <Button kind="primary" onClick={save} disabled={saving}>{isNew ? 'ذخیره پیش‌نویس' : 'ذخیره تغییرات'}</Button>
        {!isNew && ps !== 'published' && ps !== 'archived' && <Button kind="secondary" onClick={() => setConfirm('published')}>انتشار</Button>}
        {!isNew && ps === 'published' && <Button kind="secondary" onClick={() => setConfirm('unpublished')}>توقف انتشار</Button>}
        {!isNew && ps !== 'archived' && <Button onClick={() => setConfirm('archived')} style={{ color: '#891414' }}>بایگانی</Button>}
        {!isNew && ps === 'archived' && <Button kind="secondary" onClick={() => setState('draft')}>بازگردانی به پیش‌نویس</Button>}</>} />
    {!edit && <div className="adm-info">دسترسی شما فقط مشاهده است.</div>}
    <div className="adm-grid2">
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="adm-card"><h2>اطلاعات محصول</h2>
          <Field label="نام محصول" req err={errs.name}><input className={`adm-input${errs.name ? ' bad' : ''}`} value={f.name} onChange={set('name')} disabled={!edit} /></Field>
          <div className="adm-row">
            <Field label="شناسه (نشانی صفحه)" req err={errs.slug}><input className={`adm-input${errs.slug ? ' bad' : ''}`} dir="ltr" value={f.slug} onChange={set('slug')} disabled={!edit} /></Field>
            <Field label="دسته" req err={errs.categoryId}><select className={`adm-select${errs.categoryId ? ' bad' : ''}`} value={f.categoryId} onChange={set('categoryId')} disabled={!edit}><option value="">انتخاب کنید</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          </div>
          <Field label="توضیحات"><textarea className="adm-textarea" value={f.description ?? ''} onChange={set('description')} disabled={!edit} /></Field>
        </section>
        {!isNew && <section className="adm-card"><div className="adm-card-head"><h2>تنوع‌ها و موجودی</h2><Stub code="BD-16">تعداد موجودی</Stub></div>
          <span className="adm-muted">در این نسخه فقط پرچم «موجود / ناموجود» وجود دارد؛ تعداد موجودی و دفتر انبار در فاز ۲ است.</span>
          <Table head={['SKU', 'سایز', 'رنگ', 'موجود']}>{f.variants?.map((v, i) => <tr key={v.id}><td dir="ltr" className="adm-muted">{v.sku}</td><td>{v.size}</td>
            <td><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 99, background: v.colorHex, border: '1px solid #d6d3cf', marginInlineEnd: 6 }} />{v.color}</td>
            <td><label className="adm-check"><input type="checkbox" checked={!!v.available} disabled={!edit} onChange={e => { const vs = [...f.variants!]; vs[i] = { ...v, available: e.target.checked ? 1 : 0 }; setF({ ...f, variants: vs }); }} />{v.available ? 'موجود' : 'ناموجود'}</label></td></tr>)}</Table>
        </section>}
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="adm-card"><h2>قیمت</h2><Stub code="BD-10">منبع قیمت و قوانین تخفیف</Stub>
          <Field label="قیمت (تومان)" req err={errs.price}><input className={`adm-input${errs.price ? ' bad' : ''}`} inputMode="numeric" dir="ltr" value={f.price} onChange={set('price')} disabled={!edit} /></Field>
          <Field label="قیمت قبل از تخفیف (اختیاری)" err={errs.originalPrice}><input className={`adm-input${errs.originalPrice ? ' bad' : ''}`} inputMode="numeric" dir="ltr" value={f.originalPrice ?? ''} onChange={set('originalPrice')} disabled={!edit} /></Field>
          <Field label="نوع نمایش" err={errs.status}><select className="adm-select" value={f.status} onChange={set('status')} disabled={!edit}><option value="default">عادی</option><option value="sale">حراج</option><option value="new">جدید</option></select></Field>
        </section>
        <section className="adm-card"><h2>تصاویر</h2>
          {!isNew && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{data?.images?.map((im: any, i: number) => <img key={i} src={im.url} alt={im.alt} style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 4 }} />)}</div>}
          <div className="adm-warnbox">بارگذاری تصویر به فضای ذخیره‌سازی فایل نیاز دارد و در نسخه‌ی نمایشی غیرفعال است. <Stub code="ADMIN-PH-MEDIA">ذخیره‌سازی</Stub></div>
        </section>
        {!isNew && <Link to={`/product/${f.slug}`} target="_blank" className="adm-btn sm">مشاهده در فروشگاه ↗</Link>}
      </div>
    </div>
    {confirm === 'published' && <Confirm title="انتشار محصول؟" body="محصول بلافاصله در فروشگاه (نسخه‌ی محلی) دیده می‌شود." okLabel="انتشار" onOk={() => setState('published')} onClose={() => setConfirm(null)} />}
    {confirm === 'unpublished' && <Confirm title="توقف انتشار؟" body="محصول از فروشگاه پنهان می‌شود ولی حذف نمی‌شود." okLabel="توقف انتشار" onOk={() => setState('unpublished')} onClose={() => setConfirm(null)} />}
    {confirm === 'archived' && <Confirm danger title="بایگانی محصول؟" body="محصول از فروشگاه و فهرست فعال خارج می‌شود. (حذف دائمی در این نسخه وجود ندارد.)" okLabel="بایگانی" onOk={() => setState('archived')} onClose={() => setConfirm(null)} />}
  </>;
}

export function Categories() {
  const me = useMe(); const { data, error, loading, reload } = useLoad<any[]>(can(me, 'products') ? '/categories' : null);
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [errs, setErrs] = useState<Record<string, string>>({});
  const [ren, setRen] = useState<{ id: number; name: string } | null>(null);
  if (!can(me, 'products')) return <NoPermission />;
  const add = async () => { setErrs({}); try { await aapi('/categories', { method: 'POST', body: { name, slug } }); setName(''); setSlug(''); toast('دسته اضافه شد'); reload(); } catch (e) { setErrs((e as AdminApiError).fields ?? {}); } };
  const rename = async () => { if (!ren) return; try { await aapi(`/categories/${ren.id}`, { method: 'PUT', body: { name: ren.name } }); setRen(null); toast('نام دسته تغییر کرد'); reload(); } catch { toast('تغییر نام انجام نشد', true); } };
  return <>
    <PageTitle crumb="کاتالوگ / دسته‌بندی‌ها" title="دسته‌بندی‌ها" sub={<Stub code="BD-18">ساختار دسته‌بندی و جدول سایز</Stub>} />
    {can(me, 'products', 'edit') && <section className="adm-card"><h2>افزودن دسته</h2><div className="adm-filters">
      <Field label="نام" req err={errs.name || undefined}><input className="adm-input" value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="شناسه لاتین" req err={errs.slug}><input className="adm-input" dir="ltr" value={slug} onChange={e => setSlug(e.target.value)} /></Field>
      <Button kind="primary" onClick={add}>افزودن</Button></div></section>}
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> :
      <Table head={['نام', 'شناسه', 'تعداد محصول', '']}>{data!.map(c => <tr key={c.id}><td><b>{c.name}</b></td><td dir="ltr" className="adm-muted">{c.slug}</td><td>{faNumber(c.products)}</td>
        <td>{can(me, 'products', 'edit') && <Button sm onClick={() => setRen({ id: c.id, name: c.name })}>تغییر نام</Button>}</td></tr>)}</Table>}
    {ren && <Confirm title="تغییر نام دسته" body={<Field label="نام جدید"><input className="adm-input" value={ren.name} onChange={e => setRen({ ...ren, name: e.target.value })} autoFocus /></Field>} okLabel="ذخیره" onOk={rename} onClose={() => setRen(null)} />}
    <span className="adm-muted">حذف دسته در این نسخه وجود ندارد (قوانین جابه‌جایی محصولات در انتظار تصمیم). {fa('')}</span>
  </>;
}
