// Dashboard performance-stat calculations — moved out of DashboardScreen.tsx
// so they can be unit-tested directly. Same logic, same rounding, no
// behavior change.

import { getSubjectSyllabus } from '../../../data/syllabusRegistry';

export interface PerfTopicData {
  avgScore: number | null;
  sessions?: number;
}

export interface PerfData {
  topics: Record<string, PerfTopicData>;
  avgScore: number | null;
}

export interface CurriculumTopic {
  topic: string;
  subject: string;
}

export interface RealTopicPerf {
  label: string;
  fullLabel: string;
  subject: string;
  pct: number;
}

export function computeRealTopicPerf(
  curriculumTopics: CurriculumTopic[] | null | undefined,
  perfData: PerfData
): RealTopicPerf[] {
  if (!curriculumTopics) return [];
  return curriculumTopics
    .map(t => {
      const perf = perfData.topics[t.topic];
      const pct = perf?.avgScore ?? 0;
      return { label: t.topic, fullLabel: t.topic, subject: t.subject, pct };
    })
    .filter(t => t.pct > 0);
}

export function computeAvgScore(realTopicPerf: RealTopicPerf[], perfDataAvgScore: number | null): number {
  if (perfDataAvgScore != null) return perfDataAvgScore;
  return realTopicPerf.length
    ? Math.round(realTopicPerf.reduce((sum, t) => sum + t.pct, 0) / realTopicPerf.length)
    : 0;
}

// % of attempted quizzes scoring >= 60%.
export function computeConsistency(realTopicPerf: RealTopicPerf[]): number {
  if (!realTopicPerf.length) return 0;
  return Math.round((realTopicPerf.filter(t => t.pct >= 60).length / realTopicPerf.length) * 100);
}

// Days active this week, capped at 7.
export function computeWeeklyConsistency(currentStreak: number): number {
  return Math.round((Math.min(currentStreak, 7) / 7) * 100);
}

export function computeBestTopic(realTopicPerf: RealTopicPerf[]): RealTopicPerf | null {
  return realTopicPerf.length ? [...realTopicPerf].sort((a, b) => b.pct - a.pct)[0] : null;
}

export interface SubjectChapters {
  subject: string;
  chapters: string[];
}

export interface BarTopic {
  label: string;
  fullLabel: string;
  subject: string;
  pct: number;
  hasData: boolean;
  mastered: boolean;
}

// One bar per real textbook chapter/unit. Where a curated syllabus exists for
// this subject/grade, chapters get real attributed scores from perfData;
// chapters with no curated mapping yet show 0%/no-data — honest, not fabricated.
export function computeAllBarTopics(
  subjectChapters: SubjectChapters[],
  isIBPYP: boolean,
  studentGrade: string,
  perfData: PerfData,
  completedSet: Set<string>
): BarTopic[] {
  const curriculumLabel = isIBPYP ? 'IB PYP' : 'CBSE';
  return subjectChapters.flatMap(({ subject, chapters }) => {
    const curated = getSubjectSyllabus(curriculumLabel, studentGrade, subject);
    return chapters.map(unit => {
      const curatedChapter = curated.find(ch => ch.title === unit);
      if (!curatedChapter) return { label: unit, fullLabel: unit, subject, pct: 0, hasData: false, mastered: false };
      const scored = curatedChapter.topics.map(t => perfData.topics[t.name]?.avgScore ?? 0).filter(n => n > 0);
      const hasData = scored.length > 0 || curatedChapter.topics.some(t => (perfData.topics[t.name]?.sessions ?? 0) > 0);
      const pct = scored.length ? Math.round(scored.reduce((s, n) => s + n, 0) / scored.length) : 0;
      const mastered = curatedChapter.topics.every(t => completedSet.has(t.name) || (perfData.topics[t.name]?.avgScore ?? 0) >= 80);
      return { label: unit, fullLabel: unit, subject, pct, hasData, mastered };
    });
  });
}

// Subject chips for the Learning Path section — from subjectChapters (the
// same canonical, book-derived list Performance's bar-chart subjects use),
// NOT from raw ingested topics. Those two used to disagree: raw ingestion
// carries inconsistent/duplicate subject tags for the same real subject
// (e.g. "Physical Education" vs "Physical Education and Well Being") and
// subjects with zero real chapters mapped, producing chips that matched
// nothing when tapped. See Bug #7/#12, BUGS_AND_FIXES.md.
export function computeLessonSubjects(subjectChapters: SubjectChapters[], recentSubject: string | undefined): string[] {
  const subjects = Array.from(new Set(subjectChapters.map(sc => sc.subject))).sort();
  return recentSubject && subjects.includes(recentSubject)
    ? [recentSubject, ...subjects.filter(s => s !== recentSubject)]
    : subjects;
}

// Mastered chapters — estimated per subject as (completed topics / total topics
// in that subject) x that subject's real chapter count, since individual
// topics aren't tagged with which chapter they belong to yet. A genuine
// progress-based estimate, not tied to any specific named chapter.
export function computeMasteredTopics(
  subjectChapters: SubjectChapters[],
  curriculum: { topics: CurriculumTopic[] } | null | undefined,
  completedSet: Set<string>
): number {
  if (!curriculum) return 0;
  let total = 0;
  subjectChapters.forEach(({ subject, chapters }) => {
    if (!chapters.length) return;
    const subjectTopics = curriculum.topics.filter(t => t.subject === subject);
    if (!subjectTopics.length) return;
    const completedInSubject = subjectTopics.filter(t => completedSet.has(t.topic)).length;
    total += Math.floor((completedInSubject / subjectTopics.length) * chapters.length);
  });
  return total;
}
