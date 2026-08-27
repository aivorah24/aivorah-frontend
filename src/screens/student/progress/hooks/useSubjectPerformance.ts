import { useEffect, useState } from 'react';
import { curriculumCacheKey, getMemoryCurriculum } from '../../../../utils/curriculumPrefetch';
import { fetchIBPYPOrCBSECurriculum, fetchNCERTChapters } from '../services/progressService';
import { parseIBPYPCurriculum, parseNCERTCurriculum } from '../utils/progressCalculations';
import type { CurriculumData } from '../types';

// Same curriculum shape/source as DashboardScreen, so Subject Performance here
// matches what Dashboard shows — was previously never fetched at all, leaving
// this section permanently empty regardless of real progress.
export function useSubjectPerformance(userGrade: string | undefined, userCurriculum: string | undefined) {
  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null);

  useEffect(() => {
    const studentGrade = userGrade ?? 'Grade 3';
    const isIBPYP = !userCurriculum || userCurriculum.toLowerCase().includes('ib');
    const cacheKey = curriculumCacheKey(isIBPYP, studentGrade);

    const cached = getMemoryCurriculum(cacheKey);
    if (cached) {
      // syncing to an external in-memory cache — not derivable state, and the
      // effect also owns the async fetch path below for the uncached case
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurriculum(cached.type === 'ibpyp' ? parseIBPYPCurriculum(cached.data) : parseNCERTCurriculum(cached.data, studentGrade));
      return;
    }

    (async () => {
      try {
        const isGrade3 = studentGrade === 'Grade 3' || studentGrade === 'Class 3';
        const useUnified = isIBPYP || !isGrade3;
        if (useUnified) {
          const curricParam = encodeURIComponent(isIBPYP ? 'IB_PYP' : (userCurriculum ?? 'NCERT'));
          const data = await fetchIBPYPOrCBSECurriculum(curricParam, studentGrade);
          setCurriculum(parseIBPYPCurriculum(data));
        } else {
          const data = await fetchNCERTChapters();
          setCurriculum(parseNCERTCurriculum(data, studentGrade));
        }
      } catch {
        // Leave curriculum null — Subject Performance falls back to its own empty state.
      }
    })();
  }, [userGrade, userCurriculum]);

  return curriculum;
}
