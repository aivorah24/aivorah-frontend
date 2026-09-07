import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchChildren, fetchStudentStats, fetchChildReport, fetchCurriculumSubjects } from '../services/parentLearningService';
import type { Child, ChildReport } from '../types';

// Deliberately does NOT seed `children` from AuthContext's `user.children` -
// confirmed via a live E2E investigation (2026-09-04) that field can hold
// stale/unrelated data (a different, unlinked child was served from it for
// a real test account), and since it rendered before this hook's own real
// fetch resolved, the screen queried curriculum content for the WRONG
// child's grade - a real bug, not a data-seeding gap. The real fetch below
// is the only source of truth.
export function useParentLearningData(parentEmail: string, targetChildId?: string) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsReport, setAnalyticsReport] = useState<ChildReport | null>(null);

  useEffect(() => {
    if (!parentEmail) return;
    fetchChildren(parentEmail)
      .then(data => {
        if (data.length > 0) {
          setChildren(data);
          if (targetChildId) {
            const idx = data.findIndex(c => c.id === targetChildId);
            if (idx >= 0) setSelectedIdx(idx);
          }
        }
      })
      .catch(() => {});
  }, [parentEmail, targetChildId]);

  const child = children[selectedIdx];
  const childCurriculum = child?.curriculum ?? '';
  const childGrade = child?.grade ?? 'Grade 3';
  const completedSet = useMemo(() => new Set(completedTopics), [completedTopics]);

  const fetchData = useCallback(async () => {
    if (!child) { setLoading(false); return; }
    setLoading(true);
    try {
      const stats = await fetchStudentStats(child.id);
      setCompletedTopics(stats.completedTopics);

      if (child.email) {
        const report = await fetchChildReport(child.email);
        setAnalyticsReport(report);
      }

      const subs = await fetchCurriculumSubjects(childGrade, childCurriculum);
      setSubjects(subs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [child, childGrade, childCurriculum]);

  // Reset analytics when child switches, then fetch fresh data — clears the
  // previous child's report immediately so it's never shown for the wrong
  // child during the fetch gap; not derivable from render-time values alone.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalyticsReport(null);
  }, [selectedIdx]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off the async fetch for the (possibly new) child
  useEffect(() => { fetchData(); }, [fetchData]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  return {
    children, selectedIdx, setSelectedIdx, child, childCurriculum, childGrade,
    subjects, completedTopics, completedSet, loading, refreshing, analyticsReport, refresh,
  };
}
