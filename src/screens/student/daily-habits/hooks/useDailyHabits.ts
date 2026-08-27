import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import SERVER_URL from '../../../../config/dailyHabitsServerUrl';
import { useAuth } from '../../../../context/AuthContext';
import type { CoinPop, TodayData } from '../types';

export function useDailyHabits() {
  const { user } = useAuth();

  const [data,       setData]       = useState<TodayData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [checking,   setChecking]   = useState<string | null>(null);
  const [coinPop,    setCoinPop]    = useState<CoinPop | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`${SERVER_URL}/habits/today?userEmail=${encodeURIComponent(user.email)}`);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const json = await res.json();
      setData(json);
      setError('');
    } catch {
      setError('Could not load habits. Please try again.');
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  // Initial load + auto-refresh every 10s so tasks a parent allocates appear
  // without the student manually refreshing the browser.
  useEffect(() => {
    // data fetching effect — setState happens inside fetchData, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    const interval = setInterval(fetchData, 10 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Refresh immediately whenever the screen regains focus.
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  async function toggleHabit(habitId: string) {
    if (!user?.email || checking) return;
    setChecking(habitId);
    try {
      const res = await fetch(`${SERVER_URL}/habits/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email, habitId }),
      });
      const json = await res.json();
      setData(prev => prev ? {
        ...prev,
        today: { completed: json.completed, coinsEarned: json.coinsEarned },
        streak: json.streak,
        totalCoins: json.totalCoins,
        journalText: json.journalText,
      } : prev);
      if (json.checked && json.coinsChange > 0) {
        setCoinPop({ id: habitId, coins: json.coinsChange });
        setTimeout(() => setCoinPop(null), 1800);
      }
    } catch {}
    finally { setChecking(null); }
  }

  function onRefresh() { setRefreshing(true); fetchData(); }

  return { data, loading, error, refreshing, checking, coinPop, toggleHabit, onRefresh };
}
