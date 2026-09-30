import { useState, useCallback } from 'react';
import { getLearningPath, saveLearningPathDraft, publishLearningPath, rebuildTopic as rebuildTopicApi, SubtopicSectionPick } from '../services/curriculumLearningPathService';
import { TeacherLearningPath, LearningPathContent } from '../types';

export function useLearningPathDraft(curriculumId: string | null) {
  const [learningPath, setLearningPath] = useState<TeacherLearningPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  // Edits made in the browser that are not on the server yet.
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!curriculumId) return;
    setLoading(true);
    setError('');
    try {
      const { learningPath: lp } = await getLearningPath(curriculumId);
      setLearningPath(lp);
      setDirty(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load the learning path.');
    } finally {
      setLoading(false);
    }
  }, [curriculumId]);

  const updateContent = useCallback((content: LearningPathContent) => {
    setLearningPath((prev) => (prev ? { ...prev, content } : prev));
    setDirty(true);
  }, []);

  // Only the rebuilt topic is merged in, so unsaved edits to other topics stay.
  const rebuildTopic = useCallback(async (unitOrder: number, topicOrder: number, picks: SubtopicSectionPick[]) => {
    if (!curriculumId) return;
    const { learningPath: server } = await rebuildTopicApi(curriculumId, unitOrder, topicOrder, picks);
    const rebuilt = server.content.units.find((u) => u.order === unitOrder)?.topics.find((t) => t.order === topicOrder);
    if (!rebuilt) return;
    setLearningPath((prev) => (prev ? {
      ...prev,
      updated_at: server.updated_at,
      content: {
        ...prev.content,
        units: prev.content.units.map((u) => (u.order !== unitOrder ? u : {
          ...u, topics: u.topics.map((t) => (t.order !== topicOrder ? t : { ...rebuilt, title: t.title })),
        })),
      },
    } : prev));
  }, [curriculumId]);

  const save = useCallback(async () => {
    if (!curriculumId || !learningPath) return false;
    setSaving(true);
    setError('');
    try {
      const { learningPath: updated } = await saveLearningPathDraft(curriculumId, learningPath.content);
      setLearningPath(updated);
      setDirty(false);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save edits.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [curriculumId, learningPath]);

  // Publishing sends what is on the server, so unsaved edits are saved first — never silently left out.
  const publish = useCallback(async () => {
    if (!curriculumId) return false;
    if (dirty && !(await save())) return false;
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
  }, [curriculumId, dirty, save]);

  const isPublished = learningPath?.status === 'published';
  // Students still see an older version: edits saved (or pending) after the last publish.
  const hasUnpublishedChanges = isPublished && (dirty || (!!learningPath?.updated_at && !!learningPath?.published_at
    && new Date(learningPath.updated_at).getTime() > new Date(learningPath.published_at).getTime() + 1000));

  return {
    learningPath, loading, saving, publishing, error, dirty, isPublished, hasUnpublishedChanges,
    load, updateContent, rebuildTopic, save, publish,
  };
}
