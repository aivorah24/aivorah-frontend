import { useState, useEffect, useCallback } from 'react';
import { listTeacherLearningPaths } from '../services/studentLearningPathService';
import { TeacherLearningPathSummary } from '../types';

export function useTeacherLearningPaths() {
  const [learningPaths, setLearningPaths] = useState<TeacherLearningPathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { learningPaths: paths } = await listTeacherLearningPaths();
      setLearningPaths(paths);
    } catch (err: any) {
      setError(err.message || 'Failed to load learning paths.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { learningPaths, loading, error, reload: load };
}
