import { useEffect, useState } from 'react';
import { fetchSubjectSyllabus } from '../../../dashboard/services/dashboardService';
import type { SubjectSyllabusData } from '../../../utils/learningPathProgress';
import { syllabusLessonParams } from '../../../utils/lessonNavigation';

export interface NextTopic {
  name: string;
  chapterTitle: string;
  params: ReturnType<typeof syllabusLessonParams>;
}

type Unit = SubjectSyllabusData['units'][number];
const usable = (t: any) => t?.name && !t.comingSoon;

// The topic after `topic` in Learning Paths order: next in its chapter, else the first of the next chapter that has one.
export function findNextTopic(syl: SubjectSyllabusData, topic: string, ctx: { subject: string; curriculum: string; grade: string }): NextTopic | null {
  const units: Unit[] = syl.units ?? [];
  for (let ci = 0; ci < units.length; ci++) {
    const topics = (units[ci].topics ?? []) as any[];
    const ti = topics.findIndex(t => t?.name === topic || t?.baseName === topic);
    if (ti < 0) continue;
    const candidates: { unit: Unit; ci: number; ti: number }[] = [];
    topics.forEach((t, j) => { if (j > ti && usable(t)) candidates.push({ unit: units[ci], ci, ti: j }); });
    for (let cj = ci + 1; cj < units.length && candidates.length === 0; cj++) {
      if (units[cj].pending) continue;
      const tj = ((units[cj].topics ?? []) as any[]).findIndex(usable);
      if (tj >= 0) candidates.push({ unit: units[cj], ci: cj, ti: tj });
    }
    const next = candidates[0];
    if (!next) return null;
    const t = (next.unit.topics as any[])[next.ti];
    return {
      name: t.name,
      chapterTitle: next.unit.title,
      params: syllabusLessonParams({
        ...ctx, chapterTitle: next.unit.title, chapterIndex: next.ci, topicIndex: next.ti, topic: t, isDbBacked: syl.isDbBacked,
      }),
    };
  }
  return null;
}

export function useNextTopic(subject: string, curriculum: string, grade: string, topic: string) {
  const [next, setNext] = useState<NextTopic | null>(null);
  const [loading, setLoading] = useState(() => !!(subject && topic));

  useEffect(() => {
    if (!subject || !topic) return;
    let cancelled = false;
    fetchSubjectSyllabus(curriculum, grade, subject)
      .then(syl => { if (!cancelled) setNext(findNextTopic(syl, topic, { subject, curriculum, grade })); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [subject, curriculum, grade, topic]);

  return { next, loading };
}
