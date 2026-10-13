import { useEffect, useState } from 'react';
import { fetchWeeklyActivity } from '../services/progressService';
import type { DayActivity } from '../types';

export function useWeeklyActivity(studentId: string | undefined) {
  const [weeklyDays, setWeeklyDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data-fetching effect, external sync
    setLoading(true);
    fetchWeeklyActivity(studentId).then((weekly) => {
      setWeeklyDays(weekly.days ?? []);
      setLoading(false);
    });
  }, [studentId]);

  return { weeklyDays, loading };
}
