import { useEffect, useState } from 'react';
import { listTeacherLearningPaths, getTeacherLearningPath } from '../services/studentLearningPathService';
import { StudentTeacherLearningPath, TeacherLearningPathSummary } from '../types';

export type LoadedTeacherPath = { summary: TeacherLearningPathSummary; path: StudentTeacherLearningPath };

// The published paths of the student's teachers for a grade (and optionally one subject), with their full units and
// topics. Failures read as "no teacher paths" — the book syllabus still shows.
export function useTeacherPaths(grade: string, subject?: string) {
  const [paths, setPaths] = useState<LoadedTeacherPath[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // data fetching effect — reset before the async fetch below
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false);
    (async () => {
      try {
        const { learningPaths } = await listTeacherLearningPaths({ grade, ...(subject ? { subject } : {}) });
        const full = await Promise.all(learningPaths.map(async (summary) => {
          const { learningPath } = await getTeacherLearningPath(summary.curriculumId);
          return { summary, path: learningPath };
        }));
        if (!cancelled) setPaths(full);
      } catch {
        if (!cancelled) setPaths([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [grade, subject]);

  return { paths, loaded };
}
