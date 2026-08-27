import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SERVER_URL from '../../../../config/worldAndYouServerUrl';
import type { TidbitData } from '../types';

export function useDailyTidbit(grade: string, onReload?: () => void, onTabChange?: (tab: 'gk' | 'news') => void) {
  const [tab, setTabState] = useState<'gk' | 'news'>('gk');
  // On This Day / Brain Teaser live in the PARENT screen (WorldAndYouScreen),
  // outside this card entirely — they used to show unconditionally regardless
  // of which tab was selected here, which read as "GK content leaking into
  // Current Affairs" to a student switching tabs. Reporting tab changes lets
  // the parent hide them under the Current Affairs tab, where they don't
  // conceptually belong.
  function setTab(next: 'gk' | 'news') {
    setTabState(next);
    onTabChange?.(next);
  }
  const [data, setData] = useState<TidbitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `daily_tidbit_v3_${grade}_${today}`;

  async function loadTidbit() {
    setLoading(true);
    setError(false);
    onReload?.();
    try {
      // Check AsyncStorage cache first
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
        return;
      }
      // Fetch from server
      const resp = await fetch(`${SERVER_URL}/daily-tidbit?grade=${encodeURIComponent(grade)}`);
      if (!resp.ok) throw new Error('Server error');
      const json: TidbitData = await resp.json();
      await AsyncStorage.setItem(cacheKey, JSON.stringify(json));
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // data fetching effect — setState happens inside loadTidbit, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTidbit();
  }, [grade]);

  return { tab, setTab, data, loading, error, loadTidbit };
}
