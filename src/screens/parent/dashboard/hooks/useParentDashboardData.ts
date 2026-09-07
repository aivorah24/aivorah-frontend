import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchChildren, fetchWeeklyActivity, fetchAssignments, fetchAIReport, fetchAttendanceSummary } from '../services/parentDashboardService';
import { EMPTY_CHILD, WEEK_DAYS_ORDER } from '../constants';
import type { ChildData, Assignment } from '../types';

export function useParentDashboardData({
  parentEmail, route, navigation, isB2B,
}: { parentEmail: string; route: any; navigation: any; isB2B: boolean }) {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildData>(EMPTY_CHILD);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [subjectPerf, setSubjectPerf] = useState<{ subject: string; avgScore: number; attempts: number }[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);

  const lastChildIdRef = useRef<string | undefined>(undefined);

  const loadChildren = useCallback((targetChildId?: string) => {
    fetchChildren(parentEmail)
      .then(mapped => {
        if (mapped) {
          setChildren(mapped);
          const id = targetChildId ?? route.params?.childId;
          const found = id ? mapped.find(c => c.id === id) : null;
          setSelectedChild(found || mapped[0]);
        }
      })
      .catch(() => {})
      .finally(() => setChildrenLoading(false));
  }, [parentEmail, route.params?.childId]);

  useEffect(() => {
    const incoming = route.params?.childId;
    if (incoming !== lastChildIdRef.current) {
      lastChildIdRef.current = incoming;
      loadChildren(incoming);
    }
  }, [route.params?.childId, loadChildren]);

  useEffect(() => { loadChildren(); }, [parentEmail]); // eslint-disable-line

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => { if (interval) { clearInterval(interval); interval = null; } };
    const refresh = () => {
      fetchChildren(parentEmail)
        .then(mapped => {
          if (!mapped) return;
          setChildren(mapped);
          setSelectedChild(prev => mapped.find(ch => ch.id === prev.id) ?? mapped[0]);
        }).catch(() => {});
    };
    const startPolling = () => { stopPolling(); interval = setInterval(refresh, 30000); };
    const unsubFocus = navigation.addListener('focus', () => { refresh(); startPolling(); });
    const unsubBlur = navigation.addListener('blur', stopPolling);
    startPolling();
    return () => { stopPolling(); unsubFocus(); unsubBlur(); };
  }, [navigation, parentEmail, selectedChild.id]);

  useEffect(() => {
    if (!selectedChild.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets + kicks off data fetches below on selected-child change, external sync
    setWeeklyActivity([0, 0, 0, 0, 0, 0, 0]);
    fetchWeeklyActivity(selectedChild.id)
      .then(data => {
        if (data?.days) {
          const m: Record<string, number> = {};
          (data.days as { day: string; studyMinutes: number }[]).forEach(d => { m[d.day] = d.studyMinutes; });
          setWeeklyActivity(WEEK_DAYS_ORDER.map(d => m[d] ?? 0));
        }
      }).catch(() => {});
    fetchAssignments(selectedChild.id)
      // Server sorts oldest-due-first, so a long-overdue-but-still-pending
      // assignment sorts ahead of real upcoming ones — take a wider pool here
      // so the "Upcoming Events" date filter below has real future items to find,
      // instead of only ever seeing the 4 oldest (most overdue) assignments.
      .then(data => { if (Array.isArray(data)) setAssignments(data.slice(0, 20)); })
      .catch(() => {});
    setSubjectPerf([]);
    fetchAIReport(parentEmail, selectedChild.id)
      .then(data => { if (data?.subjectPerformance) setSubjectPerf(data.subjectPerformance); })
      .catch(() => {});
    // Attendance is a B2B (school-linked) feature only — skip fetch for B2C parents.
    setAttendanceSummary(null);
    if (isB2B) {
      fetchAttendanceSummary(selectedChild.id)
        .then(data => {
          if (data && data.summary) {
            setAttendanceSummary(data);
          }
        })
        .catch(() => {});
    }
  }, [selectedChild.id]);

  return {
    children, selectedChild, setSelectedChild, childrenLoading,
    assignments, weeklyActivity, subjectPerf,
    attendanceSummary,
  };
}
