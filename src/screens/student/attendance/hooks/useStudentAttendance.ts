import { useEffect, useState } from 'react';
import { fetchStudentAttendanceSummary, type AttendanceSummary } from '../../../../services/attendanceClient';
import { readScreenCache, writeScreenCache } from '../../../../utils/screenCache';

// The logged-in student's own attendance — same summary endpoint the
// parent screen uses, scoped server-side to studentId === the caller
// (see aivorah-attendance-service routes/attendance.js: `user.id === student.id`).
export function useStudentAttendance(studentId: string) {
  // Last summary this student saw: shown instantly while the fresh one loads.
  const cacheKey = `attendance:${studentId}`;
  const [summary, setSummary] = useState<AttendanceSummary | null>(() => (studentId ? readScreenCache<AttendanceSummary>(cacheKey) : null));
  const [loading, setLoading] = useState(() => !!studentId && !readScreenCache(cacheKey));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    const cached = readScreenCache<AttendanceSummary>(cacheKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the last summary, or a spinner, while fetching
    setSummary(cached);
    setLoading(!cached);
    setError(null);
    fetchStudentAttendanceSummary(studentId)
      .then((data) => { if (!cancelled) { setSummary(data); writeScreenCache(cacheKey, data); } })
      // A failed refresh keeps showing the last summary; the error only shows when there is nothing to show.
      .catch((e) => { if (!cancelled && !cached) setError(e?.message || 'Could not load attendance'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId, cacheKey]);

  return { summary, loading, error };
}
