import {
  buildLpChapters, computeChapterProgress, countCompletedChapters, computeQuizTopicPerf,
  mergeLocalQuizResults, computeWeeklyActiveDays, weeklyConsistencyPct, selectContinueLearning,
  indexTopics, type SubjectSyllabusData, type Perf,
} from '../learningPathProgress';
import { computeConsistency, computeBestTopic } from '../performanceStats';

// A Grade 9-style CBSE student with no curated (syllabusRegistry) data —
// the case the old dashboard got completely wrong. Chapter/topic names come
// from the Learning Paths syllabus endpoint, exactly as the student sees them.
const subjectChapters = [
  { subject: 'Arts', chapters: ['Colours Around Us', 'Clay Modelling'] },
  { subject: 'English', chapters: ['Bit and Wisdom', 'The Kite', 'A Tiger in the Zoo'] },
];
const syllabi: Record<string, SubjectSyllabusData> = {
  Arts: {
    subject: 'Arts', isDbBacked: true,
    units: [
      { unitNo: 1, title: 'Colours Around Us', topics: [{ id: 'a1', name: 'Primary Colours', kind: 'section' }] },
      { unitNo: 2, title: 'Clay Modelling', topics: [{ id: 'a2', name: 'Shaping Clay', kind: 'section' }] },
    ],
  },
  English: {
    subject: 'English', isDbBacked: true,
    units: [
      { unitNo: 1, title: 'Bit and Wisdom', topics: [{ id: 'e1', name: 'Bit and Wisdom: Reading' }, { id: 'e2', name: 'Bit and Wisdom: Poem' }] },
      { unitNo: 2, title: 'The Kite', topics: [{ id: 'e3', name: 'The Kite' }] },
      { unitNo: 3, title: 'A Tiger in the Zoo', topics: [{ id: 'e4', name: 'A Tiger in the Zoo: Part 1' }, { id: 'e5', name: 'A Tiger in the Zoo: Part 2' }] },
    ],
  },
};
const EMPTY_PERF: Perf = { topics: {}, avgScore: null };

describe('buildLpChapters', () => {
  test('uses the Learning Paths syllabus (chapters WITH topics) for each subject', () => {
    const chapters = buildLpChapters(subjectChapters, syllabi);
    expect(chapters.map(c => c.title)).toEqual(['Colours Around Us', 'Clay Modelling', 'Bit and Wisdom', 'The Kite', 'A Tiger in the Zoo']);
    expect(chapters[2].topics.map(t => t.name)).toEqual(['Bit and Wisdom: Reading', 'Bit and Wisdom: Poem']);
    expect(chapters[2]).toMatchObject({ subject: 'English', chapterNo: 1, chapterIndex: 0, isDbBacked: true });
  });

  test('a subject whose syllabus has not loaded still counts its chapters (no topics yet)', () => {
    const chapters = buildLpChapters(subjectChapters, { English: syllabi.English });
    expect(chapters).toHaveLength(5);
    expect(chapters[0]).toMatchObject({ subject: 'Arts', title: 'Colours Around Us', topics: [] });
  });
});

describe('computeChapterProgress — Bugs 4, 6, 7 (chapter count + status)', () => {
  const chapters = buildLpChapters(subjectChapters, syllabi);

  test('chapters whose every topic is completed are Completed; partially done is In progress', () => {
    const completed = new Set(['Bit and Wisdom: Reading', 'Bit and Wisdom: Poem', 'The Kite', 'A Tiger in the Zoo: Part 1']);
    const p = computeChapterProgress(chapters, EMPTY_PERF, completed);
    const byTitle = Object.fromEntries(p.map(c => [c.title, c.status]));
    expect(byTitle).toEqual({
      'Colours Around Us': 'not_started', 'Clay Modelling': 'not_started',
      'Bit and Wisdom': 'completed', 'The Kite': 'completed', 'A Tiger in the Zoo': 'in_progress',
    });
    expect(countCompletedChapters(p)).toBe(2);
  });

  test('2 finished chapters out of 117 counts exactly 2 (the reported "2/117")', () => {
    const many = [
      ...chapters,
      ...Array.from({ length: 112 }, (_, i) => ({ subject: 'Science', title: `Ch ${i}`, chapterNo: i + 1, chapterIndex: i, topics: [{ name: `S${i}` }], isDbBacked: true })),
    ];
    const p = computeChapterProgress(many, EMPTY_PERF, new Set(['Bit and Wisdom: Reading', 'Bit and Wisdom: Poem', 'The Kite']));
    expect(p).toHaveLength(117);
    expect(countCompletedChapters(p)).toBe(2);
  });

  test('opening a topic (started / opened on this device) marks its chapter In progress', () => {
    const viaStarted = computeChapterProgress(chapters, EMPTY_PERF, new Set(), new Set(['The Kite']));
    expect(viaStarted.find(c => c.title === 'The Kite')!.status).toBe('in_progress');
    const viaActivity = computeChapterProgress(chapters, EMPTY_PERF, new Set(), new Set(), { 'Primary Colours': { lastOpenedAt: '2026-10-13T09:00:00Z' } });
    expect(viaActivity.find(c => c.title === 'Colours Around Us')!.status).toBe('in_progress');
  });

  test('a failed quiz (attempted, not passed) is In progress, not Completed, with its score on the bar', () => {
    const perf: Perf = { topics: { 'The Kite': { avgScore: 40, quizCount: 1 } }, avgScore: 40 };
    const kite = computeChapterProgress(chapters, perf, new Set()).find(c => c.title === 'The Kite')!;
    expect(kite).toMatchObject({ status: 'in_progress', hasData: true, pct: 40, mastered: false });
  });

  test('a chapter with no topics yet is never Completed (empty `every`)', () => {
    const p = computeChapterProgress([{ subject: 'Hindi', title: 'Pending', chapterNo: 1, chapterIndex: 0, topics: [], isDbBacked: true }], EMPTY_PERF, new Set());
    expect(p[0].status).toBe('not_started');
    expect(countCompletedChapters(p)).toBe(0);
  });
});

describe('quiz performance — Bugs 1, 2, 3 (score, mastery, consistency)', () => {
  test('a quiz on a Learning Path topic shows up even though it is in no flat curriculum list', () => {
    const perf: Perf = { topics: { 'The Kite': { avgScore: 90, quizCount: 1, subject: 'English' } }, avgScore: 90 };
    const real = computeQuizTopicPerf(perf);
    expect(real).toEqual([{ label: 'The Kite', fullLabel: 'The Kite', subject: 'English', pct: 90 }]);
    expect(computeBestTopic(real)!.pct).toBe(90);
    expect(computeConsistency(real)).toBe(100);
  });

  test('a genuine 0% quiz counts as a quiz (consistency 0%, not "no quizzes")', () => {
    const real = computeQuizTopicPerf({ topics: { 'The Kite': { avgScore: 0, quizCount: 1 } }, avgScore: 0 });
    expect(real).toHaveLength(1);
    expect(computeConsistency(real)).toBe(0);
  });

  test('topics with only lesson sessions (no quiz) are not quiz results', () => {
    expect(computeQuizTopicPerf({ topics: { X: { avgScore: null, quizCount: 0, sessions: 3 } }, avgScore: null })).toEqual([]);
  });

  test('subject comes from the syllabus index when available', () => {
    const idx = indexTopics(buildLpChapters(subjectChapters, syllabi));
    const real = computeQuizTopicPerf({ topics: { 'The Kite': { avgScore: 70, quizCount: 1 } }, avgScore: 70 }, n => idx.get(n)?.subject);
    expect(real[0].subject).toBe('English');
    expect(idx.get('The Kite')!.title).toBe('The Kite');
  });
});

describe('mergeLocalQuizResults — dashboard updates without waiting on the server', () => {
  test('a result the server has not served yet is added', () => {
    const merged = mergeLocalQuizResults(EMPTY_PERF, { 'The Kite': { subject: 'English', quizzes: [{ score: 80, at: '2026-10-13T10:00:00.000Z' }] } });
    expect(merged.topics['The Kite']).toMatchObject({ avgScore: 80, quizCount: 1, subject: 'English' });
    expect(merged.avgScore).toBe(80);
  });

  test('a result the server already has (older than its lastActivity) is not double-counted', () => {
    const perf: Perf = { topics: { 'The Kite': { avgScore: 80, quizCount: 1, lastActivity: '2026-10-13T10:00:01.000Z' } }, avgScore: 80 };
    const merged = mergeLocalQuizResults(perf, { 'The Kite': { quizzes: [{ score: 80, at: '2026-10-13T10:00:00.000Z' }] } });
    expect(merged).toBe(perf);
  });

  test('a newer attempt is averaged with the server history', () => {
    const perf: Perf = { topics: { 'The Kite': { avgScore: 40, quizCount: 1, lastActivity: '2026-10-12T10:00:00.000Z' } }, avgScore: 40 };
    const merged = mergeLocalQuizResults(perf, { 'The Kite': { quizzes: [{ score: 100, at: '2026-10-13T10:00:00.000Z' }] } });
    expect(merged.topics['The Kite']).toMatchObject({ avgScore: 70, quizCount: 2 });
  });
});

describe('weekly consistency — Bug 3', () => {
  const days = [
    { date: '2026-10-12', studyMinutes: 20, xp: 0, topicsCompleted: 0 },
    { date: '2026-10-13', studyMinutes: 0, xp: 0, topicsCompleted: 0 },
    { date: '2026-10-14', studyMinutes: 0, xp: 0, topicsCompleted: 0 },
  ];

  test('counts days with real activity this week', () => {
    expect(computeWeeklyActiveDays(days, '2026-10-13', false)).toBe(1);
  });

  test('today counts as soon as the student has studied locally, even before the daily log catches up', () => {
    expect(computeWeeklyActiveDays(days, '2026-10-13', true)).toBe(2);
    expect(weeklyConsistencyPct(2)).toBe(29);
  });

  test('a first-day student who studied today is not 0% (old currentStreak-based value was)', () => {
    expect(weeklyConsistencyPct(computeWeeklyActiveDays([], '2026-10-13', true))).toBe(14);
  });
});

describe('selectContinueLearning — Bug 5', () => {
  const chapters = buildLpChapters(subjectChapters, syllabi);

  test('shows the English topic the student studied, not the alphabetically-first subject (Arts)', () => {
    const r = selectContinueLearning(chapters, EMPTY_PERF, new Set(), new Set(), { 'A Tiger in the Zoo: Part 1': { lastOpenedAt: '2026-10-13T09:00:00Z' } })!;
    expect(r.current.subject).toBe('English');
    expect(r.current.topic.name).toBe('A Tiger in the Zoo: Part 1');
    expect(r.status).toBe('in_progress');
    expect(r.next).toBeNull();
  });

  test('left partway: the same topic is offered to resume', () => {
    const perf: Perf = { topics: { 'The Kite': { avgScore: 40, quizCount: 1, lastActivity: '2026-10-13T08:00:00Z' } }, avgScore: 40 };
    const r = selectContinueLearning(chapters, perf, new Set())!;
    expect(r.current.topic.name).toBe('The Kite');
    expect(r.status).toBe('in_progress');
  });

  test('finished: marked Completed and the next chapter is suggested', () => {
    const completed = new Set(['Bit and Wisdom: Reading', 'Bit and Wisdom: Poem', 'The Kite']);
    const activity = { 'The Kite': { quizzes: [{ score: 90, at: '2026-10-13T10:00:00Z' }] } };
    const r = selectContinueLearning(chapters, EMPTY_PERF, completed, new Set(), activity)!;
    expect(r.current.topic.name).toBe('The Kite');
    expect(r.status).toBe('completed');
    expect(r.next!.chapter.title).toBe('A Tiger in the Zoo');
    expect(r.next!.topic.name).toBe('A Tiger in the Zoo: Part 1');
  });

  test('finished a topic mid-chapter: next is the rest of that chapter', () => {
    const activity = { 'Bit and Wisdom: Reading': { quizzes: [{ score: 90, at: '2026-10-13T10:00:00Z' }] } };
    const r = selectContinueLearning(chapters, EMPTY_PERF, new Set(['Bit and Wisdom: Reading']), new Set(), activity)!;
    expect(r.status).toBe('completed');
    expect(r.next!.topic.name).toBe('Bit and Wisdom: Poem');
  });

  test('the most recent activity wins across server and device signals', () => {
    const perf: Perf = { topics: { 'Primary Colours': { avgScore: 70, quizCount: 1, lastActivity: '2026-10-10T08:00:00Z' } }, avgScore: 70 };
    const r = selectContinueLearning(chapters, perf, new Set(), new Set(), { 'The Kite': { lastOpenedAt: '2026-10-13T08:00:00Z' } })!;
    expect(r.current.topic.name).toBe('The Kite');
  });

  test('no timestamps on this device: falls back to the server lastLesson', () => {
    const r = selectContinueLearning(chapters, EMPTY_PERF, new Set(['The Kite']), new Set(), {}, 'The Kite')!;
    expect(r.current.topic.name).toBe('The Kite');
    expect(r.status).toBe('completed');
  });

  test('nothing studied yet: first topic, Not started', () => {
    const r = selectContinueLearning(chapters, EMPTY_PERF, new Set())!;
    expect(r.current.topic.name).toBe('Primary Colours');
    expect(r.status).toBe('not_started');
  });

  test('no chapters with topics: nothing to show', () => {
    expect(selectContinueLearning(buildLpChapters(subjectChapters, {}), EMPTY_PERF, new Set())).toBeNull();
  });
});

// Reported on a real Grade 8 student: Learning Paths showed ONLY English
// Chapter 1 "Wit and Wisdom" at 100% (1 of 5 started), but the dashboard
// said 2/117. The dashboard counted extra ways of "done" that Learning Paths
// does not, and matched quiz results by bare topic name across subjects.
describe('completed-chapter count matches Learning Paths exactly (Grade 8 "2/117" report)', () => {
  const g8 = buildLpChapters(
    [
      { subject: 'English', chapters: ['Wit and Wisdom', 'Values and Dispositions'] },
      { subject: 'Arts', chapters: ['Bringing Words Alive — Play Reading'] },
    ],
    {
      English: { subject: 'English', isDbBacked: true, units: [
        { unitNo: 1, title: 'Wit and Wisdom', topics: [{ name: 'The Wit that Won Hearts' }, { name: 'A Concrete Example' }, { name: 'Wisdom Paves the Way' }] },
        { unitNo: 2, title: 'Values and Dispositions', topics: [{ name: "Somebody's Mother" }, { name: 'Introduction' }] },
      ] },
      Arts: { subject: 'Arts', isDbBacked: true, units: [
        { unitNo: 1, title: 'Bringing Words Alive — Play Reading', topics: [{ name: 'Introduction' }] },
      ] },
    }
  );
  const completed = new Set(['The Wit that Won Hearts', 'A Concrete Example', 'Wisdom Paves the Way']);

  test('a quiz average of 80%+ on a topic that is NOT in completedTopics does not complete its chapter', () => {
    // e.g. a quiz scored on a same-named topic that never went through completeLesson
    const perf: Perf = { topics: { Introduction: { avgScore: 100, quizCount: 1 } }, avgScore: 100 };
    const p = computeChapterProgress(g8, perf, completed);
    expect(countCompletedChapters(p)).toBe(1);
    expect(p.find(c => c.subject === 'Arts')!.status).not.toBe('completed');
  });

  test('a quiz recorded under one subject does not touch a same-named topic in another subject', () => {
    const perf: Perf = { topics: { Introduction: { avgScore: 90, quizCount: 1, subject: 'English', lastActivity: '2026-10-13T10:00:00Z' } }, avgScore: 90 };
    const p = computeChapterProgress(g8, perf, completed);
    expect(p.find(c => c.subject === 'Arts')!).toMatchObject({ status: 'not_started', hasData: false });
    expect(p.find(c => c.title === 'Values and Dispositions')!).toMatchObject({ status: 'in_progress', hasData: true });
    expect(countCompletedChapters(p)).toBe(1);
  });

  test('device activity tagged with another subject does not mark this chapter In progress', () => {
    const p = computeChapterProgress(g8, EMPTY_PERF, completed, new Set(), { Introduction: { subject: 'English', lastOpenedAt: '2026-10-13T10:00:00Z' } });
    expect(p.find(c => c.subject === 'Arts')!.status).toBe('not_started');
  });

  test('only Wit and Wisdom completed → exactly 1 completed chapter', () => {
    expect(countCompletedChapters(computeChapterProgress(g8, EMPTY_PERF, completed))).toBe(1);
  });
});
