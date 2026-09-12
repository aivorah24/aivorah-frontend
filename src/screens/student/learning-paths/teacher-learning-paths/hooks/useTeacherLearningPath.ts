import { useState, useEffect, useCallback } from 'react';
import { getTeacherLearningPath, StudentLearningPathApiError } from '../services/studentLearningPathService';
import { StudentTeacherLearningPath } from '../types';

export type TeacherLearningPathStatus = 'loading' | 'ok' | 'not_found' | 'forbidden' | 'error';

export function useTeacherLearningPath(curriculumId: string) {
  const [learningPath, setLearningPath] = useState<StudentTeacherLearningPath | null>(null);
  const [status, setStatus] = useState<TeacherLearningPathStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const { learningPath: lp } = await getTeacherLearningPath(curriculumId);
      setLearningPath(lp);
      setStatus('ok');
    } catch (err: any) {
      if (err instanceof StudentLearningPathApiError && err.status === 404) {
        setStatus('not_found');
      } else if (err instanceof StudentLearningPathApiError && err.status === 403) {
        setStatus('forbidden');
      } else {
        setStatus('error');
      }
      setErrorMessage(err.message || 'Failed to load the learning path.');
    }
  }, [curriculumId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { learningPath, status, errorMessage, reload: load };
}
