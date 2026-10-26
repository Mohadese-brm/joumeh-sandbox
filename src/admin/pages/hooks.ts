import { useCallback, useEffect, useState } from 'react';
import { aapi, AdminApiError } from '../api';
export function useLoad<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null); const [extra, setExtra] = useState<any>(null);
  const [error, setError] = useState<AdminApiError | null>(null); const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    if (!path) return; setLoading(true); setError(null);
    aapi<T>(path).then(r => { setData(r.data); setExtra(r); }).catch(e => setError(e)).finally(() => setLoading(false));
  }, [path]);
  useEffect(reload, [reload]);
  return { data, extra, error, loading, reload, setData };
}
