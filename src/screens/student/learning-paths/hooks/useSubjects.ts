import { useEffect, useState } from 'react';
import SERVER_URL from '../../../../config/serverUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import { getIBPYPStaticSubjects } from '../utils';
import type { SubjectData } from '../types';

export function useSubjects(curriculum: string, grade: string, isCBSE: boolean, isPYP: boolean) {
  // IB DP, IB MYP and CBSE subjects come from aivorah-learning-paths-service
  // (CBSE from its book-derived chapter data, IB DP/MYP from Qdrant) — the
  // monolith's /curriculum/subjects has nothing reliable for any of these.
  // Every other curriculum keeps hitting the monolith as before.
  const isIBDP = /^ib.?dp$/i.test(curriculum.trim());
  const isIBMYP = /^ib.?myp$/i.test(curriculum.trim());
  // Cambridge Grades 1-5 (Primary) already have real data on the monolith;
  // Grade 6 and up (Primary Stage 6 onward, Lower Secondary, IGCSE, AS/A
  // Level) live in Qdrant via aivorah-learning-paths-service instead, since
  // the monolith has nothing for them.
  const isCambridge = /^cambridge$/i.test(curriculum.trim());
  const gradeNum = parseInt(grade.replace(/\D/g, ''), 10);
  const isCambridgeQdrant = isCambridge && gradeNum >= 6;
  // Server (Qdrant) is the source of truth for subjects. We no longer pre-seed a
  // stale static IB PYP list — that painted first then got swapped for the real
  // set (different topic counts + extra subjects), which looked like a flicker.
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // data fetching effect — reset loading/error state before the async fetch below
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');

    // For CBSE, query Qdrant with curriculum=CBSE
    const queryCurriculum = isCBSE ? 'CBSE' : curriculum;
    const base = (isIBDP || isIBMYP || isCambridgeQdrant || isCBSE) ? LEARNING_PATHS_SERVER_URL : SERVER_URL;

    fetch(`${base}/curriculum/subjects?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(queryCurriculum)}`)
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
