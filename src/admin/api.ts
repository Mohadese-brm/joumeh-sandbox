// Admin API client. admin-v1: the session lives ONLY in an httpOnly cookie (joumeh_admin, Path=/api/admin) — nothing in localStorage, no Bearer header.
export class AdminApiError extends Error { constructor(public status: number, public code: string, public fields?: Record<string, string>, public body?: Record<string, unknown>) { super(code); } }
export async function aapi<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<{ data: T; [k: string]: any }> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(`/api/admin${path}`, { method: opts.method ?? 'GET', headers, credentials: 'same-origin', body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  if (r.status === 204) return { data: undefined as T };
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && !path.startsWith('/auth/')) { window.dispatchEvent(new Event('joumeh-admin-401')); }
    throw new AdminApiError(r.status, j.error ?? 'error', j.fields, j);
  }
  return j;
}
export type Level = 'none' | 'view' | 'edit';
export type Me = { id: number; name: string; email: string; role: 'owner' | 'admin'; roleLabel: string; roles: string[]; roleLabels: string[]; permissions: Record<string, Level> };
/** Raw-body upload (product images): the File itself is the body, Content-Type = its mime; JSON response like aapi. */
export async function aupload<T = any>(path: string, file: Blob): Promise<{ data: T; [k: string]: any }> {
  const r = await fetch(`/api/admin${path}`, { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, credentials: 'same-origin', body: file });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) window.dispatchEvent(new Event('joumeh-admin-401'));
    throw new AdminApiError(r.status, j.error ?? (r.status === 413 ? 'file_too_large' : 'error'), j.fields ?? (r.status === 413 ? { file: 'حجم تصویر باید حداکثر ۵ مگابایت باشد' } : undefined), j);
  }
  return j;
}
