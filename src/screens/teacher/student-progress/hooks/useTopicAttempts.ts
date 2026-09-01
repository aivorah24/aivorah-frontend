import { useCallback, useEffect, useState } from 'react';
import { fetchTopicAttempts } from '../services/studentProgressService';
import type { TopicAttempt } from '../types';

// On-demand — only fetches once a student+topic cell is actually selected
// (see AttemptDrawer.tsx), not eagerly for the whole roster.
export function useTopicAttempts(studentId: string | undefined, topic: string | undefined) {
  const [attempts, setAttempts] = useState<TopicAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!studentId || !topic) { setAttempts([]); return; }
    setLoading(true);
    setError(false);
    try {
      const result = await fetchTopicAttempts(studentId, topic);
      setAttempts(Array.isArray(result?.attempts) ? result.attempts : []);
    } catch {
      setError(true);
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, topic]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { attempts, loading, error };
}
