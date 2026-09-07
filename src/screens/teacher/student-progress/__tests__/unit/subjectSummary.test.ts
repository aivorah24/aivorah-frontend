import { computeSubjectSummary } from '../../utils/subjectSummary';
import type { HeatmapStudent, HeatmapTopic } from '../../types';

function student(overrides: Partial<HeatmapStudent> = {}): HeatmapStudent {
  return {
    id: 's1', name: 'A', grade: 'Grade 4', curriculum: 'CBSE', section: null, class: null, photoUrl: null,
    scopedSubjects: ['Mathematics'], topicStatus: {},
    ...overrides,
  };
}

function status(overrides: Partial<HeatmapStudent['topicStatus'][string]> = {}) {
  return { status: 'mastered' as const, attempts: 1, latestScore: 90, bestScore: 90, struggled: false, lastAttemptDate: null, subject: 'Mathematics', ...overrides };
}

describe('computeSubjectSummary', () => {
  test('one subject, one mastered student -> 100% class average mastery, 1 student', () => {
    const topics: HeatmapTopic[] = [{ topic: 'Fractions', subject: 'Mathematics' }];
    const students = [student({ topicStatus: { Fractions: status({ status: 'mastered' }) } })];
    expect(computeSubjectSummary(students, topics)).toEqual([
      { subject: 'Mathematics', avgMasteryPct: 100, studentCount: 1 },
    ]);
  });

  test('mixed mastery across 2 students -> real percentage, not rounded to 0/100 arbitrarily', () => {
    const topics: HeatmapTopic[] = [{ topic: 'Fractions', subject: 'Mathematics' }];
    const students = [
      student({ id: 's1', topicStatus: { Fractions: status({ status: 'mastered' }) } }),
      student({ id: 's2', topicStatus: { Fractions: status({ status: 'stuck' }) } }),
    ];
    expect(computeSubjectSummary(students, topics)).toEqual([
      { subject: 'Mathematics', avgMasteryPct: 50, studentCount: 2 },
    ]);
  });

  test('a student not scoped to the subject is excluded even if they have a matching topic name', () => {
    const topics: HeatmapTopic[] = [{ topic: 'Fractions', subject: 'Mathematics' }];
    const students = [student({ scopedSubjects: ['English'], topicStatus: { Fractions: status() } })];
    expect(computeSubjectSummary(students, topics)).toEqual([
      { subject: 'Mathematics', avgMasteryPct: null, studentCount: 0 },
    ]);
  });

  test('multiple subjects each get their own real card', () => {
    const topics: HeatmapTopic[] = [
      { topic: 'Fractions', subject: 'Mathematics' },
      { topic: 'Grammar', subject: 'English' },
    ];
    const students = [
      student({ scopedSubjects: ['Mathematics', 'English'], topicStatus: {
        Fractions: status({ status: 'mastered', subject: 'Mathematics' }),
        Grammar: status({ status: 'trying', subject: 'English' }),
      } }),
    ];
    const result = computeSubjectSummary(students, topics);
    expect(result).toEqual(expect.arrayContaining([
      { subject: 'Mathematics', avgMasteryPct: 100, studentCount: 1 },
      { subject: 'English', avgMasteryPct: 0, studentCount: 1 },
    ]));
  });

  test('no topics at all -> no cards, not a crash', () => {
    expect(computeSubjectSummary([], [])).toEqual([]);
  });

  // A teacher configured (Staff Subject Mapping) for a subject with zero
  // real topic data yet — e.g. English, when only Mathematics students are
  // linked so far — must still get a card, showing the real empty state.
  test('extraSubjects gives a subject with no real data its own honest empty-state card', () => {
    const topics: HeatmapTopic[] = [{ topic: 'Fractions', subject: 'Mathematics' }];
    const students = [student({ topicStatus: { Fractions: status({ status: 'mastered' }) } })];

    const result = computeSubjectSummary(students, topics, ['English']);

    expect(result).toEqual(expect.arrayContaining([
      { subject: 'Mathematics', avgMasteryPct: 100, studentCount: 1 },
      { subject: 'English', avgMasteryPct: null, studentCount: 0 },
    ]));
  });

  test('an extraSubject that already has real topic data is not duplicated into a second card', () => {
    const topics: HeatmapTopic[] = [{ topic: 'Fractions', subject: 'Mathematics' }];
    const students = [student({ topicStatus: { Fractions: status({ status: 'mastered' }) } })];

    const result = computeSubjectSummary(students, topics, ['Mathematics']);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ subject: 'Mathematics', avgMasteryPct: 100, studentCount: 1 });
  });
});
