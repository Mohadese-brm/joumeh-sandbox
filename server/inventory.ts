// Inventory (admin-v1). Figma: list 179:21565, low stock 179:22042, adjust 179:23739 (+ reason missing 179:23829, adjusted 179:23919),
// ledger 179:22434, in-store sale 179:23929 (+ recorded 291:58294), oversell conflict 179:23985; mobile 179:24354 / 179:24269.
// Formula from Figma: قابل فروش = موجود فیزیکی − رزرو (سبد در حال پرداخت) − تخصیص (سفارش پرداخت‌شده).
// Every STOCK RULE that is a business decision is a labelled placeholder here — nothing below is a decided policy:
//   • reservation (رزرو) of carts in checkout: BD-08 — not implemented, always 0
//   • oversell resolution: BD-08 — an in-store sale that pushes قابل فروش below 0 is recorded (it happened physically) and the variant is
//     flagged «مغایرت / نیازمند بررسی»; what happens to the online order (substitute / wait / cancel + refund) is undecided
//   • real-time vs end-of-day POS recording: BD-09 (Figma 179:23929)
//   • low-stock threshold default: ADMIN-PH-LOWSTOCK (LOW_STOCK_DEFAULT below)
//   • allocation/deduction flow for online orders: ADMIN-PH-STOCK-FLOW (paid + not shipped = allocated; marked shipped = deducted)
//   • the reason lists: ADMIN-PH-STOCK-REASONS (samples from Figma)
import type { Db } from './db.js';
import { stub } from './stubs.js';

export const LOW_STOCK_DEFAULT = 2; // PLACEHOLDER (ADMIN-PH-LOWSTOCK) — not a business decision
export const STOCK_REASONS = { // PLACEHOLDER lists (ADMIN-PH-STOCK-REASONS); the first items are the Figma samples
  increase: ['ورود کالا', 'مرجوعی سالم', 'اصلاح خطای ثبت', 'سایر'],
  decrease: ['فروش حضوری', 'آسیب‌دیدگی / ضایعات', 'اصلاح خطای ثبت', 'سایر'],
  count: ['شمارش انبار (مغایرت)', 'شمارش دوره‌ای', 'سایر'],
} as const;
export type AdjustMode = keyof typeof STOCK_REASONS;
export const MAX_QTY = 100000;
export const INVENTORY_STUBS = { reservation: stub('BD-08'), oversell: stub('BD-08'), posTiming: stub('BD-09'), lowStock: stub('ADMIN-PH-LOWSTOCK'),
  flow: stub('ADMIN-PH-STOCK-FLOW'), reasons: stub('ADMIN-PH-STOCK-REASONS'), storeHold: stub('ADMIN-PH-STORE-HOLD') };

export type StockStatus = 'untracked' | 'ok' | 'low' | 'out' | 'oversold';
export type StockRow = { variantId: number; productId: number; product: string; publishState: string; size: string; color: string; colorHex: string | null; sku: string;
  imageUrl: string | null; onHand: number | null; reserved: number; allocated: number; available: number | null; threshold: number; thresholdDefault: boolean; status: StockStatus };

const ALLOCATED = `COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON o.id=oi.order_id
  WHERE oi.variant_id=v.id AND o.payment_status='paid' AND o.order_status IN ('pending','processing')),0)`;
const STOCK_SQL = `SELECT v.id AS variantId, v.product_id AS productId, p.name AS product, p.publish_state AS publishState, v.size, v.color, v.color_hex AS colorHex, v.sku,
  v.on_hand AS onHand, v.low_stock_threshold AS lowStockThreshold, (SELECT url FROM images i WHERE i.product_id=p.id ORDER BY position LIMIT 1) AS imageUrl, ${ALLOCATED} AS allocated
  FROM variants v JOIN products p ON p.id=v.product_id`;
type Raw = Omit<StockRow, 'reserved' | 'available' | 'threshold' | 'thresholdDefault' | 'status'> & { lowStockThreshold: number | null };

export function computeRow(r: Raw): StockRow {
  const { lowStockThreshold, ...rest } = r;
  const threshold = lowStockThreshold ?? LOW_STOCK_DEFAULT; const reserved = 0; // BD-08: no cart reservation yet
  const allocated = Number(r.allocated) || 0;
  const available = r.onHand == null ? null : r.onHand - reserved - allocated;
  const status: StockStatus = available == null ? 'untracked' : available < 0 ? 'oversold' : available === 0 ? 'out' : available <= threshold ? 'low' : 'ok';
  return { ...rest, allocated, reserved, available, threshold, thresholdDefault: lowStockThreshold == null, status };
}
export async function stockRows(db: Db, where = '', params: unknown[] = []): Promise<StockRow[]> {
  return (await db.all<Raw>(`${STOCK_SQL}${where ? ' WHERE ' + where : ''} ORDER BY p.id, v.id`, params)).map(computeRow);
}
export async function stockRow(db: Db, variantId: number) { return (await stockRows(db, 'v.id=?', [variantId]))[0]; }

/** Per-product summary for the products list (Figma 178:16092 «موجودی کل»: «۲۴ (۲ کم)», «۰ ناموجود»). */
export async function productStock(db: Db, productIds: number[]) {
  const out: Record<number, { total: number | null; low: number; out: number; tracked: number; variants: number }> = {};
  if (!productIds.length) return out;
  for (const r of await stockRows(db, `v.product_id IN (${productIds.map(() => '?').join(',')})`, productIds)) {
    const s = out[r.productId] ??= { total: null, low: 0, out: 0, tracked: 0, variants: 0 };
    s.variants++;
    if (r.onHand != null) { s.tracked++; s.total = (s.total ?? 0) + Math.max(0, r.available ?? 0); }
    if (r.status === 'low') s.low++; if (r.status === 'out' || r.status === 'oversold') s.out++;
  }
  return out;
}

/** The shop keeps reading the existing `available` flag; for a TRACKED variant it follows قابل فروش > 0 after every stock change
 *  (Figma 179:23739: «سایت بلافاصله به‌روز می‌شود»). Untracked variants are never touched. (ADMIN-PH-STOCK-FLOW) */
async function syncAvailable(db: Db, variantId: number) {
  const r = await stockRow(db, variantId);
  if (r && r.available != null) await db.run('UPDATE variants SET available=? WHERE id=?', [r.available > 0 ? 1 : 0, variantId]);
  return r;
}

export type Actor = { adminId: number | null; name: string };
export class StockError extends Error { constructor(public status: number, public code: string, public fields?: Record<string, string>, public extra?: Record<string, unknown>) { super(code); } }
const intQty = (v: unknown) => { const s = String(v ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim(); return /^\d+$/.test(s) ? Number(s) : NaN; };

/** One stock change, atomically: validate → ledger row (append-only) → variants.on_hand → shop flag. Returns the new row. */
export async function changeStock(db: Db, variantId: number, input: { mode: AdjustMode | 'pos_sale'; qty: unknown; reason?: unknown; note?: unknown }, actor: Actor,
  auditFn?: (t: Db, m: { before: number | null; after: number; oversold: boolean }) => Promise<unknown>) {
  const mode = input.mode; const qty = intQty(input.qty); const note = String(input.note ?? '').trim();
  let reason = String(input.reason ?? '').trim();
  const f: Record<string, string> = {};
  if (!(mode in STOCK_REASONS) && mode !== 'pos_sale') throw new StockError(400, 'invalid_mode');
  if (!Number.isInteger(qty) || qty > MAX_QTY || (mode === 'count' ? qty < 0 : qty < 1)) f.qty = mode === 'count' ? 'مقدار نهایی باید عدد صفر یا بیشتر باشد' : 'تعداد باید عدد ۱ یا بیشتر باشد';
  if (mode === 'pos_sale') reason = 'فروش حضوری';
  else if (!reason) f.reason = 'دلیل تغییر را انتخاب کنید';
  else if (!(STOCK_REASONS[mode as AdjustMode] as readonly string[]).includes(reason)) f.reason = 'دلیل معتبر نیست';
  if (reason === 'سایر' && !note) f.note = 'برای «سایر» یادداشت الزامی است';
  if (note.length > 500) f.note = 'یادداشت حداکثر ۵۰۰ کاراکتر';
  if (Object.keys(f).length) throw new StockError(400, 'validation', f);
  return db.tx(async t => {
    const v = await t.one<{ on_hand: number | null }>('SELECT on_hand FROM variants WHERE id=?', [variantId]);
    if (!v) throw new StockError(404, 'not_found');
    const before = v.on_hand; const base = before ?? 0;
    if ((mode === 'decrease' || mode === 'pos_sale') && before == null) throw new StockError(409, 'untracked', { qty: 'ابتدا موجودی این تنوع را با «شمارش» ثبت کنید' });
    const after = mode === 'increase' ? base + qty : mode === 'count' ? qty : base - qty;
    if (after < 0) throw new StockError(409, 'insufficient', { qty: `بیشتر از موجود فیزیکی (${String(base).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d])}) است` }, { onHand: base });
    if (after > MAX_QTY) throw new StockError(400, 'validation', { qty: 'تعداد بیش از حد مجاز است' });
    const pre = await stockRow(t, variantId);
    const availAfter = after - (pre?.reserved ?? 0) - (pre?.allocated ?? 0);
    const oversold = availAfter < 0 ? 1 : 0;
    const kind = mode === 'pos_sale' ? 'pos_sale' : mode;
    const id = await t.insert(`INSERT INTO inventory_movements (variant_id,kind,delta,before_qty,after_qty,reason,note,admin_id,actor,oversold) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [variantId, kind, after - base, before, after, reason, note || null, actor.adminId, actor.name, oversold]);
    await t.run('UPDATE variants SET on_hand=? WHERE id=?', [after, variantId]);
    const row = (await syncAvailable(t, variantId))!;
    if (auditFn) await auditFn(t, { before, after, oversold: !!oversold }); // audit row in the SAME transaction as the ledger row
    return { movementId: id, row, before, after, oversold: !!oversold };
  });
}

/** ADMIN-PH-STOCK-FLOW placeholder: an order marked «ارسال شده» leaves the warehouse → its tracked lines are deducted (system ledger row). */
export async function deductForShipment(db: Db, orderId: number, orderNumber: string, actor: Actor) {
  const lines = await db.all<{ variant_id: number; quantity: number; on_hand: number | null }>(
    'SELECT oi.variant_id, oi.quantity, v.on_hand FROM order_items oi JOIN variants v ON v.id=oi.variant_id WHERE oi.order_id=? AND v.on_hand IS NOT NULL', [orderId]);
  for (const l of lines) {
    const after = l.on_hand! - l.quantity; // may go below 0 only if the stock was already wrong: recorded + flagged, never hidden
    await db.insert(`INSERT INTO inventory_movements (variant_id,kind,delta,before_qty,after_qty,reason,order_id,admin_id,actor,oversold) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [l.variant_id, 'order_shipped', -l.quantity, l.on_hand, after, `ارسال سفارش ${orderNumber}`, orderId, actor.adminId, actor.name, after < 0 ? 1 : 0]);
    await db.run('UPDATE variants SET on_hand=? WHERE id=?', [after, l.variant_id]);
    await syncAvailable(db, l.variant_id);
  }
  return lines.length;
}

export const MOVE_SQL = `SELECT m.id, m.variant_id AS variantId, m.kind, m.delta, m.before_qty AS beforeQty, m.after_qty AS afterQty, m.reason, m.note, m.order_id AS orderId,
  m.actor, m.oversold, m.created_at AS createdAt, v.sku, v.size, v.color, p.name AS product, p.id AS productId FROM inventory_movements m JOIN variants v ON v.id=m.variant_id JOIN products p ON p.id=v.product_id`;

/** PREVIEW/TEST demo stock: quantities that MATCH the current availability flags (so the preview shop is unchanged vs production). */
export async function seedDemoStock(db: Db) {
  if (await db.one('SELECT 1 AS x FROM inventory_movements LIMIT 1')) return;
  const vs = await db.all<{ id: number; available: number }>('SELECT id, available FROM variants ORDER BY id');
  for (const v of vs) {
    // allocated (paid, unshipped) units are added on top so قابل فروش stays > 0 wherever the shop shows «موجود»
    const alloc = (await db.one<{ n: number }>(`SELECT ${ALLOCATED.replace(/v\.id/g, '?')} AS n`, [v.id]))!.n;
    const qty = v.available ? 1 + (v.id * 7) % 12 + Number(alloc) : 0;
    await db.run('UPDATE variants SET on_hand=? WHERE id=?', [qty, v.id]);
    await db.run(`INSERT INTO inventory_movements (variant_id,kind,delta,before_qty,after_qty,reason,note,actor,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      [v.id, 'count', qty, null, qty, 'شمارش انبار (مغایرت)', 'موجودی اولیه‌ی نمونه (داده نمونه)', 'سیستم (نمونه)', '2026-10-20 06:30:00']);
  }
}
