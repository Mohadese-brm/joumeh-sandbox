// Figma Inventory: list 179:21565 · adjust modal 179:23739 · in-store sale 179:23929 · oversell 179:23985 · history/ledger 179:22434
// Mobile: low stock 177:xxxx «موجودی کم» card + «تنظیم» link, adjust = full-screen sheet (Figma: full page «تنظیم موجودی»).
// Stock rules are placeholders: reservation 0 (BD-08), oversell = recorded + flagged (BD-08), POS timing (BD-09), threshold default (ADMIN-PH-LOWSTOCK).
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLoad } from './hooks';
import { aapi, AdminApiError } from '../api';
import { Badge, Banner, Button, DatePicker, Empty, ErrorState, Field, Loading, MCard, MList, Modal, NoPermission, PageTitle, Pager, Stub, Table, Tabs, fa, toast, useMobile, type Tone } from '../ui';
import { faNumber } from '../../lib/format';
import { useMe, can } from '../AdminApp';

export type Row = { variantId: number; productId: number; product: string; size: string; color: string; colorHex: string | null; sku: string; imageUrl: string | null;
  onHand: number | null; reserved: number; allocated: number; available: number | null; threshold: number; thresholdDefault: boolean; status: string };
type Reasons = Record<'increase' | 'decrease' | 'count', string[]>;
export const STOCK_STATUS: Record<string, [string, Tone]> = { ok: ['موجود', 'success'], low: ['موجودی کم', 'warning'], out: ['ناموجود', 'danger'], oversold: ['مغایرت (منفی)', 'danger'], untracked: ['ثبت نشده', 'neutral'] };
export const StockBadge = ({ s }: { s: string }) => { const [l, t] = STOCK_STATUS[s] ?? [s, 'neutral' as Tone]; return <Badge tone={t}>{l}</Badge>; };
const n = (v: number | null) => (v == null ? '—' : fa(String(v)).replace('-', '−'));
const variantLabel = (r: { size: string; color: string }) => `${fa(r.size)} · ${r.color}`;
const ProdCell = ({ r, sub }: { r: Row; sub?: string }) => <div className="adm-prod">{r.imageUrl ? <img src={r.imageUrl} alt="" /> : <span className="adm-thumb" />}<div><b>{r.product}</b><small>{sub ?? variantLabel(r)}</small></div></div>;

const TABS = [['all', 'همه'], ['low', 'کم‌موجود'], ['out', 'ناموجود'], ['untracked', 'ثبت نشده']] as const;
export function Inventory() {
  const me = useMe(); const mobile = useMobile(); const [sp, setSp] = useSearchParams();
  const [tab, setTab] = useState<string>(sp.get('tab') ?? 'all'); const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const path = `/inventory?${new URLSearchParams({ tab, q, page: String(page) })}`;
  const { data, extra, error, loading, reload } = useLoad<Row[]>(can(me, 'products') ? path : null);
  const [adjust, setAdjust] = useState<null | { row: Row | null; mode: 'increase' | 'decrease' | 'count' }>(null); const [pos, setPos] = useState(false);
  const [oversell, setOversell] = useState<null | { sku: string; after: number; orders: { id: number; orderNumber: string }[] }>(null);
  useEffect(() => { if (sp.get('tab') !== tab && tab !== 'all') setSp({ tab }, { replace: true }); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!can(me, 'products')) return <NoPermission crumb="کاتالوگ / موجودی انبار" title="موجودی انبار" />;
  const edit = can(me, 'products', 'edit'); const c = extra?.counts ?? {}; const reasons: Reasons | undefined = extra?.reasons;
  const go = (t: string) => { setTab(t); setPage(1); };
  return <>
    <PageTitle crumb="کاتالوگ / موجودی انبار" title="موجودی انبار" sub={`یک موجودی واحد برای فروشگاه حضوری و سایت${extra?.sampleData ? ' · داده نمونه' : ''}`}
      actions={<><Link className="adm-btn secondary" to="/admin/inventory/history">سوابق تغییرات</Link>
        {edit && <><Button kind="secondary" onClick={() => setAdjust({ row: null, mode: 'count' })}>شمارش انبار</Button>
          <Button kind="primary" ico="Add1" onClick={() => setPos(true)}>ثبت سریع فروش حضوری</Button></>}</>} />
    <Banner tone="info">قابل فروش = موجود فیزیکی − رزرو (سبد در حال پرداخت) − تخصیص (سفارش پرداخت‌شده). مدت رزرو: <Stub code="BD-08" /> — فعلاً رزرو صفر است.</Banner>
    {oversell && <Banner tone="danger">مغایرت: فروش حضوری <bdi dir="ltr">{oversell.sku}</bdi> قابل فروش را به {n(oversell.after)} رساند.
      {oversell.orders.length ? <> سفارش‌های پرداخت‌شده‌ی مرتبط: {oversell.orders.map((o, i) => <span key={o.id}>{i ? '، ' : ''}<Link to={`/admin/orders/${o.id}`}>{fa(o.orderNumber)}</Link></span>)} — وضعیت آن‌ها خودکار تغییر نکرد.</> : null}
      {' '}راه‌حل (جایگزین / انتظار / لغو و بازپرداخت): <Stub code="BD-08" /></Banner>}
    {!oversell && extra?.oversold?.length > 0 && <Banner tone="danger">{faNumber(extra.oversold.length)} تنوع قابل فروش منفی دارد (فروش بیش از موجودی). رسیدگی: <Stub code="BD-08" /></Banner>}
    <Tabs items={[...TABS.map(([k, l]) => [k, l, c[k] ?? (k === 'all' ? undefined : 0)] as [string, string, number?]), ['hold', 'رزرو فروشگاه', undefined, 'نگه‌داشت کالا برای فروشگاه — در انتظار تصمیم (ADMIN-PH-STORE-HOLD)']]} value={tab} onChange={go} />
    <div className="adm-filters">
      <Field label="جستجو" grow><input className="adm-input" placeholder="جستجو در نام، کد…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></Field>
      <Field label="وضعیت"><select className="adm-select" value={tab} onChange={e => go(e.target.value)}>{TABS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
    </div>
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length
      ? <Empty title={q ? 'نتیجه‌ای پیدا نشد' : tab === 'low' ? 'هیچ تنوعی کم‌موجود نیست' : tab === 'out' ? 'هیچ تنوعی ناموجود نیست' : 'تنوعی ثبت نشده'}>{q ? 'عبارت جستجو را تغییر دهید.' : null}</Empty>
      : <>{mobile ? <MList>{data.map(r => <MCard key={r.variantId}>
          <div className="adm-mrow"><ProdCell r={r} /><StockBadge s={r.status} /></div>
          <div className="adm-mrow"><span>قابل فروش: <b>{n(r.available)}</b> <span className="adm-muted">· فیزیکی {n(r.onHand)} · تخصیص {n(r.allocated)}</span></span>
            {edit && <button type="button" className="adm-link" onClick={() => setAdjust({ row: r, mode: 'increase' })} aria-label={`تنظیم موجودی ${r.product} ${variantLabel(r)}`}>تنظیم</button>}</div>
          <small className="adm-muted" dir="ltr" style={{ textAlign: 'end' }}>{r.sku}</small></MCard>)}</MList>
        : <Table head={['محصول / تنوع', 'SKU', 'موجود فیزیکی', 'رزرو', 'تخصیص', 'قابل فروش', 'حد هشدار', 'وضعیت', '']}>
          {data.map(r => <tr key={r.variantId}>
            <td><ProdCell r={r} /></td><td className="adm-muted" dir="ltr" style={{ textAlign: 'end' }}>{r.sku}</td><td>{n(r.onHand)}</td><td title="BD-08">{n(r.reserved)}</td><td>{n(r.allocated)}</td>
            <td><b>{n(r.available)}</b>{r.status === 'out' && <span className="adm-muted"> · ناموجود</span>}</td>
            <td title={r.thresholdDefault ? 'پیش‌فرض نمونه (ADMIN-PH-LOWSTOCK)' : undefined}>{n(r.threshold)}{r.thresholdDefault && <span className="adm-muted"> *</span>}</td>
            <td><StockBadge s={r.status} /></td>
            <td>{edit && <Button sm kind="secondary" onClick={() => setAdjust({ row: r, mode: 'increase' })} aria-label={`تنظیم موجودی ${r.product} ${variantLabel(r)}`}>تنظیم</Button>}</td></tr>)}
        </Table>}
        <Pager page={page} total={extra.total} size={extra.pageSize} onPage={setPage} />
        <span className="adm-muted">* حد هشدار پیش‌فرض {faNumber(extra.lowStockDefault)} عدد — نمونه، در انتظار تصمیم (ADMIN-PH-LOWSTOCK).</span></>}
    {adjust && reasons && <AdjustStock row={adjust.row} mode={adjust.mode} reasons={reasons} onClose={() => setAdjust(null)} onDone={() => { setAdjust(null); reload(); }} />}
    {pos && <PosSale onClose={() => setPos(false)} onDone={r => { setPos(false); if (r.oversold) setOversell({ sku: r.row.sku, after: r.row.available, orders: r.affectedOrders }); else setOversell(null); reload(); }} />}
  </>;
}

/** Variant picker by name / SKU (used when the modal is opened without a row: «شمارش انبار», «فروش حضوری»). */
function VariantPick({ value, onPick, err }: { value: Row | null; onPick: (r: Row | null) => void; err?: string }) {
  const [q, setQ] = useState(''); const [list, setList] = useState<Row[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!q.trim() || value) { setList([]); return; } setBusy(true); const t = setTimeout(() => aapi<Row[]>(`/inventory?q=${encodeURIComponent(q.trim())}&size=8`).then(r => setList(r.data)).catch(() => setList([])).finally(() => setBusy(false)), 250); return () => clearTimeout(t); }, [q, value]);
  if (value) return <div className="adm-picked"><ProdCell r={value} sub={`${variantLabel(value)} · ${value.sku}`} /><Button sm onClick={() => { onPick(null); setQ(''); }}>تغییر</Button></div>;
  return <Field label="کالا (نام یا SKU)" req err={err}><input className={`adm-input${err ? ' bad' : ''}`} placeholder="مثلاً JM-1000-M-CR" value={q} onChange={e => setQ(e.target.value)} autoFocus aria-autocomplete="list" />
    {q.trim() && <div className="adm-picklist" role="listbox">{busy && !list.length ? <span className="adm-muted">در حال جستجو…</span> : !list.length ? <span className="adm-muted">کالایی پیدا نشد</span>
      : list.map(r => <button type="button" role="option" aria-selected="false" key={r.variantId} onClick={() => onPick(r)}><ProdCell r={r} sub={`${variantLabel(r)} · ${r.sku} · قابل فروش: ${n(r.available)}`} /></button>)}</div>}</Field>;
}

const MODES = [['increase', 'افزایش'], ['decrease', 'کاهش'], ['count', 'شمارش (مقدار نهایی)']] as const;
const toInt = (s: string) => { const t = s.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim(); return /^\d+$/.test(t) ? Number(t) : NaN; };
export function AdjustStock({ row: initial, mode: m0, reasons, onClose, onDone }: { row: Row | null; mode: 'increase' | 'decrease' | 'count'; reasons: Reasons; onClose: () => void; onDone: () => void }) {
  const [row, setRow] = useState<Row | null>(initial); const [mode, setMode] = useState<'increase' | 'decrease' | 'count'>(row?.onHand == null ? 'count' : m0);
  const [qty, setQty] = useState(''); const [reason, setReason] = useState(''); const [note, setNote] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  const q = toInt(qty); const base = row?.onHand ?? 0;
  const after = !row || Number.isNaN(q) ? null : mode === 'increase' ? base + q : mode === 'count' ? q : base - q;
  const availAfter = after == null || !row ? null : after - row.reserved - row.allocated;
  const submit = async () => {
    const f: Record<string, string> = {};
    if (!row) f.variant = 'کالا را انتخاب کنید';
    if (Number.isNaN(q) || (mode === 'count' ? q < 0 : q < 1)) f.qty = mode === 'count' ? 'مقدار نهایی باید عدد صفر یا بیشتر باشد' : 'تعداد باید عدد ۱ یا بیشتر باشد';
    if (!reason) f.reason = 'دلیل تغییر را انتخاب کنید'; if (reason === 'سایر' && !note.trim()) f.note = 'برای «سایر» یادداشت الزامی است';
    if (after != null && after < 0) f.qty = `بیشتر از موجود فیزیکی (${fa(String(base))}) است`;
    setErrs(f); if (Object.keys(f).length) return;
    setBusy(true);
    try { await aapi(`/inventory/${row!.variantId}/adjust`, { method: 'POST', body: { mode, qty: q, reason, note } }); toast('موجودی به‌روز شد و در سوابق ثبت شد'); onDone(); }
    catch (e) { const er = e as AdminApiError; if (er.fields) setErrs(er.fields); else toast('ثبت تغییر انجام نشد', true); } finally { setBusy(false); }
  };
  return <Modal title="تنظیم موجودی" onClose={onClose}
    foot={<><Button kind="primary" ico="TickWhite" onClick={submit} disabled={busy}>ثبت تغییر</Button><Button kind="secondary" ico="CloseTeal" onClick={onClose}>انصراف</Button></>}>
    {initial ? <ProdCell r={initial} sub={`${variantLabel(initial)} · ${initial.sku}`} /> : <VariantPick value={row} onPick={r => { setRow(r); if (r?.onHand == null) setMode('count'); }} err={errs.variant} />}
    {row && <div className="adm-kv2"><span>موجود فیزیکی <b>{n(row.onHand)}</b></span><span>قابل فروش <b>{n(row.available)}</b></span></div>}
    <Tabs items={MODES.map(([k, l]) => (row && row.onHand == null && k !== 'count' ? [k, l, undefined, 'موجودی این تنوع هنوز ثبت نشده؛ ابتدا «شمارش»'] : [k, l]) as [string, string, number?])} value={mode} onChange={v => { setMode(v as typeof mode); setReason(''); }} />
    <Field label={mode === 'count' ? 'مقدار نهایی (شمارش)' : 'تعداد'} req err={errs.qty}><input className={`adm-input${errs.qty ? ' bad' : ''}`} inputMode="numeric" dir="ltr" value={qty} onChange={e => setQty(e.target.value)} /></Field>
    <Field label="دلیل (الزامی)" req err={errs.reason}><select className={`adm-select${errs.reason ? ' bad' : ''}`} value={reason} onChange={e => setReason(e.target.value)}><option value="">انتخاب کنید</option>{reasons[mode].map(r => <option key={r} value={r}>{r}</option>)}</select></Field>
    <Field label="یادداشت" err={errs.note}><input className={`adm-input${errs.note ? ' bad' : ''}`} placeholder="مثلاً فاکتور خرید شماره ۲۱۴" value={note} onChange={e => setNote(e.target.value)} maxLength={500} /></Field>
    {row && after != null && after >= 0 && <Banner tone="info">پس از ثبت: موجود فیزیکی {n(row.onHand)} ← {n(after)} · قابل فروش {n(row.available)} ← {n(availAfter)}. سایت بلافاصله به‌روز می‌شود.</Banner>}
    <span className="adm-muted">فهرست دلایل نمونه است (ADMIN-PH-STOCK-REASONS). هر تغییر در سوابق موجودی و گزارش فعالیت ثبت می‌شود و قابل ویرایش یا حذف نیست.</span>
  </Modal>;
}

export function PosSale({ onClose, onDone }: { onClose: () => void; onDone: (r: any) => void }) {
  const [row, setRow] = useState<Row | null>(null); const [qty, setQty] = useState('1'); const [note, setNote] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false);
  const q = toInt(qty);
  const submit = async () => {
    const f: Record<string, string> = {}; if (!row) f.variant = 'کالا را انتخاب کنید'; else if (row.onHand == null) f.variant = 'ابتدا موجودی این تنوع را با «شمارش» ثبت کنید';
    if (Number.isNaN(q) || q < 1) f.qty = 'تعداد باید عدد ۱ یا بیشتر باشد'; else if (row?.onHand != null && q > row.onHand) f.qty = `بیشتر از موجود فیزیکی (${fa(String(row.onHand))}) است`; setErrs(f); if (Object.keys(f).length) return;
    setBusy(true);
    try { const r = await aapi('/inventory/pos-sale', { method: 'POST', body: { variantId: row!.variantId, qty: q, note } }); toast(r.data.oversold ? 'فروش ثبت شد — مغایرت موجودی' : 'فروش حضوری ثبت و از موجودی کسر شد', r.data.oversold); onDone(r.data); }
    catch (e) { const er = e as AdminApiError; if (er.fields) setErrs({ ...er.fields, ...(er.fields.sku ? { variant: er.fields.sku } : {}) }); else toast('ثبت فروش انجام نشد', true); } finally { setBusy(false); }
  };
  const willOversell = row && row.available != null && row.onHand != null && !Number.isNaN(q) && q <= row.onHand && row.available - q < 0;
  return <Modal title="ثبت سریع فروش حضوری" onClose={onClose}
    foot={<><Button kind="primary" ico="TickWhite" onClick={submit} disabled={busy}>ثبت فروش و کسر موجودی</Button><Button kind="secondary" ico="CloseTeal" onClick={onClose}>انصراف</Button></>}>
    <VariantPick value={row} onPick={setRow} err={errs.variant} />
    <Field label="تعداد" req err={errs.qty}><input className={`adm-input${errs.qty ? ' bad' : ''}`} inputMode="numeric" dir="ltr" value={qty} onChange={e => setQty(e.target.value)} /></Field>
    <Field label="یادداشت" err={errs.note}><input className="adm-input" value={note} onChange={e => setNote(e.target.value)} maxLength={500} /></Field>
    <Banner tone="info">فروش حضوری را همان لحظه ثبت کنید تا سایت بیش از موجودی نفروشد. قاعده ثبت لحظه‌ای / پایان روز: <Stub code="BD-09" /></Banner>
    {willOversell ? <Banner tone="danger">این فروش قابل فروش را منفی می‌کند ({n(row!.available! - q)}). فروش ثبت و علامت‌گذاری می‌شود؛ سفارش‌های آنلاین مرتبط فهرست می‌شوند ولی خودکار تغییر نمی‌کنند (BD-08).</Banner>
      : <span className="adm-muted">اگر قابل فروش منفی شود، سفارش‌های آنلاین پرداخت‌شده‌ی مرتبط برای بررسی فهرست می‌شوند (رسیدگی: BD-08).</span>}
  </Modal>;
}

const KINDS: [string, string][] = [['', 'همه'], ['increase', 'افزایش'], ['decrease', 'کاهش'], ['count', 'شمارش'], ['pos_sale', 'فروش حضوری'], ['order_shipped', 'ارسال سفارش']];
const dtf = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const stamp = (iso: string) => { const p = Object.fromEntries(dtf.formatToParts(new Date(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z'))).map(x => [x.type, x.value])); return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`; };
export function InventoryHistory() {
  const me = useMe(); const mobile = useMobile(); const nav = useNavigate();
  const [q, setQ] = useState(''); const [kind, setKind] = useState(''); const [day, setDay] = useState(''); const [page, setPage] = useState(1);
  const { data, extra, error, loading, reload } = useLoad<any[]>(can(me, 'products') ? `/inventory/movements?${new URLSearchParams({ q, kind, from: day, to: day, page: String(page) })}` : null);
  if (!can(me, 'products')) return <NoPermission crumb="کاتالوگ / موجودی انبار / سوابق تغییرات" title="سوابق تغییرات موجودی" />;
  const delta = (d: number) => <b className={d < 0 ? 'neg' : 'pos'} dir="ltr">{d > 0 ? '+' : d < 0 ? '−' : ''}{fa(String(Math.abs(d)))}</b>;
  const reason = (m: any) => <>{m.reason}{m.oversold ? <> <Badge tone="danger">مغایرت</Badge></> : null}{m.note && <><br /><small className="adm-muted">{m.note}</small></>}</>;
  return <>
    <PageTitle crumb="کاتالوگ / موجودی انبار / سوابق تغییرات" title="سوابق تغییرات موجودی" sub="فقط افزودنی؛ قابل ویرایش یا حذف نیست"
      actions={<><Button ico="Download" disabled title="خروجی فایل — در انتظار طراحی گزارش‌ها">خروجی (نمونه اولیه)</Button><Button kind="secondary" onClick={() => nav('/admin/inventory')}>بازگشت به موجودی</Button></>} />
    <div className="adm-filters">
      <DatePicker label="تاریخ" value={day} onChange={v => { setDay(v); setPage(1); }} />
      <Field label="جستجو" grow><input className="adm-input" placeholder="نام، SKU، دلیل یا کاربر…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></Field>
      <Field label="وضعیت"><select className="adm-select" value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
    </div>
    {loading && !data ? <Loading /> : error ? <ErrorState retry={reload} /> : !data?.length ? <Empty title={q || kind || day ? 'تغییری با این فیلترها پیدا نشد' : 'هنوز تغییری ثبت نشده'} /> : <>
      {mobile ? <MList>{data.map(m => <MCard key={m.id}><div className="adm-mrow"><b>{m.product}</b>{delta(m.delta)}</div>
          <div className="adm-mrow"><small className="adm-muted">{variantLabel(m)} · <bdi dir="ltr">{m.sku}</bdi></small><span className="nw">{n(m.beforeQty)} ← {n(m.afterQty)}</span></div>
          <div>{reason(m)}</div><div className="adm-mrow"><small className="adm-muted">{m.actor}</small><small className="adm-muted">{stamp(m.createdAt)}</small></div></MCard>)}</MList>
        : <Table head={['زمان', 'SKU', 'تغییر', 'قبل ← بعد', 'دلیل', 'کاربر']}>{data.map(m => <tr key={m.id}>
          <td className="adm-muted">{stamp(m.createdAt)}</td><td><bdi dir="ltr">{m.sku}</bdi><br /><small className="adm-muted">{m.product} · {variantLabel(m)}</small></td><td>{delta(m.delta)}</td>
          <td className="nw">{n(m.beforeQty)} ← {n(m.afterQty)}</td><td>{reason(m)}{m.orderId && <> · <Link to={`/admin/orders/${m.orderId}`}>سفارش</Link></>}</td><td>{m.actor}</td></tr>)}</Table>}
      <Pager page={page} total={extra.total} size={extra.pageSize} onPage={setPage} /></>}
  </>;
}
