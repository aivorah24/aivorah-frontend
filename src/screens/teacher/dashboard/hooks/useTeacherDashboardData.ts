import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchTeacherStudents,
  fetchTeacherInsights,
  fetchTeacherRecentActivity,
} from '../services/teacherDashboardService';

// Consolidates the data-fetching + polling that used to live directly inside
// TeacherDashboardScreen: initial fetch, 30s auto-refresh, refetch on screen
// focus, and refetch on browser-tab visibility change. Behavior unchanged.
export function useTeacherDashboardData(teacherEmail: string | undefined) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<any>({ assignments: [], challenges: [], totals: {} });
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  // NOTE: intentionally NOT catching each fetch individually — if any one of
  // the 3 rejects, Promise.all rejects and ALL 3 results are discarded, not
  // just the failing one. This is deliberate (see "one endpoint failing
  // (insights) discards the other two responses too" E2E test) and must be
  // preserved exactly as it was pre-refactor.
  const fetchStudents = useCallback(async () => {
    try {
      const email = teacherEmail || 'teacher@demo.com';
      const [data, ins, act] = await Promise.all([
        fetchTeacherStudents(email),
        fetchTeacherInsights(email),
        fetchTeacherRecentActivity(email),
      ]);
      if (Array.isArray(data)) setStudents(data);
      try { setInsights(ins); } catch {}
      try { if (Array.isArray(act)) setActivityFeed(act); } catch {}
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teacherEmail]);

  // Initial fetch + auto-refresh every 30s so Learning Path study time (and
  // any other student stat) stays reasonably current without a manual refresh.
  // (Previously 5s — far more aggressive than every other screen's polling and
  // a real contributor to database connection pressure under load.)
  useEffect(() => {
    // data fetching effect — setState happens inside fetchStudents, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStudents();
    const interval = setInterval(fetchStudents, 30 * 1000);
    return () => clearInterval(interval);
  }, [fetchStudents]);

  // Also refetch immediately whenever this screen regains focus or the browser
  // tab becomes visible again (covers switching tabs back to the teacher view).
  useFocusEffect(useCallback(() => { fetchStudents(); }, [fetchStudents]));
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStudents(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [fetchStudents]);

  return { students, loading, refreshing, setRefreshing, insights, activityFeed, fetchStudents };
}
