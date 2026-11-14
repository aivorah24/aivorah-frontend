import { useCallback, useEffect, useState } from 'react';

/**
 * Loads data on mount and whenever `fetcher` changes (pass a useCallback, so
 * it changes only with its inputs); `reload()` fetches again.
 */
export function useLoad<T>(fetcher: () => Promise<T>, fallbackError: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetcher());
    } catch (e: any) {
      setError(e?.message || fallbackError);
    } finally {
      setLoading(false);
    }
  }, [fetcher, fallbackError]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and when the inputs change (same pattern as useLlmStats)
  useEffect(() => { reload(); }, [reload]);

  return { data, setData, loading, error, reload };
}
