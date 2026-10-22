// Admin API client (demo). Separate token from the shop's customer session.
export class AdminApiError extends Error { constructor(public status: number, public code: string, public fields?: Record<string, string>, public body?: Record<string, unknown>) { super(code); } }
const KEY = 'joumeh.admin.token';
export const getAdminToken = () => localStorage.getItem(KEY);
export const setAdminToken = (t: string | null) => (t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY));
export async function aapi<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<{ data: T; [k: string]: any }> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const t = getAdminToken(); if (t) headers.Authorization = `Bearer ${t}`;
  const r = await fetch(`/api/admin${path}`, { method: opts.method ?? 'GET', headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  if (r.status === 204) return { data: undefined as T };
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && !path.startsWith('/auth/')) { setAdminToken(null); window.dispatchEvent(new Event('joumeh-admin-401')); }
    throw new AdminApiError(r.status, j.error ?? 'error', j.fields, j);
  }
  return j;
}
export type Level = 'none' | 'view' | 'edit';
export type Me = { id: number; name: string; phone: string; roles: string[]; roleLabels: string[]; permissions: Record<string, Level> };
