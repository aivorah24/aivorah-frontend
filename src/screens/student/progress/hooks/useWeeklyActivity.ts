import { useEffect, useState } from 'react';
import { fetchWeeklyActivity } from '../services/progressService';
import type { DayActivity } from '../types';

export function useWeeklyActivity(studentId: string | undefined) {
  const [periodTab, setPeriodTab] = useState<'Week' | 'Month'>('Week');
  const [weeklyDays, setWeeklyDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    fetchWeeklyActivity(studentId).then((weekly) => {
      setWeeklyDays(weekly.days ?? []);
      setLoading(false);
    });
  }, [studentId]);

  return { periodTab, setPeriodTab, weeklyDays, loading };
}
