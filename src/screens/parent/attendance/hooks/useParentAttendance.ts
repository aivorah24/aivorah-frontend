import { useEffect, useState } from 'react';
import { fetchChildren } from '../../dashboard/services/parentDashboardService';
import { fetchStudentAttendanceSummary, type AttendanceSummary } from '../../../../services/attendanceClient';
import type { ChildData } from '../../dashboard/types';

// The parent's own children (students-service, same as the dashboard) and the selected child's attendance.
export function useParentAttendance(parentEmail: string, enabled: boolean, initialChildId?: string) {
  const [children, setChildren] = useState<ChildData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingChildren, setLoadingChildren] = useState(enabled && !!parentEmail);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !parentEmail) return;
    let cancelled = false;
    fetchChildren(parentEmail)
      .then((list) => {
        if (cancelled) return;
        const kids = list || [];
        setChildren(kids);
        const found = initialChildId ? kids.find((c) => c.id === initialChildId) : null;
        setSelectedId((found || kids[0])?.id ?? null);
      })
      .catch(() => { if (!cancelled) setError('Could not load your children'); })
      .finally(() => { if (!cancelled) setLoadingChildren(false); });
    return () => { cancelled = true; };
  }, [enabled, parentEmail, initialChildId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    // data fetching effect — reset before loading the newly selected child
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSummary(true);
    setSummary(null);
    setError(null);
    fetchStudentAttendanceSummary(selectedId)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Could not load attendance'); })
      .finally(() => { if (!cancelled) setLoadingSummary(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const selectedChild = children.find((c) => c.id === selectedId) || null;
  return { children, selectedChild, selectChild: setSelectedId, loadingChildren, summary, loadingSummary, error };
}
