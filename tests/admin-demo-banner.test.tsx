// release-gerdoo-2026-10-27: the DEMO banner shows only when the API reports demo mode
// (login: /api/admin/demo-accounts 200 vs 404; signed-in shell: /api/admin/me `demo`).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminApp from '../src/admin/AdminApp';

const ME = { id: 1, name: 'Owner', email: 'o@x.invalid', role: 'owner', roleLabel: 'مالک', roles: ['owner'], roleLabels: ['مالک'], permissions: { dashboard: 'edit', products: 'edit', orders: 'edit', customers: 'edit', reviews: 'edit', content: 'edit', settings: 'edit' } };
const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
function mockApi({ demo, signedIn }: { demo: boolean; signedIn: boolean }) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.endsWith('/auth/session')) return json(200, { data: signedIn ? ME : null });
    if (url.endsWith('/demo-accounts')) return demo ? json(200, { data: [], demo: true }) : json(404, { error: 'not_found' });
    if (url.endsWith('/me')) return json(200, { data: ME, demo, counts: { openOrders: 0 } });
    return json(200, { data: [] });
  }));
}
const mount = () => render(<MemoryRouter initialEntries={['/admin']}><AdminApp /></MemoryRouter>);
const banner = () => screen.queryByText(/DEMO — data resets/);
const mm = () => vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
afterEach(() => vi.unstubAllGlobals());

describe('admin DEMO banner', () => {
  it('login, demo OFF (live shop: /demo-accounts 404) → login form, no banner', async () => {
    mm(); mockApi({ demo: false, signedIn: false }); mount();
    await screen.findByText('ورود به پنل مدیریت جومه');
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/demo-accounts', expect.anything()));
    await new Promise(r => setTimeout(r, 20));
    expect(banner()).toBeNull(); expect(document.title).toBe('پنل مدیریت جومه');
  });
  it('login, demo ON (preview: /demo-accounts 200) → banner shown', async () => {
    mm(); mockApi({ demo: true, signedIn: false }); mount();
    await waitFor(() => expect(banner()).not.toBeNull()); expect(document.title).toContain('(DEMO)');
  });
  it('signed-in shell, /me demo:false → no banner', async () => {
    mm(); mockApi({ demo: false, signedIn: true }); mount();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/me', expect.anything()));
    await new Promise(r => setTimeout(r, 20));
    expect(banner()).toBeNull();
  });
  it('signed-in shell, /me demo:true → banner shown', async () => {
    mm(); mockApi({ demo: true, signedIn: true }); mount();
    await waitFor(() => expect(banner()).not.toBeNull());
  });
});
