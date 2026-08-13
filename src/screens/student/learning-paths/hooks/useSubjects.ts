import { useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';
import { getIBPYPStaticSubjects } from '../utils';
import type { SubjectData } from '../types';

export function useSubjects(curriculum: string, grade: string, isCBSE: boolean, isPYP: boolean) {
  // Server (Qdrant) is the source of truth for subjects. We no longer pre-seed a
  // stale static IB PYP list — that painted first then got swapped for the real
  // set (different topic counts + extra subjects), which looked like a flicker.
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    // For CBSE, query Qdrant with curriculum=CBSE
    const queryCurriculum = isCBSE ? 'CBSE' : curriculum;

    fetch(`${SERVER_URL}/curriculum/subjects?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(queryCurriculum)}`)
      .then((r) => r.json())
      .then((data: { subjects: SubjectData[] }) => {
        if (cancelled) return;
        if (data.subjects && data.subjects.length > 0) {
          setSubjects(data.subjects);
        } else if (isPYP) {
          // Offline / empty fallback only (server is the source of truth).
          setSubjects(getIBPYPStaticSubjects(grade));
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (isPYP) setSubjects(getIBPYPStaticSubjects(grade));
        else setError('Could not load curriculum right now. Check if the server is running and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [curriculum, grade, isCBSE, isPYP]);

  return { subjects, loading, error };
}
