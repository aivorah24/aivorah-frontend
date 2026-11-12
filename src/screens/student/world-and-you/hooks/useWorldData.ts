import { useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/worldAndYouServerUrl';
import { readScreenCache, writeScreenCache } from '../../../../utils/screenCache';
import type { WorldData } from '../types';

// Today's On This Day + Fun Challenge for the grade. The content changes once
// a day, so a copy from earlier today is shown instantly and refreshed quietly.
function cacheKeyFor(grade: string) {
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `world-daily:${grade}:${day}`;
}

export function useWorldData(grade: string) {
  const [loading, setLoading] = useState(() => !readScreenCache<WorldData>(cacheKeyFor(grade)));
  const [worldData, setWorldData] = useState<WorldData | null>(() => readScreenCache<WorldData>(cacheKeyFor(grade)));
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const key = cacheKeyFor(grade);
    const cached = readScreenCache<WorldData>(key);
    (async () => {
      setWorldData(cached);
      setLoading(!cached);
      setError('');
      setShowAnswer(false);
      try {
        const res  = await fetch(`${SERVER_URL}/world/daily?grade=${encodeURIComponent(grade)}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        if (cancelled) return;
        setWorldData(json);
        // A quick first version (AI still writing) is shown but not kept, so
        // the next visit asks again and gets the full one.
        if (!json.partial) writeScreenCache(key, json);
      } catch {
        if (!cancelled && !cached) setError('Could not load today\'s content. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [grade]);

  return { loading, worldData, showAnswer, setShowAnswer, error };
}
