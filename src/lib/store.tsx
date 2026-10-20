import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken, type Cart, type User } from './api';

type Toast = { id: number; text: string; action?: { label: string; onClick: () => void } };
type Ctx = {
  user: User | null; authReady: boolean; setSession: (token: string, user: User) => void; logout: () => Promise<void>; refreshUser: () => Promise<void>;
  cart: Cart | null; cartError: boolean; refreshCart: () => Promise<void>; addToCart: (variantId: number, qty?: number) => Promise<void>; setCart: (c: Cart) => void;
  favorites: Set<number>; toggleFavorite: (productId: number) => Promise<void>;
  authOpen: boolean; openAuth: (after?: () => void) => void; closeAuth: () => void; afterAuth: (() => void) | null;
  toasts: Toast[]; toast: (text: string, action?: Toast['action']) => void; dismissToast: (id: number) => void;
};
const C = createContext<Ctx | null>(null);
export const useStore = () => { const c = useContext(C); if (!c) throw new Error('StoreProvider missing'); return c; };
const CART_KEY = 'joumeh.cartId';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCartState] = useState<Cart | null>(null);
  const [cartError, setCartError] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [authOpen, setAuthOpen] = useState(false);
  const [afterAuth, setAfterAuth] = useState<(() => void) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const setCart = useCallback((c: Cart) => { setCartState(c); localStorage.setItem(CART_KEY, String(c.cartId)); }, []);
  const refreshCart = useCallback(async () => {
    const id = localStorage.getItem(CART_KEY);
    if (!id) { setCartState(null); setCartError(false); return; }
    try { const r = await api<Cart>(`/cart/${id}`); setCartState(r.data); setCartError(false); }
    catch (e) { if ((e as { status?: number }).status === 404) { localStorage.removeItem(CART_KEY); setCartState(null); } else setCartError(true); }
  }, []);
  const loadFavs = useCallback(async () => {
    try { const r = await api<{ id: number }[]>('/favorites'); setFavorites(new Set(r.data.map(p => p.id))); } catch { setFavorites(new Set()); }
  }, []);
  const refreshUser = useCallback(async () => {
    if (!getToken()) { setUser(null); setAuthReady(true); return; }
    try { const r = await api<User>('/me'); setUser(r.data); await loadFavs(); } catch { setToken(null); setUser(null); }
    setAuthReady(true);
  }, [loadFavs]);
  useEffect(() => { void refreshUser(); void refreshCart(); }, [refreshUser, refreshCart]);

  const toast = useCallback((text: string, action?: Toast['action']) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t.slice(-2), { id, text, action }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000); // toast duration is an open item (Refinement 2): engineering default
  }, []);
  const dismissToast = useCallback((id: number) => setToasts(t => t.filter(x => x.id !== id)), []);
  const addToCart = useCallback(async (variantId: number, quantity = 1) => {
    const id = localStorage.getItem(CART_KEY);
    const r = await api<Cart>('/cart/items', { method: 'POST', body: { cartId: id ? Number(id) : undefined, variantId, quantity } });
    setCart(r.data);
  }, [setCart]);
  const openAuth = useCallback((after?: () => void) => { setAfterAuth(() => after ?? null); setAuthOpen(true); }, []);
  const closeAuth = useCallback(() => { setAuthOpen(false); setAfterAuth(null); }, []);
  const setSession = useCallback((token: string, u: User) => { setToken(token); setUser(u); void loadFavs(); }, [loadFavs]);
  const logout = useCallback(async () => { try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ } setToken(null); setUser(null); setFavorites(new Set()); }, []);
  const toggleFavorite = useCallback(async (pid: number) => {
    if (!user) { openAuth(); return; } // guest favourites: open item (Refinement 2) → login required
    const on = favorites.has(pid);
    const r = await api<{ id: number }[]>(`/favorites/${pid}`, { method: on ? 'DELETE' : 'PUT' });
    setFavorites(new Set(r.data.map(p => p.id)));
    toast(on ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد');
  }, [user, favorites, openAuth, toast]);

  const v = useMemo(() => ({ user, authReady, setSession, logout, refreshUser, cart, cartError, refreshCart, addToCart, setCart, favorites, toggleFavorite,
    authOpen, openAuth, closeAuth, afterAuth, toasts, toast, dismissToast }),
    [user, authReady, setSession, logout, refreshUser, cart, cartError, refreshCart, addToCart, setCart, favorites, toggleFavorite, authOpen, openAuth, closeAuth, afterAuth, toasts, toast, dismissToast]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
export function useIsMobile() {
  const q = '(max-width: 767px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(q).matches);
  useEffect(() => { const mq = window.matchMedia?.(q); if (!mq) return; const f = () => setM(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  return !!m;
}
