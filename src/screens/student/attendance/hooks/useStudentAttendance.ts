import { useEffect, useState } from 'react';
import { fetchStudentAttendanceSummary, type AttendanceSummary } from '../../../../services/attendanceClient';

// The logged-in student's own attendance — same summary endpoint the
// parent screen uses, scoped server-side to studentId === the caller
// (see aivorah-attendance-service routes/attendance.js: `user.id === student.id`).
export function useStudentAttendance(studentId: string) {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(!!studentId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for the fetch below
    setLoading(true);
    setError(null);
    fetchStudentAttendanceSummary(studentId)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Could not load attendance'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [studentId]);

  return { summary, loading, error };
}
