// Figma Products 178:24124 (List 178:16092, Edit 178:18759, Create 178:18374, Create error 178:19219, Publish confirm 178:19734, Archive 178:19769)
// Categories 178:19800 (+ modal 178:20385, empty 178:20158). r2: Emma review fixes P2, E1–E4, C1.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLoad } from './hooks';
import { aapi, aupload, AdminApiError } from '../api';
import { Badge, Banner, Button, Confirm, DatePicker, Empty, fa, MCard, MList, useMobile, ErrorState, Field, Loading, Modal, NoPermission, Overflow, PageTitle, Pager, PUBLISH, StatusBadge, Stub, Table, Tabs, toast, toman } from '../ui';
import { faNumber } from '../../lib/format';
import { useMe, can } from '../AdminApp';
import { AdjustStock, StockBadge, type Row } from './Inventory';

/** Admin / Table Filters 174:14239: search + status select + date picker (disabled, phase 2) + «فیلترهای بیشتر» ghost (disabled). */
export function FiltersRow({ q, onQ, ph, children, range }: { q: string; onQ: (v: string) => void; ph: string; children?: React.ReactNode;
  range?: { from: string; to: string; onChange: (from: string, to: string) => void } }) {
  // admin-v1: where the API supports it, the date filter is the DS Date Picker 173:14077 (Jalali; two single pickers از / تا).
  return <div className="adm-filters">
    <Field label="جستجو" grow><input className="adm-input" placeholder={ph} value={q} onChange={e => onQ(e.target.value)} /></Field>
    {children}
    {range ? <><DatePicker label="از تاریخ" value={range.from} max={range.to || undefined} onChange={v => range.onChange(v, range.to)} />
      <DatePicker label="تا تاریخ" value={range.to} min={range.from || undefined} onChange={v => range.onChange(range.from, v)} /></> : <Field label="تاریخ"><span className="adm-input" aria-disabled="true" title="فیلتر تاریخ — فاز ۲" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--s-neutral-bg)', color: 'var(--a-text-2)' }}><img src="/admin-icons/Calender1.svg" alt="" />از تاریخ — تا تاریخ</span></Field>}
    <Button ico="Add" disabled title="فاز ۲">فیلترهای بیشتر</Button>
  </div>;
}

const STATES: [string, string][] = [['', 'همه'], ['published', 'منتشر شده'], ['draft', 'پیش‌نویس'], ['unpublished', 'متوقف'], ['archived', 'بایگانی']];
export function ProductsList() {
  const me = useMe(); const nav = useNavigate();
  const [state, setState] = useState(''); const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [page, setPage] = useState(1);
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const mobile = useMobile();
  const qs = new URLSearchParams({ state, q, category: cat, from, to, page: String(page) }).toString();
  const { data, extra, error, loading, reload } = useLoad<any[]>(can(me, 'products') ? `/products?${qs}` : null);
  const cats = useLoad<any[]>(can(me, 'products') ? '/categories' : null);
  if (!can(me, 'products')) return <NoPermission crumb="کاتالوگ / محصولات" title="محصولات" />;
  const counts = extra?.counts ?? {};
  return <>
    <PageTitle crumb="کاتالوگ / محصولات" title="محصولات" sub={`${faNumber(extra?.allCount ?? 0)} محصول · داده نمونه`}
      actions={can(me, 'products', 'edit') && <><Button kind="primary" ico="Add1" onClick={() => nav('/admin/products/new')}>افزودن محصول</Button>
        <Button ico="Download" disabled title="خروجی فایل در نسخه‌ی نمایشی نیست">خروجی (نمونه اولیه)</Button></>} />
    <Tabs items={STATES.map(([k, l]) => [k, l, k ? counts[k] ?? 0 : extra?.allCount])} value={state} onChange={v => { setState(v); setPage(1); }} />
    <FiltersRow q={q} onQ={v => { setQ(v); setPage(1); }} ph="جستجو در نام، شناسه…" range={{ from, to, onChange: (a, b) => { setFrom(a); setTo(b); setPage(1); } }}>
      <Field label="وضعیت"><select className="adm-select" value={state} onChange={e => { setState(e.target.value); setPage(1); }}>{STATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
      <Field label="دسته"><select className="adm-select" value={cat} onChange={e => { setCat(e.target.value); setPage(1); }}><option value="">همه</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.parentName ? `${c.parentName} · ` : ''}{c.name}</option>)}</select></Field>
    </FiltersRow>
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length ? <Empty title={q || state || cat || from || to ? 'نتیجه‌ای پیدا نشد' : 'هنوز محصولی ثبت نشده'}>فیلترها را تغییر دهید.</Empty> : <>
      {mobile ? <MList>{data.map(p => <MCard key={p.id} onClick={() => nav(`/admin/products/${p.id}`)} label={`ویرایش ${p.name}`}>
          <div className="adm-mrow"><div className="adm-prod">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span className="adm-thumb" />}<div><b>{p.name}</b><small>{p.categoryName}</small></div></div><StatusBadge map={PUBLISH} value={p.publishState} /></div>
          <div className="adm-mrow"><PriceCell p={p} /><span>موجودی: <StockCell s={p.stock} /></span></div></MCard>)}</MList>
      : <Table head={['محصول', 'دسته', 'قیمت (تومان)', 'موجودی کل', 'وضعیت', '']}>
        {data.map(p => <tr key={p.id} className="click" onClick={() => nav(`/admin/products/${p.id}`)}>
          <td><div className="adm-prod">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span className="adm-thumb" />}<div><b>{p.name}</b><small dir="ltr">{p.slug}</small></div></div></td>
          <td>{p.categoryName}</td>
          <td className="nw"><PriceCell p={p} /></td>
          <td><StockCell s={p.stock} /></td>
          <td><StatusBadge map={PUBLISH} value={p.publishState} /></td>
          <td onClick={e => e.stopPropagation()}><Overflow label={`گزینه‌های ${p.name}`} items={[{ label: 'ویرایش', onClick: () => nav(`/admin/products/${p.id}`) }, { label: 'مشاهده در فروشگاه', onClick: () => window.open(`/product/${p.slug}`, '_blank') }]} /></td></tr>)}
      </Table>}
      <Pager page={page} total={extra.total} size={extra.pageSize} onPage={setPage} /></>}
  </>;
}

const PriceCell = ({ p }: { p: any }) => p.price == null ? <span className="adm-muted" title="بدون قیمت — در فروشگاه «قیمت به‌زودی» نمایش داده می‌شود">بدون قیمت</span>
  : <span>{p.originalPrice && <span className="adm-del">{toman(p.originalPrice)}</span>}<b style={{ color: p.originalPrice ? 'var(--a-primary)' : undefined }}>{toman(p.price)}</b></span>;
/** Figma 178:16092 «موجودی کل»: «۲۴ (۲ کم)» · «۰ · ناموجود»; untracked = only the shop flag (before the first count). */
const StockCell = ({ s }: { s: { total: number | null; low: number; out: number; tracked: number; variants: number } | null }) => !s || s.tracked === 0
  ? <span className="adm-muted" title="موجودی هنوز شمارش نشده؛ فقط پرچم موجود / ناموجود">ثبت نشده</span>
  : s.total === 0 ? <span style={{ color: '#891414' }}>۰ · ناموجود</span>
  : <span>{faNumber(s.total ?? 0)}{s.low > 0 && <span style={{ color: '#986104' }}> ({faNumber(s.low)} کم)</span>}{s.out > 0 && <span style={{ color: '#891414' }}> ({faNumber(s.out)} ناموجود)</span>}</span>;

type Form = { name: string; slug: string; categoryId: number | string; status: string; price: number | string; originalPrice: number | string | null; description: string; variants?: any[]; publishState?: string; images?: any[] };
const FIELD_LABEL: Record<string, string> = { name: 'نام محصول', slug: 'شناسه', price: 'قیمت', originalPrice: 'قیمت قبل از تخفیف', categoryId: 'دسته', status: 'نوع نمایش' };
export function ProductEdit() {
  const { id } = useParams(); const isNew = !id; const me = useMe(); const nav = useNavigate();
  const { data, extra, error, loading, reload } = useLoad<any>(isNew ? null : `/products/${id}`);
  const cats = useLoad<any[]>('/categories');
  const [f, setF] = useState<Form>({ name: '', slug: '', categoryId: '', status: 'default', price: '', originalPrice: '', description: '' });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [confirm, setConfirm] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => { if (data) setF({ ...data, price: data.price ?? '', originalPrice: data.originalPrice ?? '' }); }, [data]); // admin-v1: real catalogue may have no price (NULL)
  const edit = can(me, 'products', 'edit');
  if (!can(me, 'products')) return <NoPermission crumb="کاتالوگ / محصولات" title="محصولات" />;
  if (!isNew && loading && !data) return <Loading />; if (error) return error.status === 404 ? <Empty title="محصول پیدا نشد" /> : <ErrorState retry={reload} />;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setSaving(true); setErrs({});
    const body = { ...f, price: String(f.price).trim() === '' ? null : Number(f.price), originalPrice: f.originalPrice === '' ? null : Number(f.originalPrice), categoryId: Number(f.categoryId), variants: f.variants?.map(v => ({ id: v.id, available: !!v.available })) };
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
    ['دسته', !!f.categoryId], // Figma «دسته و جنسیت»: no gender field in the data model (Figma gap, BD-18)
    ['حداقل یک تصویر + متن جایگزین', !!data?.images?.length && data.images.every((i: any) => i.alt)],
    ['قیمت بیشتر از صفر', Number(f.price) > 0],
    ['حداقل یک تنوع فعال با موجودی', !!f.variants?.some(v => v.onHand == null ? v.available : v.stockAvailable > 0)],
    ['راهنمای سایز', null],
  ];
  const ready = checks.every(([, v]) => v !== false);
  return <>
    <PageTitle crumb={`کاتالوگ / محصولات / ${isNew ? 'افزودن محصول' : f.name}`} title={isNew ? 'افزودن محصول' : data?.name || 'محصول'} sub={!isNew && 'ویرایش · داده نمونه'}
      actions={edit && (isNew
        ? <><Button kind="primary" ico="TickWhite" onClick={save} disabled={saving}>ذخیره پیش‌نویس</Button><Button kind="secondary" ico="CloseTeal" onClick={() => nav('/admin/products')}>انصراف</Button></>
        : <>{ps !== 'published' && ps !== 'archived' && <Button kind="primary" ico="Upload" onClick={() => setConfirm('published')}>انتشار</Button>}
          <Button kind={ps === 'published' ? 'primary' : 'secondary'} ico={ps === 'published' ? 'TickWhite' : undefined} onClick={save} disabled={saving}>ذخیره تغییرات</Button>
          <a className="adm-btn" href={`/product/${f.slug}`} target="_blank" rel="noreferrer"><img src="/admin-icons/Show.svg" alt="" />پیش‌نمایش در سایت</a>
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
          {isNew ? <Banner tone="info">ابتدا پیش‌نویس را ذخیره کنید؛ سپس می‌توانید تصویر بارگذاری کنید.</Banner>
            : <ImagesSection id={Number(id)} images={data?.images ?? []} media={extra?.media} edit={edit} onChange={reload} />}
        </section>
        <section className="adm-card"><h2>قیمت</h2>
          <div className="adm-row">
            <Field label="قیمت (تومان، خالی = بدون قیمت)" err={errs.price}><input className={`adm-input${errs.price ? ' bad' : ''}`} inputMode="numeric" dir="ltr" value={f.price} onChange={set('price')} disabled={!edit} /></Field>
            <Field label="قیمت قبل از تخفیف (اختیاری)" err={errs.originalPrice}><input className={`adm-input${errs.originalPrice ? ' bad' : ''}`} inputMode="numeric" dir="ltr" value={f.originalPrice ?? ''} onChange={set('originalPrice')} disabled={!edit} /></Field>
            <Field label="نوع نمایش" err={errs.status}><select className="adm-select" value={f.status} onChange={set('status')} disabled={!edit}><option value="default">عادی</option><option value="sale">حراج</option><option value="new">جدید</option></select></Field>
          </div>
          <Banner tone="warning">منبع قیمت و قوانین تخفیف در انتظار تصمیم کسب‌وکار است (BD-10).</Banner>
        </section>
        {!isNew && <VariantsSection id={Number(id)} variants={f.variants ?? []} edit={edit} onFlag={(i, on) => { const vs = [...f.variants!]; vs[i] = { ...vs[i], available: on ? 1 : 0 }; setF({ ...f, variants: vs }); }} onChange={reload} />}
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="adm-card"><h2>وضعیت</h2>
          <div>{isNew ? <Badge tone="neutral">پیش‌نویس · ذخیره نشده</Badge> : <StatusBadge map={PUBLISH} value={ps} />}{!isNew && ps === 'draft' && ready && <span className="adm-muted"> · آماده انتشار</span>}</div>
          <span className="adm-muted">{savedAt ? `آخرین ذخیره: ${new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(savedAt))}` : isNew ? 'هنوز ذخیره نشده' : 'داده نمونه'}</span>
        </section>
        <section className="adm-card"><h2>چک‌لیست انتشار</h2>
          <ul className="adm-check-list">{checks.map(([l, v]) => <li key={l} className={v ? 'yes' : 'no'}><span className="c">{v ? <img src="/admin-icons/TickCircle.svg" alt="انجام شد" width="20" /> : null}</span>{l}{v === null && <Stub code="BD-18">در انتظار تصمیم</Stub>}</li>)}</ul>
          <Banner tone="info">{ready ? 'همه موارد کامل است؛ آماده انتشار.' : 'برای انتشار، موارد باقی‌مانده را تکمیل کنید.'} (چک‌لیست نمونه)</Banner>
        </section>
      </div>
    </div>
    {confirm === 'published' && <Confirm title="انتشار محصول؟" body="محصول بلافاصله در فروشگاه (نسخه‌ی محلی) دیده می‌شود." okLabel="انتشار" onOk={() => setState('published')} onClose={() => setConfirm(null)} />}
    {confirm === 'unpublished' && <Confirm title="توقف انتشار؟" body="محصول از فروشگاه پنهان می‌شود ولی حذف نمی‌شود." okLabel="توقف انتشار" onOk={() => setState('unpublished')} onClose={() => setConfirm(null)} />}
    {confirm === 'archived' && <Confirm danger title="بایگانی محصول؟" body="محصول از فروشگاه و فهرست فعال خارج می‌شود. (حذف دائمی در این نسخه وجود ندارد.)" okLabel="بایگانی" onOk={() => setState('archived')} onClose={() => setConfirm(null)} />}
  </>;
}

const MB = 1024 * 1024;
const MIME_OK = ['image/jpeg', 'image/png', 'image/webp'];
/** Figma 178:18759 «تصاویر»: upload (JPG/PNG/WebP ≤ 5 MB, alt REQUIRED), alt edit, cover, detach (the stored file is never deleted). */
function ImagesSection({ id, images, media, edit, onChange }: { id: number; images: any[]; media?: { maxBytes: number; driver: string }; edit: boolean; onChange: () => void }) {
  const [file, setFile] = useState<File | null>(null); const [alt, setAlt] = useState(''); const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [over, setOver] = useState(false); const [alts, setAlts] = useState<Record<number, string>>({}); const [altErr, setAltErr] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<string | null>(null); const [detach, setDetach] = useState<any>(null);
  const max = media?.maxBytes ?? 5 * MB;
  useEffect(() => { if (!file) { setPreview(null); return; } const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }, [file]);
  const pick = (f: File | undefined) => { if (!f) return; const e: Record<string, string> = {};
    if (!MIME_OK.includes(f.type)) e.file = 'فقط تصویر JPG، PNG یا WebP مجاز است'; else if (f.size > max) e.file = 'حجم تصویر باید حداکثر ۵ مگابایت باشد';
    setErrs(e); setFile(e.file ? null : f); };
  const upload = async () => {
    const e: Record<string, string> = {}; if (!file) e.file = 'یک تصویر انتخاب کنید'; if (!alt.trim()) e.alt = 'متن جایگزین (alt) الزامی است'; else if (alt.trim().length > 200) e.alt = 'متن جایگزین حداکثر ۲۰۰ کاراکتر';
    setErrs(e); if (Object.keys(e).length) return;
    setBusy(true);
    try { await aupload(`/products/${id}/images?alt=${encodeURIComponent(alt.trim())}`, file!); toast('تصویر بارگذاری شد'); setFile(null); setAlt(''); onChange(); }
    catch (er) { const x = er as AdminApiError; if (x.fields) setErrs(x.fields); else toast('بارگذاری انجام نشد', true); } finally { setBusy(false); }
  };
  const put = async (im: any, body: object, ok: string) => { try { await aapi(`/products/${id}/images/${im.id}`, { method: 'PUT', body }); toast(ok); setAltErr({ ...altErr, [im.id]: '' }); onChange(); }
    catch (er) { const x = er as AdminApiError; if (x.fields?.alt) setAltErr({ ...altErr, [im.id]: x.fields.alt }); else toast('ذخیره انجام نشد', true); } };
  return <>
    {images.length > 0 ? <div className="adm-imgs">{images.map((im, i) => { const v = alts[im.id] ?? im.alt ?? ''; return <div className="adm-img" key={im.id}>
      <img src={im.url} alt={im.alt} />
      <div className="adm-mrow">{i === 0 ? <Badge tone="info">تصویر اصلی</Badge> : edit ? <Button sm onClick={() => put(im, { cover: true }, 'تصویر اصلی تغییر کرد')}>تصویر اصلی شود</Button> : <span />}
        {edit && <Button sm kind="danger" onClick={() => setDetach(im)}>حذف از محصول</Button>}</div>
      <Field label="متن جایگزین تصویر (الزامی)" req err={altErr[im.id] || (!v.trim() ? 'متن جایگزین (alt) الزامی است' : undefined)}>
        <input className={`adm-input${altErr[im.id] || !v.trim() ? ' bad' : ''}`} value={v} disabled={!edit} onChange={e => setAlts({ ...alts, [im.id]: e.target.value })}
          onBlur={() => { if (v !== (im.alt ?? '') ) put(im, { alt: v }, 'متن جایگزین ذخیره شد'); }} /></Field>
    </div>; })}</div> : <span className="adm-muted">هنوز تصویری برای این محصول ثبت نشده.</span>}
    {edit && <div className={`adm-drop${over ? ' over' : ''}`} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}>
      {preview ? <img src={preview} alt="" style={{ width: 96, height: 128, objectFit: 'cover', borderRadius: 6 }} /> : <img src="/admin-icons/Upload.svg" alt="" width="24" />}
      <b>{file ? file.name : 'تصویر را اینجا رها کنید یا انتخاب کنید'}</b>
      <span className="adm-muted">JPG، PNG یا WebP · حداکثر ۵ مگابایت{file ? ` · ${faNumber(Math.ceil(file.size / 1024))} کیلوبایت` : ''}</span>
      <label className="adm-btn secondary sm" style={{ cursor: 'pointer' }}>انتخاب فایل<input type="file" accept="image/jpeg,image/png,image/webp" data-testid="img-file" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} /></label>
      {errs.file && <span className="err" role="alert" style={{ color: '#b41c1c', fontSize: 12 }}>{errs.file}</span>}
    </div>}
    {edit && <div className="adm-row" style={{ alignItems: 'flex-end' }}>
      <Field label="متن جایگزین تصویر (الزامی)" req grow err={errs.alt}><input className={`adm-input${errs.alt ? ' bad' : ''}`} placeholder="مثلاً مانتو کتان کویری رنگ کرم، نمای روبه‌رو" value={alt} onChange={e => setAlt(e.target.value)} maxLength={200} /></Field>
      <Button kind="primary" ico="Upload" onClick={upload} disabled={busy}>{busy ? 'در حال بارگذاری…' : 'بارگذاری تصویر'}</Button></div>}
    {media?.driver === 'memory' && <span className="adm-muted">پیش‌نمایش: تصاویر در حافظه‌ی موقت نگه‌داری می‌شوند و با راه‌اندازی دوباره پاک می‌شوند (ADMIN-PH-MEDIA).</span>}
    {detach && <Confirm danger title="حذف تصویر از محصول؟" body="تصویر از این محصول جدا می‌شود. فایل ذخیره‌شده پاک نمی‌شود." okLabel="حذف از محصول"
      onOk={async () => { const im = detach; setDetach(null); try { await aapi(`/products/${id}/images/${im.id}`, { method: 'DELETE' }); toast('تصویر از محصول حذف شد'); onChange(); } catch { toast('انجام نشد', true); } }} onClose={() => setDetach(null)} />}
  </>;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'فری‌سایز'];
/** Figma 178:18759 «تنوع‌ها (سایز / رنگ)» with stock from the inventory module (179:21565). The Figma stepper is replaced by «تنظیم» (adjust with reason → ledger). */
function VariantsSection({ id, variants, edit, onFlag, onChange }: { id: number; variants: any[]; edit: boolean; onFlag: (i: number, on: boolean) => void; onChange: () => void }) {
  const mobile = useMobile();
  const [adj, setAdj] = useState<null | { row: Row; reasons: any }>(null); const [add, setAdd] = useState<null | { sizes: string[]; color: string; colorHex: string }>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const openAdj = async (v: any) => { try { const r = await aapi<Row>(`/inventory/${v.id}`); setAdj({ row: r.data, reasons: r.reasons }); } catch { toast('بارگذاری موجودی انجام نشد', true); } };
  const submitAdd = async () => { if (!add) return; try { const r = await aapi(`/products/${id}/variants`, { method: 'POST', body: add }); toast(r.data.created ? `${faNumber(r.data.created)} تنوع اضافه شد` : 'این تنوع‌ها از قبل وجود دارند'); setAdd(null); onChange(); }
    catch (e) { setErrs((e as AdminApiError).fields ?? {}); } };
  const swatch = (v: any) => <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 99, background: v.colorHex, border: '1px solid #d6d3cf', marginInlineEnd: 6, verticalAlign: 'middle' }} />;
  const flag = (v: any, i: number) => v.onHand == null
    ? <label className="adm-check" title="موجودی شمارش نشده؛ فقط پرچم"><input type="checkbox" checked={!!v.available} disabled={!edit} onChange={e => onFlag(i, e.target.checked)} />موجود (پرچم)</label>
    : <span>{fa(String(v.onHand))} <span className="adm-muted">· قابل فروش {fa(String(v.stockAvailable)).replace('-', '−')}</span></span>;
  return <section className="adm-card"><div className="adm-card-head"><h2>تنوع‌ها (سایز / رنگ)</h2>{edit && <Button sm kind="secondary" ico="Add" onClick={() => { setErrs({}); setAdd({ sizes: [], color: '', colorHex: '#FDF7DB' }); }}>افزودن تنوع</Button>}</div>
    {!variants.length ? <span className="adm-muted">هنوز تنوعی ثبت نشده.</span> : mobile ? <MList>{variants.map((v, i) => <MCard key={v.id}>
        <div className="adm-mrow"><span>{swatch(v)}{fa(v.size)} · {v.color}</span><StockBadge s={v.stockStatus} /></div>
        <div className="adm-mrow">{flag(v, i)}{edit && <button type="button" className="adm-link" onClick={() => openAdj(v)}>تنظیم</button>}</div>
        <small className="adm-muted" dir="ltr" style={{ textAlign: 'end' }}>{v.sku}</small></MCard>)}</MList>
      : <Table head={['تنوع', 'SKU', 'موجودی', 'وضعیت', '']}>{variants.map((v, i) => <tr key={v.id}>
        <td>{swatch(v)}{fa(v.size)} · {v.color}</td><td dir="ltr" className="adm-muted">{v.sku}</td><td>{flag(v, i)}</td><td><StockBadge s={v.stockStatus} /></td>
        <td>{edit && <Button sm kind="secondary" onClick={() => openAdj(v)} aria-label={`تنظیم موجودی ${v.size} ${v.color}`}>تنظیم</Button>}</td></tr>)}</Table>}
    <span className="adm-muted">موجودی با «تنظیم» (با دلیل) تغییر می‌کند و در سوابق ثبت می‌شود. تنوع‌های شمارش‌نشده فقط پرچم موجود / ناموجود دارند. قالب SKU نمونه است (ADMIN-PH-SKU).</span>
    {adj && <AdjustStock row={adj.row} mode={adj.row.onHand == null ? 'count' : 'increase'} reasons={adj.reasons} onClose={() => setAdj(null)} onDone={() => { setAdj(null); onChange(); }} />}
    {add && <Modal title="افزودن تنوع" onClose={() => setAdd(null)} foot={<><Button kind="primary" ico="TickWhite" onClick={submitAdd}>افزودن</Button><Button kind="secondary" ico="CloseTeal" onClick={() => setAdd(null)}>انصراف</Button></>}>
      <div className="adm-field" role="group" aria-label="سایزها"><span>سایزها<span className="req"> *</span></span><div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{SIZES.map(z => <label key={z} className="adm-check"><input type="checkbox" checked={add.sizes.includes(z)} onChange={e => setAdd({ ...add, sizes: e.target.checked ? [...add.sizes, z] : add.sizes.filter(x => x !== z) })} />{fa(z)}</label>)}</div>{errs.sizes && <span className="err" role="alert">{errs.sizes}</span>}</div>
      <div className="adm-row">
        <Field label="رنگ" req err={errs.color}><input className={`adm-input${errs.color ? ' bad' : ''}`} placeholder="مثلاً کرم" value={add.color} onChange={e => setAdd({ ...add, color: e.target.value })} maxLength={40} /></Field>
        <Field label="کد رنگ" req err={errs.colorHex}><span style={{ display: 'flex', gap: 8 }}><input type="color" aria-label="انتخاب رنگ" value={/^#[0-9a-fA-F]{6}$/.test(add.colorHex) ? add.colorHex : '#000000'} onChange={e => setAdd({ ...add, colorHex: e.target.value.toUpperCase() })} style={{ width: 40, height: 40, padding: 0, border: 0 }} />
          <input className={`adm-input${errs.colorHex ? ' bad' : ''}`} dir="ltr" value={add.colorHex} onChange={e => setAdd({ ...add, colorHex: e.target.value })} /></span></Field></div>
      <Banner tone="info">تنوع‌های جدید «ناموجود» و بدون موجودی ساخته می‌شوند؛ سپس با «تنظیم ← شمارش» موجودی ثبت کنید.</Banner>
    </Modal>}
  </section>;
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
