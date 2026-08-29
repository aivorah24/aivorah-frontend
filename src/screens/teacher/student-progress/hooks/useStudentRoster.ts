import { useCallback, useEffect, useState } from 'react';
import { fetchStudentRoster } from '../services/studentProgressService';
import type { RosterStudent } from '../types';

export function useStudentRoster(teacherEmail: string | undefined) {
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!teacherEmail) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await fetchStudentRoster(teacherEmail);
      setStudents(Array.isArray(result) ? result : []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [teacherEmail]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { students, loading };
}
