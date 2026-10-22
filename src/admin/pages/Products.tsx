// Figma Products 178:24124 (List 178:16092, Edit 178:18759, Create 178:18374, Create error 178:19219, Publish confirm 178:19734, Archive 178:19769)
// Categories 178:19800 (+ modal 178:20385, empty 178:20158). r2: Emma review fixes P2, E1–E4, C1.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLoad } from './hooks';
import { aapi, AdminApiError } from '../api';
import { Badge, Banner, Button, Confirm, Empty, ErrorState, Field, Loading, Modal, NoPermission, Overflow, PageTitle, Pager, PUBLISH, StatusBadge, Stub, Table, Tabs, toast, toman } from '../ui';
import { faNumber } from '../../lib/format';
import { useMe, can } from '../AdminApp';

/** Admin / Table Filters 174:14239: search + status select + date picker (disabled, phase 2) + «فیلترهای بیشتر» ghost (disabled). */
export function FiltersRow({ q, onQ, ph, children }: { q: string; onQ: (v: string) => void; ph: string; children?: React.ReactNode }) {
  return <div className="adm-filters">
    <Field label="جستجو" grow><input className="adm-input" placeholder={ph} value={q} onChange={e => onQ(e.target.value)} /></Field>
    {children}
    <Field label="تاریخ"><span className="adm-input" aria-disabled="true" title="فیلتر تاریخ — فاز ۲" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--s-neutral-bg)', color: 'var(--a-text-2)' }}><img src="/admin-icons/Calender1.svg" alt="" />از تاریخ — تا تاریخ</span></Field>
    <Button ico="Add" disabled title="فاز ۲">فیلترهای بیشتر</Button>
  </div>;
}

const STATES: [string, string][] = [['', 'همه'], ['published', 'منتشر شده'], ['draft', 'پیش‌نویس'], ['unpublished', 'متوقف'], ['archived', 'بایگانی']];
export function ProductsList() {
  const me = useMe(); const nav = useNavigate();
  const [state, setState] = useState(''); const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [page, setPage] = useState(1);
  const qs = new URLSearchParams({ state, q, category: cat, page: String(page) }).toString();
  const { data, extra, error, loading, reload } = useLoad<any[]>(can(me, 'products') ? `/products?${qs}` : null);
  const cats = useLoad<any[]>(can(me, 'products') ? '/categories' : null);
  if (!can(me, 'products')) return <NoPermission crumb="کاتالوگ / محصولات" title="محصولات" />;
  const counts = extra?.counts ?? {};
  return <>
    <PageTitle crumb="کاتالوگ / محصولات" title="محصولات" sub={`${faNumber(extra?.allCount ?? 0)} محصول · داده نمونه`}
      actions={can(me, 'products', 'edit') && <><Button kind="primary" ico="Add1" onClick={() => nav('/admin/products/new')}>افزودن محصول</Button>
        <Button ico="Download" disabled title="خروجی فایل در نسخه‌ی نمایشی نیست">خروجی (نمونه اولیه)</Button></>} />
    <Tabs items={STATES.map(([k, l]) => [k, l, k ? counts[k] ?? 0 : extra?.allCount])} value={state} onChange={v => { setState(v); setPage(1); }} />
    <FiltersRow q={q} onQ={v => { setQ(v); setPage(1); }} ph="جستجو در نام، شناسه…">
      <Field label="وضعیت"><select className="adm-select" value={state} onChange={e => { setState(e.target.value); setPage(1); }}>{STATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="دسته"><select className="adm-select" value={cat} onChange={e => { setCat(e.target.value); setPage(1); }}><option value="">همه</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.parentName ? `${c.parentName} · ` : ''}{c.name}</option>)}</select></Field>
    </FiltersRow>
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length ? <Empty title={q || state || cat ? 'نتیجه‌ای پیدا نشد' : 'هنوز محصولی ثبت نشده'}>فیلترها را تغییر دهید.</Empty> : <>
      <Table head={['محصول', 'دسته', 'قیمت (تومان)', 'تنوع', 'وضعیت', '']}>
        {data.map(p => <tr key={p.id} className="click" onClick={() => nav(`/admin/products/${p.id}`)}>
          <td><div className="adm-prod">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span className="adm-thumb" />}<div><b>{p.name}</b><small dir="ltr">{p.slug}</small></div></div></td>
          <td>{p.categoryName}</td>
          <td className="nw">{p.originalPrice && <span className="adm-del">{toman(p.originalPrice)}</span>}<b style={{ color: p.originalPrice ? 'var(--a-primary)' : undefined }}>{toman(p.price)}</b></td>
          <td>{faNumber(p.variantCount)}{p.unavailableCount > 0 && <span style={{ color: '#891414' }}> ({faNumber(p.unavailableCount)} ناموجود)</span>}</td>
          <td><StatusBadge map={PUBLISH} value={p.publishState} /></td>
          <td><Overflow label={`گزینه‌های ${p.name}`} items={[{ label: 'ویرایش', onClick: () => nav(`/admin/products/${p.id}`) }, { label: 'مشاهده در فروشگاه', onClick: () => window.open(`/product/${p.slug}`, '_blank') }]} /></td></tr>)}
      </Table>
      <Pager page={page} total={extra.total} size={extra.pageSize} onPage={setPage} /></>}
  </>;
}

type Form = { name: string; slug: string; categoryId: number | string; status: string; price: number | string; originalPrice: number | string | null; description: string; variants?: any[]; publishState?: string; images?: any[] };
const FIELD_LABEL: Record<string, string> = { name: 'نام محصول', slug: 'شناسه', price: 'قیمت', originalPrice: 'قیمت قبل از تخفیف', categoryId: 'دسته', status: 'نوع نمایش' };
export function ProductEdit() {
  const { id } = useParams(); const isNew = !id; const me = useMe(); const nav = useNavigate();
  const { data, error, loading, reload } = useLoad<any>(isNew ? null : `/products/${id}`);
  const cats = useLoad<any[]>('/categories');
  const [f, setF] = useState<Form>({ name: '', slug: '', categoryId: '', status: 'default', price: '', originalPrice: '', description: '' });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [confirm, setConfirm] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => { if (data) setF({ ...data, originalPrice: data.originalPrice ?? '' }); }, [data]);
  const edit = can(me, 'products', 'edit');
  if (!can(me, 'products')) return <NoPermission crumb="کاتالوگ / محصولات" title="محصولات" />;
  if (!isNew && loading && !data) return <Loading />; if (error) return error.status === 404 ? <Empty title="محصول پیدا نشد" /> : <ErrorState retry={reload} />;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setSaving(true); setErrs({});
    const body = { ...f, price: Number(f.price), originalPrice: f.originalPrice === '' ? null : Number(f.originalPrice), categoryId: Number(f.categoryId), variants: f.variants?.map(v => ({ id: v.id, available: !!v.available })) };
    try {
      const r = await aapi(isNew ? '/products' : `/products/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast(isNew ? 'پیش‌نویس محصول ساخته شد' : 'تغییرات ذخیره شد'); setSavedAt(new Date().toISOString()); if (isNew) nav(`/admin/products/${r.data.id}`); else reload();
    } catch (e) { const er = e as AdminApiError; if (er.fields) setErrs(er.fields); else toast('ذخیره انجام نشد', true); } // E4: field errors → top banner + inline, no toast
    finally { setSaving(false); }
  };
  const setState = async (s: string) => { setConfirm(null); try { await aapi(`/products/${id}/state`, { method: 'POST', body: { state: s } }); toast(s === 'published' ? 'محصول منتشر شد' : 'وضعیت محصول تغییر کرد'); reload(); } catch { toast('تغییر وضعیت انجام نشد', true); } };
  const ps = data?.publishState;
  const errKeys = Object.keys(errs);
  // «چک‌لیست انتشار» (Figma 178:18759). Items are a SAMPLE checklist; size guide is BD-18.
  const checks: [string, boolean | null][] = [
    ['نام و توضیحات', !!f.name.trim() && !!(f.description ?? '').trim()],
    ['دسته', !!f.categoryId],
    ['حداقل یک تصویر + متن جایگزین', !!data?.images?.length && data.images.every((i: any) => i.alt)],
    ['قیمت بیشتر از صفر', Number(f.price) > 0],
    ['حداقل یک تنوع فعال یا موجود', !!f.variants?.some(v => v.available)],
    ['راهنمای سایز', null],
  ];
  const ready = checks.every(([, v]) => v !== false);
  return <>
    <PageTitle crumb={`کاتالوگ / محصولات / ${isNew ? 'افزودن محصول' : f.name}`} title={isNew ? 'افزودن محصول' : data?.name || 'محصول'} sub={!isNew && 'ویرایش · داده نمونه'}
      actions={edit && (isNew
        ? <><Button kind="primary" ico="TickWhite" onClick={save} disabled={saving}>ذخیره پیش‌نویس</Button><Button kind="secondary" ico="CloseTeal" onClick={() => nav('/admin/products')}>انصراف</Button></>
        : <>{ps !== 'published' && ps !== 'archived' && <Button kind="primary" ico="Upload" onClick={() => setConfirm('published')}>انتشار</Button>}
          <Button kind={ps === 'published' ? 'primary' : 'secondary'} ico={ps === 'published' ? 'TickWhite' : undefined} onClick={save} disabled={saving}>ذخیره تغییرات</Button>
          <a className="adm-btn" href={`/product/${f.slug}`} target="_blank" rel="noreferrer"><img src="/admin-icons/Show.svg" alt="" />پیش‌نمایش</a>
          {ps === 'published' && <Button kind="secondary" onClick={() => setConfirm('unpublished')}>توقف انتشار</Button>}
          {ps !== 'archived' ? <Button kind="danger" onClick={() => setConfirm('archived')}>بایگانی</Button> : <Button kind="secondary" onClick={() => setState('draft')}>بازگردانی به پیش‌نویس</Button>}
          <Button kind="secondary" ico="CloseTeal" onClick={() => nav('/admin/products')}>انصراف</Button></>)} />
    {errKeys.length > 0 && <Banner tone="danger">{faNumber(errKeys.length)} خطا: {errKeys.map(k => FIELD_LABEL[k] ?? k).join('، ')} را تکمیل یا اصلاح کنید.</Banner>}
    {!edit && <Banner tone="info">دسترسی شما فقط مشاهده است.</Banner>}
    <div className="adm-grid2">
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="adm-card"><h2>اطلاعات پایه</h2>
          <Field label="نام محصول" req err={errs.name}><input className={`adm-input${errs.name ? ' bad' : ''}`} value={f.name} onChange={set('name')} disabled={!edit} /></Field>
          <Field label="توضیحات"><textarea className="adm-textarea" value={f.description ?? ''} onChange={set('description')} disabled={!edit} /></Field>
          <div className="adm-row">
            <Field label="دسته" req err={errs.categoryId}><select className={`adm-select${errs.categoryId ? ' bad' : ''}`} value={f.categoryId} onChange={set('categoryId')} disabled={!edit}><option value="">انتخاب کنید</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.parentName ? `${c.parentName} · ` : ''}{c.name}</option>)}</select></Field>
            <Field label="شناسه (نشانی صفحه)" req err={errs.slug}><input className={`adm-input${errs.slug ? ' bad' : ''}`} dir="ltr" value={f.slug} onChange={set('slug')} disabled={!edit} /></Field>
          </div>
        </section>
        <section className="adm-card"><h2>تصاویر</h2>
          {!isNew && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{data?.images?.map((im: any, i: number) => <img key={i} src={im.url} alt={im.alt} style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 4 }} />)}</div>}
          <Banner tone="warning">بارگذاری تصویر به فضای ذخیره‌سازی فایل نیاز دارد و در نسخه‌ی نمایشی غیرفعال است (ADMIN-PH-MEDIA).</Banner>
        </section>
        <section className="adm-card"><h2>قیمت</h2>
          <div className="adm-row">
            <Field label="قیمت (تومان)" req err={errs.price}><input className={`adm-input${errs.price ? ' bad' : ''}`} inputMode="numeric" dir="ltr" value={f.price} onChange={set('price')} disabled={!edit} /></Field>
            <Field label="قیمت قبل از تخفیف (اختیاری)" err={errs.originalPrice}><input className={`adm-input${errs.originalPrice ? ' bad' : ''}`} inputMode="numeric" dir="ltr" value={f.originalPrice ?? ''} onChange={set('originalPrice')} disabled={!edit} /></Field>
            <Field label="نوع نمایش" err={errs.status}><select className="adm-select" value={f.status} onChange={set('status')} disabled={!edit}><option value="default">عادی</option><option value="sale">حراج</option><option value="new">جدید</option></select></Field>
          </div>
          <Banner tone="warning">منبع قیمت و قوانین تخفیف در انتظار تصمیم کسب‌وکار است (BD-10).</Banner>
        </section>
        {!isNew && <section className="adm-card"><div className="adm-card-head"><h2>تنوع‌ها (سایز / رنگ)</h2><Stub code="BD-16">تعداد موجودی</Stub></div>
          <Table head={['تنوع', 'SKU', 'موجود', 'وضعیت']}>{f.variants?.map((v, i) => <tr key={v.id}>
            <td><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 99, background: v.colorHex, border: '1px solid #d6d3cf', marginInlineEnd: 6 }} />{v.color} · {v.size}</td>
            <td dir="ltr" className="adm-muted">{v.sku}</td>
            <td><label className="adm-check"><input type="checkbox" checked={!!v.available} disabled={!edit} onChange={e => { const vs = [...f.variants!]; vs[i] = { ...v, available: e.target.checked ? 1 : 0 }; setF({ ...f, variants: vs }); }} />موجود</label></td>
            <td>{v.available ? <Badge tone="success">موجود</Badge> : <Badge tone="danger">ناموجود</Badge>}</td></tr>)}</Table>
          <span className="adm-muted">فقط پرچم «موجود / ناموجود» (BD-16)؛ شمارنده‌ی موجودی در فاز ۲.</span>
        </section>}
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="adm-card"><h2>وضعیت</h2>
          <div>{isNew ? <Badge tone="neutral">پیش‌نویس · ذخیره نشده</Badge> : <StatusBadge map={PUBLISH} value={ps} />}{!isNew && ps === 'draft' && ready && <span className="adm-muted"> · آماده انتشار</span>}</div>
          <span className="adm-muted">{savedAt ? `آخرین ذخیره: همین حالا` : isNew ? 'هنوز ذخیره نشده' : 'داده نمونه'}</span>
        </section>
        <section className="adm-card"><h2>چک‌لیست انتشار</h2>
          <ul className="adm-check-list">{checks.map(([l, v]) => <li key={l} className={v ? 'yes' : 'no'}><span className="c">{v ? <img src="/admin-icons/TickCircle.svg" alt="انجام شد" width="20" /> : null}</span>{l}{v === null && <Stub code="BD-18">در انتظار تصمیم</Stub>}</li>)}</ul>
          <Banner tone="info">{ready ? 'موارد قابل بررسی کامل است؛ آماده انتشار.' : 'برای انتشار، موارد باقی‌مانده را تکمیل کنید.'} (چک‌لیست نمونه)</Banner>
        </section>
      </div>
    </div>
    {confirm === 'published' && <Confirm title="انتشار محصول؟" body="محصول بلافاصله در فروشگاه (نسخه‌ی محلی) دیده می‌شود." okLabel="انتشار" onOk={() => setState('published')} onClose={() => setConfirm(null)} />}
    {confirm === 'unpublished' && <Confirm title="توقف انتشار؟" body="محصول از فروشگاه پنهان می‌شود ولی حذف نمی‌شود." okLabel="توقف انتشار" onOk={() => setState('unpublished')} onClose={() => setConfirm(null)} />}
    {confirm === 'archived' && <Confirm danger title="بایگانی محصول؟" body="محصول از فروشگاه و فهرست فعال خارج می‌شود. (حذف دائمی در این نسخه وجود ندارد.)" okLabel="بایگانی" onOk={() => setState('archived')} onClose={() => setConfirm(null)} />}
  </>;
}

export function Categories() {
  const me = useMe(); const { data, error, loading, reload } = useLoad<any[]>(can(me, 'products') ? '/categories' : null);
  const [modal, setModal] = useState<null | { id?: number; name: string; slug: string; parentId: string }>(null); const [errs, setErrs] = useState<Record<string, string>>({});
  if (!can(me, 'products')) return <NoPermission crumb="کاتالوگ / دسته‌بندی‌ها" title="دسته‌بندی‌ها" />;
  const edit = can(me, 'products', 'edit');
  const submit = async () => {
    if (!modal) return; setErrs({});
    try {
      if (modal.id) await aapi(`/categories/${modal.id}`, { method: 'PUT', body: { name: modal.name } });
      else await aapi('/categories', { method: 'POST', body: { name: modal.name, slug: modal.slug, parentId: modal.parentId || null } });
      toast(modal.id ? 'دسته ویرایش شد' : 'دسته اضافه شد'); setModal(null); reload();
    } catch (e) { setErrs((e as AdminApiError).fields ?? {}); }
  };
  const roots = (data ?? []).filter(c => !c.parentId);
  return <>
    <PageTitle crumb="کاتالوگ / دسته‌بندی‌ها" title="دسته‌بندی‌ها" sub="طبقه‌بندی نمونه — در انتظار تصمیم کسب‌وکار (BD-18)"
      actions={edit && <Button kind="primary" ico="Add1" onClick={() => { setErrs({}); setModal({ name: '', slug: '', parentId: '' }); }}>افزودن دسته</Button>} />
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length ? <Empty title="هنوز دسته‌ای ساخته نشده" /> :
      <div className="adm-tree"><Table head={['نام دسته', 'والد', 'تعداد محصول', 'نمایش (نمونه)', '']}>{data.map(c => <tr key={c.id} className={c.parentId ? 'child' : ''}>
        <td>{c.parentId ? <span className="adm-muted">— </span> : <img src="/admin-icons/Category1.svg" alt="" style={{ marginInlineEnd: 8, verticalAlign: 'middle' }} />}{c.name}</td>
        <td>{c.parentName ?? '—'}</td><td>{faNumber(c.products)}</td><td title="نمونه — دسته‌ها فیلد وضعیت ندارند (BD-18)"><Badge tone="neutral">فعال · نمونه</Badge></td>
        <td>{edit && <Overflow label={`گزینه‌های ${c.name}`} items={[{ label: 'ویرایش', onClick: () => { setErrs({}); setModal({ id: c.id, name: c.name, slug: c.slug, parentId: c.parentId ?? '' }); } },
          { label: 'حذف', onClick: () => {}, disabled: true, hint: 'در انتظار تصمیم (BD-18)' }]} />}</td></tr>)}</Table></div>}
    <span className="adm-muted">وضعیت «نمایش» و حذف دسته در این نسخه قابل تغییر نیست (BD-18).</span>
    {modal && <Modal title={modal.id ? 'ویرایش دسته' : 'افزودن دسته'} onClose={() => setModal(null)}
      foot={<><Button kind="primary" ico="TickWhite" onClick={submit}>{modal.id ? 'ذخیره' : 'افزودن دسته'}</Button><Button kind="secondary" ico="CloseTeal" onClick={() => setModal(null)}>انصراف</Button></>}>
      <Field label="نام دسته" req err={errs.name || undefined}><input className={`adm-input${errs.name ? ' bad' : ''}`} value={modal.name} onChange={e => setModal({ ...modal, name: e.target.value })} autoFocus /></Field>
      {!modal.id && <><Field label="شناسه لاتین" req err={errs.slug}><input className={`adm-input${errs.slug ? ' bad' : ''}`} dir="ltr" value={modal.slug} onChange={e => setModal({ ...modal, slug: e.target.value })} /></Field>
        <Field label="دسته‌ی والد (اختیاری)" err={errs.parentId}><select className="adm-select" value={modal.parentId} onChange={e => setModal({ ...modal, parentId: e.target.value })}><option value="">— بدون والد (دسته‌ی اصلی)</option>{roots.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field></>}
      <Banner tone="info">ساختار دسته‌بندی نمونه است و فقط یک سطح زیردسته پشتیبانی می‌شود (BD-18).</Banner>
    </Modal>}
  </>;
}
