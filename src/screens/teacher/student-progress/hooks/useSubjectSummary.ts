import { useCallback, useEffect, useState } from 'react';
import { fetchSubjectSummary } from '../services/studentProgressService';
import type { SubjectSummary } from '../types';

const EMPTY: SubjectSummary = { subjects: [], combined: null };

export function useSubjectSummary(teacherEmail: string | undefined) {
  const [data, setData] = useState<SubjectSummary>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!teacherEmail) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await fetchSubjectSummary(teacherEmail);
      setData(result && Array.isArray(result.subjects) ? result : EMPTY);
    } catch {
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [teacherEmail]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { subjects: data.subjects, combined: data.combined, loading };
}
