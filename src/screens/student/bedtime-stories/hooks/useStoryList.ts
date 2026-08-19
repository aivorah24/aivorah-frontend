import { useEffect, useMemo, useState } from 'react';
import SERVER_URL from '../../../../config/bedtimeStoriesServerUrl';
import type { StoryMeta } from '../types';

export function useStoryList() {
  const [stories, setStories] = useState<StoryMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetch(`${SERVER_URL}/stories`)
      .then(r => r.json())
      .then(data => { setStories(data); setLoading(false); })
      .catch(() => { setError('Could not load stories. Please try again.'); setLoading(false); });
  }, []);

  // Group by collection
  const grouped = useMemo(() => {
    const map: Record<string, StoryMeta[]> = {};
    stories.forEach(s => {
      if (!map[s.collection]) map[s.collection] = [];
      map[s.collection].push(s);
    });
    return map;
  }, [stories]);

  return { loading, error, grouped };
}
