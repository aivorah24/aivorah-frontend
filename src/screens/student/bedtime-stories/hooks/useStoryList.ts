import { useEffect, useMemo, useState } from 'react';
import SERVER_URL from '../../../../config/bedtimeStoriesServerUrl';
import { PREMIUM_ENABLED } from '../constants';
import type { StoryMeta } from '../types';

export function useStoryList(isPro: boolean) {
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

  // First story in each collection is free
  const freeIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(grouped).forEach(items => { if (items[0]) ids.add(items[0].id); });
    return ids;
  }, [grouped]);

  function isLocked(storyId: string) { return PREMIUM_ENABLED && !isPro && !freeIds.has(storyId); }

  return { loading, error, grouped, isLocked };
}
