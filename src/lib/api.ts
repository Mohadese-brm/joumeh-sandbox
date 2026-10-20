export class ApiError extends Error { constructor(public status: number, public code: string, public fields?: Record<string, string>) { super(code); } }
const TOKEN_KEY = 'joumeh.token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<{ data: T; [k: string]: unknown }> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const t = getToken(); if (t) headers.Authorization = `Bearer ${t}`;
  const r = await fetch(`/api${path}`, { method: opts.method ?? 'GET', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  if (r.status === 204) return { data: undefined as T };
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, j.error ?? 'error', j.fields);
  return j;
}
export type Product = { id: number; slug: string; name: string; status: 'default' | 'sale' | 'new'; price: number; originalPrice: number | null; badgePercent: number | null; imageUrl: string; imageAlt: string; category: string; type?: string };
export type Variant = { id: number; size: string; color: string; colorHex: string; sku: string; available: number };
export type CartItem = { id: number; variantId: number; quantity: number; size: string; color: string; available: boolean; productId: number; slug: string; name: string; price: number; originalPrice: number | null; imageUrl: string; lineTotal: number };
export type Cart = { cartId: number; items: CartItem[]; totals: { count: number; subtotal: number; discount: number; payable: number; shipping: null; vat: null } };
export type User = { id: number; phone: string; firstName: string | null; lastName: string | null; email: string | null; emailVerified: number };
export type Address = { id: number; recipient: string; phone: string; province: string; city: string; line: string; postalCode: string; landline: string | null; isDefault: number };
export type OrderItem = { productId: number; name: string; size: string; color: string; unitPrice: number; quantity: number; imageUrl: string; slug: string };
export type Order = { id: number; orderNumber: string; orderStatus: string; paymentStatus: string; fulfilmentStatus: string; shippingMethod: string | null; shippingFee: number | null; vatAmount: number | null; subtotal: number; discount: number; total: number; isSample: number; createdAt: string; address: Record<string, string>; items: OrderItem[] };
export type ReturnReq = { id: number; returnNumber: string; status: string; reason: string; createdAt: string; orderId: number; orderNumber: string; productName: string; slug: string; imageUrl: string };
