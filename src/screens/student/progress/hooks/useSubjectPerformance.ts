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
    // Bug: an unset curriculum used to unconditionally fall back to IB PYP,
    // which only has content for Grade 1-5 — any Grade 6-12 student without
    // curriculum explicitly set on their profile got a real, non-empty
    // subject request that always came back empty. Only truly IB PYP-range
    // grades should default to IB PYP when curriculum is missing; everyone
    // else falls through to CBSE/NCERT.
    const IB_PYP_GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
    const isIBPYP = userCurriculum
      ? /^ib.?pyp$/i.test(userCurriculum.trim())
      : IB_PYP_GRADES.includes(studentGrade);
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
