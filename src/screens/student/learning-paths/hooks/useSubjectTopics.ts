import { useEffect, useMemo, useState } from 'react';
import { fetchPublishedSyllabus, getCuratedSyllabus } from '../subject-syllabus/api';
import type { SubjectData } from '../types';

// The subject list only carries chapter titles for CBSE/NCERT, so the cards could never count completed
// topics. Once the student has completed something, load each such subject's topic names (same source as
// the chapter page) and fill them in, so the card, the overall ring and the chapter page agree.
export function useSubjectTopics(subjects: SubjectData[], curriculum: string, grade: string, enabled: boolean) {
  const [names, setNames] = useState<Record<string, string[]>>({});
  const missing = useMemo(
    () => subjects.filter((s) => !s.topics.length && (s as any).chapters?.length).map((s) => s.subject),
    [subjects],
  );
  const key = missing.join('|');

  useEffect(() => {
    if (!enabled || !missing.length) return;
    let cancelled = false;
    Promise.all(missing.map(async (subject) => {
      const units = await fetchPublishedSyllabus(curriculum, grade, subject).catch(() => []);
      const chapters: any[] = units.length ? units : (getCuratedSyllabus(curriculum, grade, subject) ?? []);
      return [subject, chapters.flatMap((c) => (c.topics || []).map((t: any) => t.name).filter(Boolean))] as const;
    })).then((rows) => {
      if (!cancelled) setNames(Object.fromEntries(rows.filter(([, list]) => list.length)));
    });
    return () => { cancelled = true; };
    // `missing` is captured by `key`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, curriculum, grade]);

  return useMemo(() => subjects.map((s) => (names[s.subject] && !s.topics.length
    ? { ...s, topicCount: names[s.subject].length, topics: names[s.subject].map((topic) => ({ topic, unit: '', description: '' })) }
    : s)), [subjects, names]);
}
