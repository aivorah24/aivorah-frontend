// Dashboard performance-stat calculations — moved out of DashboardScreen.tsx
// so they can be unit-tested directly. Same logic, same rounding, no
// behavior change.

import { getSubjectSyllabus } from '../../../data/syllabusRegistry';
import { isTopicMastered, isPassingScore } from './masteryRules';

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

// % of attempted quizzes scoring >= PASS_THRESHOLD.
export function computeConsistency(realTopicPerf: RealTopicPerf[]): number {
  if (!realTopicPerf.length) return 0;
  return Math.round((realTopicPerf.filter(t => isPassingScore(t.pct)).length / realTopicPerf.length) * 100);
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
  // B002 fix: true when at least one topic in this chapter has been opened
  // (Learn/Listen) via startTopicActivity but the chapter isn't mastered yet
  // — distinguishes "touched, no score" from "never opened". Never true for
  // a mastered chapter (mastered takes precedence in the UI).
  inProgress: boolean;
}

// One bar per real textbook chapter/unit. Where a curated syllabus exists for
// this subject/grade, chapters get real attributed scores from perfData;
// chapters with no curated mapping yet show 0%/no-data — honest, not fabricated.
// `startedTopics` (B002) is frontend-local only (StudentDataContext,
// AsyncStorage-backed) — not synced server-side, so this signal does not
// carry across devices/sessions beyond existing local persistence.
export function computeAllBarTopics(
  subjectChapters: SubjectChapters[],
  isIBPYP: boolean,
  studentGrade: string,
  perfData: PerfData,
  completedSet: Set<string>,
  startedTopics: Set<string> = new Set()
): BarTopic[] {
  const curriculumLabel = isIBPYP ? 'IB PYP' : 'CBSE';
  return subjectChapters.flatMap(({ subject, chapters }) => {
    const curated = getSubjectSyllabus(curriculumLabel, studentGrade, subject);
    return chapters.map(unit => {
      const curatedChapter = curated.find(ch => ch.title === unit);
      if (!curatedChapter) return { label: unit, fullLabel: unit, subject, pct: 0, hasData: false, mastered: false, inProgress: false };
      const scored = curatedChapter.topics.map(t => perfData.topics[t.name]?.avgScore ?? 0).filter(n => n > 0);
      const hasData = scored.length > 0 || curatedChapter.topics.some(t => (perfData.topics[t.name]?.sessions ?? 0) > 0);
      const pct = scored.length ? Math.round(scored.reduce((s, n) => s + n, 0) / scored.length) : 0;
      const mastered = curatedChapter.topics.every(t => isTopicMastered(t.name, completedSet, perfData.topics[t.name]?.avgScore));
      const inProgress = !mastered && curatedChapter.topics.some(t => startedTopics.has(t.name) || completedSet.has(t.name));
      return { label: unit, fullLabel: unit, subject, pct, hasData, mastered, inProgress };
    });
  });
}

export interface LessonCandidate {
  topic: string;
  subject: string;
  progress: number;
  [key: string]: unknown;
}

// Continue Learning's chapter pick. B003 fix: a real quiz attempt
// (perfData[...].lastActivity) still wins when present — that's a stronger,
// more specific signal than merely opening a topic. But when NO candidate
// has quiz activity, the old code fell through to `candidates[0]` — the
// first chapter in the list, regardless of what the student actually did —
// which is the exact B003 symptom (opening/exploring a topic never changed
// Continue Learning). Now, in that case, a topic the student has opened via
// Learn/Listen (`startedTopics`, frontend-local only — see note on
// computeAllBarTopics) is preferred over the blind first-in-list fallback.
// A topic that's already fully completed is deliberately NOT preferred here
// over a still-in-progress started topic — "continue" should point at
// unfinished work, not something already done.
export function selectFeaturedLesson<T extends LessonCandidate>(
  candidates: T[],
  perfData: PerfData,
  startedTopics: Set<string> = new Set(),
  completedTopics: Set<string> = new Set()
): T | undefined {
  const withActivity = candidates
    .filter(l => (perfData.topics[l.topic] as { lastActivity?: string } | undefined)?.lastActivity)
    .sort((a, b) => {
      const ta = (perfData.topics[a.topic] as { lastActivity?: string } | undefined)?.lastActivity ?? '';
      const tb = (perfData.topics[b.topic] as { lastActivity?: string } | undefined)?.lastActivity ?? '';
      return tb.localeCompare(ta); // most recent first
    });
  if (withActivity[0]) return withActivity[0];

  const startedNotCompleted = candidates.find(l => startedTopics.has(l.topic) && !completedTopics.has(l.topic));
  if (startedNotCompleted) return startedNotCompleted;

  return candidates.find(l => l.progress > 0) ?? candidates[0];
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

// Mastered chapters — the aggregate headline count. B004 fix: this used to
// be a separate proportional estimate ((completed topics / total topics in
// subject) x chapter count) that disagreed with the per-chapter `mastered`
// flag below it on the same screen (computeAllBarTopics), since the two used
// different rules. Now both read the SAME authoritative predicate
// (isTopicMastered, every topic in the chapter required) via
// computeAllBarTopics itself, so the headline count and the bars it
// summarizes can never diverge again.
export function computeMasteredTopics(
  subjectChapters: SubjectChapters[],
  isIBPYP: boolean,
  studentGrade: string,
  perfData: PerfData,
  completedSet: Set<string>
): number {
  return computeAllBarTopics(subjectChapters, isIBPYP, studentGrade, perfData, completedSet)
    .filter(b => b.mastered).length;
}
