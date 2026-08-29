import { useEffect, useState } from 'react';
import { fetchWeeklyActivity } from '../services/progressService';
import type { DayActivity } from '../types';

export function useWeeklyActivity(studentId: string | undefined) {
  const [periodTab, setPeriodTab] = useState<'Week' | 'Month'>('Week');
  const [weeklyDays, setWeeklyDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    // Bug: the Month tab used to update this state but nothing re-fetched
    // when it changed — `periodTab` must be in the dependency array, and
    // passed through to the API, for the toggle to actually do anything.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching effect, external sync
    setLoading(true);
    fetchWeeklyActivity(studentId, periodTab).then((weekly) => {
      setWeeklyDays(weekly.days ?? []);
      setLoading(false);
    });
  }, [studentId, periodTab]);

  return { periodTab, setPeriodTab, weeklyDays, loading };
}
