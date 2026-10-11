import { selectFeaturedLesson } from '../performanceStats';

// B003 fix: a real quiz attempt (perfData lastActivity) still wins when
// present. When nothing has quiz activity, a topic the student has actually
// opened via Learn/Listen (startedTopics) is now preferred over blindly
// falling back to the first candidate in the list — that blind fallback was
// the exact B003 symptom (opening "Light" never changed Continue Learning
// away from "Materials Around Us").
describe('selectFeaturedLesson', () => {
  const perfData = {
    topics: {
      'Fractions': { avgScore: 70, lastActivity: '2026-10-01' },
      'Decimals': { avgScore: 50, lastActivity: '2026-10-05' },
      'Algebra': { avgScore: null },
    },
    avgScore: null,
  };

  test('picks the candidate with the most recent lastActivity (quiz activity still wins)', () => {
    const candidates = [
      { topic: 'Fractions', subject: 'Math', progress: 70 },
      { topic: 'Decimals', subject: 'Math', progress: 50 },
      { topic: 'Algebra', subject: 'Math', progress: 0 },
    ];
    expect(selectFeaturedLesson(candidates, perfData)?.topic).toBe('Decimals');
  });

  test('B003 fix: a started-but-unquizzed topic is surfaced, not the first in the list', () => {
    const noActivityPerf = { topics: {}, avgScore: null };
    const candidates = [
      { topic: 'Materials Around Us', subject: 'Science', progress: 0 },
      { topic: 'Light', subject: 'Science', progress: 0 },
    ];
    const startedTopics = new Set(['Light']);
    // Student only opened "Light" (no quiz yet -> no lastActivity, no
    // progress). Continue Learning must now point at "Light", not fall back
    // to "Materials Around Us" just because it's first in the list.
    expect(selectFeaturedLesson(candidates, noActivityPerf, startedTopics)?.topic).toBe('Light');
  });

  test('a started topic is not preferred over one with real quiz activity', () => {
    const startedTopics = new Set(['Algebra']);
    const candidates = [
      { topic: 'Fractions', subject: 'Math', progress: 70 },
      { topic: 'Decimals', subject: 'Math', progress: 50 },
      { topic: 'Algebra', subject: 'Math', progress: 0 },
    ];
    expect(selectFeaturedLesson(candidates, perfData, startedTopics)?.topic).toBe('Decimals');
  });

  test('a started topic that is already completed is not preferred ("continue" means unfinished work)', () => {
    const noActivityPerf = { topics: {}, avgScore: null };
    const candidates = [
      { topic: 'Light', subject: 'Science', progress: 0 },
      { topic: 'Sound', subject: 'Science', progress: 0 },
    ];
    const startedTopics = new Set(['Light']);
    const completedTopics = new Set(['Light']);
    // "Light" was started and finished — no quiz activity, no progress>0
    // either (legacy completion). Falls through to first-in-list, same as
    // the no-signal-at-all case, rather than re-surfacing finished work.
    expect(selectFeaturedLesson(candidates, noActivityPerf, startedTopics, completedTopics)?.topic).toBe('Light');
  });

  test('falls back to the first candidate with progress > 0 when nothing has lastActivity or startedTopics', () => {
    const noActivityPerf = { topics: {}, avgScore: null };
    const candidates = [
      { topic: 'Algebra', subject: 'Math', progress: 0 },
      { topic: 'Geometry', subject: 'Math', progress: 30 },
    ];
    expect(selectFeaturedLesson(candidates, noActivityPerf)?.topic).toBe('Geometry');
  });

  test('falls back to the first candidate when there is no signal at all', () => {
    const noActivityPerf = { topics: {}, avgScore: null };
    const candidates = [
      { topic: 'Materials Around Us', subject: 'Science', progress: 0 },
      { topic: 'Light', subject: 'Science', progress: 0 },
    ];
    expect(selectFeaturedLesson(candidates, noActivityPerf)?.topic).toBe('Materials Around Us');
  });

  test('empty candidates -> undefined', () => {
    expect(selectFeaturedLesson([], { topics: {}, avgScore: null })).toBeUndefined();
  });
});
