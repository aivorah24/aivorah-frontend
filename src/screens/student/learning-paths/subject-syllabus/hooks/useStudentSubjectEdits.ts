import { useEffect, useState } from 'react';
import { getSubjectEditsForStudent } from '../../teacher-learning-paths/services/studentLearningPathService';
import type { SubjectEdits } from '../subjectEdits';

// The student's teacher's changes to this subject; any failure means "no changes" so the standard path still shows.
export function useStudentSubjectEdits(curriculum: string, grade: string, subject: string, opts?: { enabled?: boolean }) {
  const enabled = opts?.enabled !== false;
  const [edits, setEdits] = useState<SubjectEdits | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    // data fetching effect — reset before the async fetch below
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(false);
    getSubjectEditsForStudent({ curriculum, grade, subject })
      .then((r) => { if (!cancelled) setEdits(r.edits || null); })
      .catch(() => { if (!cancelled) setEdits(null); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [curriculum, grade, subject, enabled]);
  return { edits, loaded };
}
