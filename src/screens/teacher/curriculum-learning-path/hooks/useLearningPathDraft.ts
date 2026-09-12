import { useState, useCallback } from 'react';
import { getLearningPath, saveLearningPathDraft, publishLearningPath } from '../services/curriculumLearningPathService';
import { TeacherLearningPath, LearningPathContent } from '../types';

export function useLearningPathDraft(curriculumId: string | null) {
  const [learningPath, setLearningPath] = useState<TeacherLearningPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!curriculumId) return;
    setLoading(true);
    setError('');
    try {
      const { learningPath: lp } = await getLearningPath(curriculumId);
      setLearningPath(lp);
    } catch (err: any) {
      setError(err.message || 'Failed to load the learning path.');
    } finally {
      setLoading(false);
    }
  }, [curriculumId]);

  const updateContent = useCallback((content: LearningPathContent) => {
    setLearningPath((prev) => (prev ? { ...prev, content } : prev));
  }, []);

  const save = useCallback(async () => {
    if (!curriculumId || !learningPath) return false;
    setSaving(true);
    setError('');
    try {
      const { learningPath: updated } = await saveLearningPathDraft(curriculumId, learningPath.content);
      setLearningPath(updated);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save edits.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [curriculumId, learningPath]);

  const publish = useCallback(async () => {
    if (!curriculumId) return false;
    setPublishing(true);
    setError('');
    try {
      const { learningPath: published } = await publishLearningPath(curriculumId);
      setLearningPath(published);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to publish.');
      return false;
    } finally {
      setPublishing(false);
    }
  }, [curriculumId]);

  return { learningPath, loading, saving, publishing, error, load, updateContent, save, publish };
}
