import { useEffect, useMemo, useState } from 'react';
import { curriculumCacheKey, getMemorySubjectChapters } from '../../../../utils/curriculumPrefetch';
import { fetchCurriculumSubjects, fetchPerformance } from '../../dashboard/services/dashboardService';
import { computeAllBarTopics, type BarTopic, type PerfData, type SubjectChapters } from '../../utils/performanceStats';
import { monolithContentCurriculum } from '../../../../utils/curriculum';

const IB_PYP_GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
const NO_CONTENT_GRADES = ['Nursery', 'LKG', 'UKG'];

// Same chapter source + mastery rule as the Dashboard ("X / 58 chapters"), so both screens agree.
export function useChapterProgress(
  userGrade: string | undefined,
  userCurriculum: string | undefined,
  studentId: string | undefined,
  userEmail: string | undefined,
  completedSet: Set<string>,
) {
  const studentGrade = userGrade ?? 'Grade 3';
  const isIBPYP = userCurriculum ? /^ib.?pyp$/i.test(userCurriculum.trim()) : IB_PYP_GRADES.includes(studentGrade);
  const cacheKey = curriculumCacheKey(isIBPYP, studentGrade, userCurriculum);
  const noContent = NO_CONTENT_GRADES.includes(studentGrade);

  const [subjectChapters, setSubjectChapters] = useState<SubjectChapters[] | null>(
    () => getMemorySubjectChapters(cacheKey) ?? null,
  );
  const [perfData, setPerfData] = useState<PerfData>({ topics: {}, avgScore: null });

  useEffect(() => {
    if (noContent) return;
    const curricParam = isIBPYP ? 'IB_PYP' : monolithContentCurriculum(userCurriculum);
    let cancelled = false;
    fetchCurriculumSubjects(curricParam, studentGrade)
      .then(d => {
        if (cancelled || !Array.isArray(d.subjects)) return;
        setSubjectChapters(d.subjects.map((s: any) => ({
          subject: s.subject,
          chapters: (s.chapters?.length ? s.chapters.map((c: any) => c.title) : s.units) || [],
        })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isIBPYP, userCurriculum, studentGrade, noContent]);

  useEffect(() => {
    if (!studentId || !userEmail) return;
    let cancelled = false;
    fetchPerformance(studentId, userEmail)
      .then(d => { if (!cancelled && d?.topics) setPerfData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [studentId, userEmail]);

  const chapters: BarTopic[] | null = useMemo(() => {
    if (noContent) return [];
    return subjectChapters ? computeAllBarTopics(subjectChapters, isIBPYP, studentGrade, perfData, completedSet) : null;
  }, [noContent, subjectChapters, isIBPYP, studentGrade, perfData, completedSet]);

  return chapters;
}
