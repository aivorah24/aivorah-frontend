import { useEffect, useState } from 'react';
import { fetchLlmInsights } from '../services/llmStatsService';
import type { LlmInsights } from '../types';

export function useLlmInsights(days: number) {
  const [insights, setInsights] = useState<LlmInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true; // ignore answers for a range the user already left
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before each per-range fetch
    setLoading(true);
    setError('');
    setInsights(null);
    fetchLlmInsights(days)
      .then((r) => { if (live) setInsights(r); })
      .catch((e: any) => { if (live) setError(e?.message || 'Could not load insights.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [days]);

  return { insights, loading, error };
}
