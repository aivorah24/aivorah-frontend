import { useCallback, useEffect, useState } from 'react';
import { fetchLlmStats } from '../services/llmStatsService';
import type { LlmStats } from '../types';

export function useLlmStats() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<LlmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchLlmStats(days));
    } catch (e: any) {
      setError(e?.message || 'Could not load LLM usage. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  // Re-fetch whenever the day-range changes — the screen's useFocusEffect
  // only re-runs on focus, not on every local state change, so switching
  // the day tab needs its own trigger here rather than relying on that.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() setting loading/error synchronously is the intended fetch-on-mount-and-on-days-change pattern this hook's tests depend on
  useEffect(() => { load(); }, [load]);

  return { days, setDays, data, loading, error, load };
}
