import { useEffect, useState } from 'react';
import { fetchMyAttendanceClasses, type AttendanceClass } from '../../../../services/attendanceClient';

// The classes this teacher is class teacher of.
export function useAttendanceClasses() {
  const [classes, setClasses] = useState<AttendanceClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyAttendanceClasses()
      .then((list) => { if (!cancelled) setClasses(list); })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Could not load your classes'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { classes, loading, error };
}
