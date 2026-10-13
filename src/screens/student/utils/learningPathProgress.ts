// Dashboard ↔ Learning Paths progress join.
//
// Root cause of the "dashboard doesn't show real Learning Path progress"
// bug: the dashboard mapped progress onto chapters through the static
// curated syllabus (syllabusRegistry.ts — CBSE Grade 6 only) and onto topics
// through the monolith's flat /curriculum topic list. A student on any
// other grade, or studying a DB-backed chapter, had progress saved under the
// real Learning Path topic names (quiz `topic`, completeLesson, startTopicActivity
// all use the syllabus topic's `name`) that matched NOTHING on the dashboard,
// so every chapter read "Not started", 0 mastered, "No quizzes yet", and
// Continue Learning fell back to the first subject alphabetically.
//
// Everything here works on the SAME chapter/topic structure the Learning
// Paths section renders (SubjectSyllabusScreen: /teacher/syllabus/current,
// curated fallback) and the same completion rule (completedTopics by name).

export interface LpTopic {
  id?: string;
  name: string;
  kind?: string;
}

export interface LpChapter {
  subject: string;
  title: string;
  chapterNo: number;
  // Index of this chapter inside its subject's syllabus list — what
  // LessonScreen's chapterIndex param refers to.
  chapterIndex: number;
  topics: LpTopic[];
  pending?: boolean;
  // Whether the syllabus came from the learning-paths service (DB/Qdrant)
  // rather than the static curated dataset — decides how a lesson is opened.
  isDbBacked: boolean;
}

export interface PerfTopic {
  avgScore: number | null;
  quizCount?: number;
  sessions?: number;
  lastActivity?: string;
  subject?: string;
}

export interface Perf {
  topics: Record<string, PerfTopic>;
  avgScore: number | null;
}

export type ChapterStatus = 'not_started' | 'in_progress' | 'completed';

export interface ChapterProgress extends LpChapter {
  doneCount: number;
  totalTopics: number;
  status: ChapterStatus;
  // Average quiz score across the chapter's quizzed topics (0 when none).
  pct: number;
  hasData: boolean;
  mastered: boolean;
  inProgress: boolean;
}

// Local, device-side learning activity (StudentDataContext.learningActivity):
// when a topic was last opened and quiz results not yet guaranteed to be
// visible in GET /performance (the quiz's track-result POST is
// fire-and-forget, so returning to the dashboard can beat it to the DB).
export interface LocalQuizResult { score: number; at: string }
export interface LocalTopicActivity {
  subject?: string;
  lastOpenedAt?: string;
  quizzes?: LocalQuizResult[];
}
export type LearningActivity = Record<string, LocalTopicActivity>;

// ── Chapter structure ────────────────────────────────────

export interface SubjectSyllabusData {
  subject: string;
  units: { title: string; unitNo?: number; topics?: LpTopic[]; pending?: boolean }[];
  isDbBacked: boolean;
}

// One row per chapter, in Learning Paths order. A subject whose syllabus
// hasn't loaded (or failed) still contributes its chapter titles from the
// /curriculum/subjects list, just with no topics — so the chapter total
// stays right while topic-level progress fills in.
export function buildLpChapters(
  subjectChapters: { subject: string; chapters: string[] }[],
  syllabi: Record<string, SubjectSyllabusData | undefined>
): LpChapter[] {
  return subjectChapters.flatMap(({ subject, chapters }): LpChapter[] => {
    const syl = syllabi[subject];
    if (syl && syl.units.length > 0) {
      return syl.units.map((u, i) => ({
        subject,
        title: u.title,
        chapterNo: u.unitNo ?? i + 1,
        chapterIndex: i,
        topics: (u.topics ?? []).filter(t => t && t.name),
        pending: u.pending,
        isDbBacked: syl.isDbBacked,
      }));
    }
    return chapters.map((title, i) => ({
      subject, title, chapterNo: i + 1, chapterIndex: i, topics: [], isDbBacked: false,
    }));
  });
}

// ── Per-chapter status (Learning Path card, bars, mastered count) ──

// A topic is done exactly when the Learning Paths screen says so: it is in
// completedTopics (Learn/Listen finished + Practice passed at 60%+, recorded
// by completeLesson). A high quiz average on its own does NOT complete a
// topic — counting it did (isTopicMastered's ">= 80%" path) made the
// dashboard report a chapter as done that Learning Paths shows as 0%.
export function isTopicDone(name: string, completedSet: Set<string>): boolean {
  return completedSet.has(name);
}

function sameSubject(a: string | undefined, b: string): boolean {
  return !a || a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Quiz performance and device activity are keyed by bare topic name across
// every subject, so a generic name ("Introduction", "Let us reflect") in one
// subject must not light up a same-named topic in another. Only use an
// entry when its recorded subject is this chapter's subject (or unknown).
export function perfForTopic(perf: Perf, name: string, subject: string): PerfTopic | undefined {
  const p = perf.topics[name];
  return p && sameSubject(p.subject, subject) ? p : undefined;
}

function activityForTopic(activity: LearningActivity, name: string, subject: string): LocalTopicActivity | undefined {
  const a = activity[name];
  return a && sameSubject(a.subject, subject) ? a : undefined;
}

function isTopicTouched(name: string, subject: string, completedSet: Set<string>, startedSet: Set<string>, perf: Perf, activity: LearningActivity): boolean {
  const p = perfForTopic(perf, name, subject);
  const a = activityForTopic(activity, name, subject);
  return completedSet.has(name)
    || startedSet.has(name)
    || !!a?.lastOpenedAt
    || (a?.quizzes?.length ?? 0) > 0
    || (p?.quizCount ?? 0) > 0
    || (p?.sessions ?? 0) > 0;
}

// Same rule as the Learning Paths ChapterCard: a chapter is Completed when
// every one of its topics is done; In progress once any topic is touched.
// A chapter with no topics yet (pending / not loaded) can never be
// "completed" — `every` over an empty list would otherwise say true.
export function computeChapterProgress(
  chapters: LpChapter[],
  perf: Perf,
  completedSet: Set<string>,
  startedSet: Set<string> = new Set(),
  activity: LearningActivity = {}
): ChapterProgress[] {
  return chapters.map(ch => {
    const names = ch.topics.map(t => t.name);
    const doneCount = names.filter(n => isTopicDone(n, completedSet)).length;
    const scored = names
      .map(n => perfForTopic(perf, n, ch.subject))
      .filter((p): p is PerfTopic => !!p && p.avgScore != null && (p.quizCount ?? 1) > 0)
      .map(p => p.avgScore as number);
    const hasData = scored.length > 0;
    const pct = hasData ? Math.round(scored.reduce((s, n) => s + n, 0) / scored.length) : 0;
    const completed = names.length > 0 && doneCount === names.length;
    const touched = names.some(n => isTopicTouched(n, ch.subject, completedSet, startedSet, perf, activity));
    const status: ChapterStatus = completed ? 'completed' : touched ? 'in_progress' : 'not_started';
    return {
      ...ch,
      doneCount,
      totalTopics: names.length,
      status,
      pct,
      hasData,
      mastered: completed,
      inProgress: status === 'in_progress',
    };
  });
}

export function countCompletedChapters(progress: ChapterProgress[]): number {
  return progress.filter(c => c.status === 'completed').length;
}

// ── Quiz performance ─────────────────────────────────────

// GET /performance is read right after the quiz's fire-and-forget
// track-result write, so it can miss the attempt the student just finished.
// Fold in local quiz results newer than the server's last activity for that
// topic (anything older is already counted server-side).
export function mergeLocalQuizResults(perf: Perf, activity: LearningActivity): Perf {
  const topics: Record<string, PerfTopic> = { ...perf.topics };
  let changed = false;
  for (const [name, a] of Object.entries(activity)) {
    const server = topics[name];
    const since = server?.lastActivity ?? '';
    const fresh = (a.quizzes ?? []).filter(q => q.at > since);
    if (!fresh.length) continue;
    changed = true;
    const prevCount = server?.avgScore != null ? (server.quizCount ?? 1) : 0;
    const prevSum = prevCount ? (server!.avgScore as number) * prevCount : 0;
    const count = prevCount + fresh.length;
    const avg = Math.round((prevSum + fresh.reduce((s, q) => s + q.score, 0)) / count);
    const latest = fresh.reduce((m, q) => (q.at > m ? q.at : m), since);
    topics[name] = {
      ...server,
      subject: server?.subject ?? a.subject,
      avgScore: avg,
      quizCount: count,
      sessions: server?.sessions ?? 0,
      lastActivity: latest,
    };
  }
  if (!changed) return perf;
  return { topics, avgScore: overallAverage(topics) };
}

function overallAverage(topics: Record<string, PerfTopic>): number | null {
  let sum = 0, n = 0;
  for (const t of Object.values(topics)) {
    if (t.avgScore == null) continue;
    const c = t.quizCount ?? 1;
    if (c <= 0) continue;
    sum += t.avgScore * c;
    n += c;
  }
  return n ? Math.round(sum / n) : null;
}

export interface QuizTopicPerf {
  label: string;
  fullLabel: string;
  subject: string;
  pct: number;
}

// Every topic with at least one real quiz result — keyed by the same topic
// name the quiz saved it under, so it no longer depends on that name also
// appearing in an unrelated curriculum list. A genuine 0% is a real score.
export function computeQuizTopicPerf(perf: Perf, subjectOf: (topic: string) => string | undefined = () => undefined): QuizTopicPerf[] {
  return Object.entries(perf.topics)
    .filter(([, p]) => p.avgScore != null && (p.quizCount ?? 1) > 0)
    .map(([name, p]) => ({
      label: name,
      fullLabel: name,
      subject: subjectOf(name) ?? p.subject ?? '',
      pct: p.avgScore as number,
    }));
}

// ── Weekly consistency ───────────────────────────────────

export interface WeeklyDay {
  date: string;
  studyMinutes?: number;
  xp?: number;
  topicsCompleted?: number;
}

// Days with real learning activity this week (GET /student/:id/weekly,
// student_daily_log) out of 7. Replaces the old currentStreak-based value,
// which only moves when GET /student/:id is hit on a NEW day — it stayed 0
// all day for a student who'd been studying since the morning. Today also
// counts from local stats, since the daily log can lag the session.
export function computeWeeklyActiveDays(days: WeeklyDay[], today: string, activeTodayLocally: boolean): number {
  const active = new Set(
    days
      .filter(d => (d.studyMinutes ?? 0) > 0 || (d.xp ?? 0) > 0 || (d.topicsCompleted ?? 0) > 0)
      .map(d => d.date)
  );
  if (activeTodayLocally) active.add(today);
  return Math.min(active.size, 7);
}

export function weeklyConsistencyPct(activeDays: number): number {
  return Math.round((Math.min(activeDays, 7) / 7) * 100);
}

// ── Continue Learning ────────────────────────────────────

export interface LessonRef {
  subject: string;
  chapter: LpChapter;
  topic: LpTopic;
  topicIndex: number;
}

export interface ContinueLearning {
  // The topic the student last worked on (or the first one to start).
  current: LessonRef;
  status: 'not_started' | 'in_progress' | 'completed';
  // Only when `current` is completed: the next unfinished topic in reading
  // order in the same subject (rolls into the next chapter once this one is
  // done). null when the whole subject is finished.
  next: LessonRef | null;
}

function lastTouchedAt(name: string, subject: string, perf: Perf, activity: LearningActivity): string {
  const a = activityForTopic(activity, name, subject);
  const times = [
    perfForTopic(perf, name, subject)?.lastActivity ?? '',
    a?.lastOpenedAt ?? '',
    ...(a?.quizzes ?? []).map(q => q.at),
  ];
  return times.reduce((m, t) => (t > m ? t : m), '');
}

export function selectContinueLearning(
  chapters: LpChapter[],
  perf: Perf,
  completedSet: Set<string>,
  startedSet: Set<string> = new Set(),
  activity: LearningActivity = {},
  lastLesson = ''
): ContinueLearning | null {
  const ordered: LessonRef[] = chapters.flatMap(ch =>
    ch.topics.map((topic, topicIndex) => ({ subject: ch.subject, chapter: ch, topic, topicIndex }))
  );
  if (!ordered.length) return null;

  const done = (r: LessonRef) => isTopicDone(r.topic.name, completedSet);

  // Most recently touched topic wins (opened, quizzed, or completed).
  let current: LessonRef | undefined;
  let best = '';
  for (const r of ordered) {
    const t = lastTouchedAt(r.topic.name, r.subject, perf, activity);
    if (t && t > best) { best = t; current = r; }
  }
  // No timestamps on this device (e.g. fresh login): fall back to the
  // server's last completed lesson, then any started-but-unfinished topic.
  if (!current && lastLesson) current = ordered.find(r => r.topic.name === lastLesson);
  if (!current) current = ordered.find(r => startedSet.has(r.topic.name) && !done(r));

  if (!current) {
    const first = ordered.find(r => !done(r)) ?? ordered[0];
    return { current: first, status: done(first) ? 'completed' : 'not_started', next: null };
  }

  if (!done(current)) return { current, status: 'in_progress', next: null };

  const at = ordered.indexOf(current);
  const next = ordered.slice(at + 1).find(r => r.subject === current!.subject && !done(r))
    ?? ordered.slice(0, at).find(r => r.subject === current!.subject && !done(r))
    ?? null;
  return { current, status: 'completed', next };
}

// Topic → chapter title / subject lookup for the best-score pill.
export function indexTopics(chapters: LpChapter[]): Map<string, LpChapter> {
  const m = new Map<string, LpChapter>();
  for (const ch of chapters) for (const t of ch.topics) if (!m.has(t.name)) m.set(t.name, ch);
  return m;
}
