import { useEffect, useState } from 'react';
import { fetchTopicAttempts } from '../services/parentLearningService';
import type { TopicAttempt } from '../types';

export function useTopicAttempts(childId: string | undefined, subject: string | undefined) {
  const [attempts, setAttempts] = useState<TopicAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!childId || !subject) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before the async fetch for the new subject/child
    setLoading(true);
    setAttempts([]);
    fetchTopicAttempts(childId, subject)
      .then(a => { if (!cancelled) setAttempts(a); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [childId, subject]);

  return { attempts, loading };
}
