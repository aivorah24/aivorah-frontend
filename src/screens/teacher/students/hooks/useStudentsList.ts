import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { Student } from '../types';
import { DEMO_EMAILS } from '../constants';
import { deriveStudentsForTeacher } from '../utils/studentFilters';
import { fetchStudentsByTeacher, fetchTeacherPreferences, removeStudent as removeStudentApi } from '../services/studentsService';

export function useStudentsList(user: any) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Grades + curricula this teacher handles — fetched authoritatively from saved
  // preferences (user.teaches on the cached profile can be stale after onboarding).
  const [fetchedGrades, setFetchedGrades] = useState<string[]>([]);
  const [fetchedCurricula, setFetchedCurricula] = useState<string[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isDemo = DEMO_EMAILS.has(user?.email?.toLowerCase() || '');

  const load = useCallback(async () => {
    try {
      const email = user?.email || '';
      if (!email) { setLoading(false); setRefreshing(false); return; }
      const res = await fetchStudentsByTeacher(email);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setStudents(data);
        } else if (isDemo) {
          // Demo teacher with no DB students yet — show demo roster
          setStudents(deriveStudentsForTeacher(user?.teaches ?? []));
        } else {
          setStudents([]);
        }
      } else if (isDemo) {
        setStudents(deriveStudentsForTeacher(user?.teaches ?? []));
      } else {
        setStudents([]);
      }
    } catch {
      // A transient fetch failure must not wipe an already-loaded roster —
      // matches the Teacher Dashboard's deliberate "keep previous data" on
      // error (useTeacherDashboardData.ts). Previously this always reset to
      // [] (or demo data), so one flaky poll made this screen's count/list
      // diverge from the Dashboard's until the next successful refetch.
      setStudents((prev) => {
        if (prev.length > 0) return prev;
        return isDemo ? deriveStudentsForTeacher(user?.teaches ?? []) : [];
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isDemo]);

  // Initial load + auto-refresh every 15s so a student's name/profile edit shows
  // up here on its own (no manual refresh).
  useEffect(() => {
    // data fetching effect — setState happens inside load, not synchronously here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const interval = setInterval(load, 15 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  // Reload the student list on focus and when the browser tab becomes visible.
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  // Fetch the teacher's grades + curricula authoritatively from saved preferences —
  // on every focus, so a change in Settings shows up here instantly (no refresh).
  useFocusEffect(useCallback(() => {
    const email = user?.email;
    if (!email) return;
    fetchTeacherPreferences(email)
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        const teaches = Array.isArray(p?.teaches) ? p.teaches : [];
        const g = [...new Set(teaches.map((t: any) => t.grade).filter(Boolean))] as string[];
        const c = [...new Set(teaches.map((t: any) => t.curriculum).filter(Boolean))] as string[];
        if (g.length > 0) setFetchedGrades(g);
        if (c.length > 0) setFetchedCurricula(c);
      })
      .catch(() => {});
  }, [user?.email]));

  // Grades this teacher handles. Prefer the freshly-fetched teaches[] grades;
  // fall back to user.teaches (cached profile); only use a default if neither exists.
  const teacherGrades: string[] = user?.teaches?.map((t: any) => t.grade).filter(Boolean) ?? [];
  const allowedGrades = fetchedGrades.length > 0
    ? fetchedGrades
    : (teacherGrades.length > 0 ? teacherGrades : ['Grade 3', 'Grade 4', 'Grade 5']);
  // Curricula this teacher handles (for the student curriculum picker).
  const teacherCurricula: string[] = [...new Set((user?.teaches?.map((t: any) => t.curriculum).filter(Boolean)) ?? [])] as string[];
  const allowedCurricula = fetchedCurricula.length > 0
    ? fetchedCurricula
    : (teacherCurricula.length > 0 ? teacherCurricula : (user?.curriculum ? [user.curriculum] : ['IB PYP']));

  // onRemoved lets the caller refresh the linkable list so the removed student
  // appears there immediately.
  async function handleRemoveStudent(studentId: string, onRemoved?: () => void) {
    setRemovingId(studentId);
    try {
      const res = await removeStudentApi(user?.email || '', studentId);
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== studentId));
        // Refresh linkable list so the removed student appears immediately
        onRemoved?.();
      }
    } catch {}
    setRemovingId(null);
  }

  return {
    students, setStudents, loading, refreshing, setRefreshing, load,
    fetchedGrades, fetchedCurricula, teacherGrades, allowedGrades, allowedCurricula,
    removingId, handleRemoveStudent,
  };
}
