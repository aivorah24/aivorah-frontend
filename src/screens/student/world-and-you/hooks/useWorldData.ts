import { useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/worldAndYouServerUrl';
import type { WorldData } from '../types';

export function useWorldData(grade: string) {
  const [loading, setLoading] = useState(true);
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      setShowAnswer(false);
      try {
        const res  = await fetch(`${SERVER_URL}/world/daily?grade=${encodeURIComponent(grade)}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setWorldData(json);
      } catch {
        setError('Could not load today\'s content. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [grade]);

  return { loading, worldData, showAnswer, setShowAnswer, error };
}
