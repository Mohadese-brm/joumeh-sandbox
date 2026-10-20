import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: number | null; extra: Record<string, unknown> }>({ data: null, loading: !!path, error: null, extra: {} });
  const load = useCallback(async () => {
    if (!path) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try { const { data, ...extra } = await api<T>(path); setState({ data, loading: false, error: null, extra }); }
    catch (e) { setState({ data: null, loading: false, error: (e as { status?: number }).status ?? 500, extra: {} }); }
  }, [path]);
  useEffect(() => { void load(); }, [load]);
  return { ...state, reload: load, setData: (d: T) => setState(s => ({ ...s, data: d })) };
}
