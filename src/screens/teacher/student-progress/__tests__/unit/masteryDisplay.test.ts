import { masteryMeta, summarizeStudentMastery, MASTERY_META } from '../../utils/masteryDisplay';

describe('masteryMeta', () => {
  test('a known status returns its real mapped color/label', () => {
    expect(masteryMeta('mastered')).toEqual(MASTERY_META.mastered);
    expect(masteryMeta('stuck').label).toBe('Stuck');
  });

  test('an undefined status (a topic the student never touched) falls back to "Unattempted", not a crash', () => {
    const result = masteryMeta(undefined);
    expect(result.label).toBe('Unattempted');
    expect(result.color).toBeTruthy();
  });
});

describe('summarizeStudentMastery', () => {
  test('counts real topics into the right buckets', () => {
    const topicStatus = {
      Fractions: { status: 'mastered' as const },
      Decimals: { status: 'mastered' as const },
      Geometry: { status: 'stuck' as const },
      Algebra: { status: 'trying' as const },
    };
    const result = summarizeStudentMastery(topicStatus);
    expect(result.counts.mastered).toBe(2);
    expect(result.counts.stuck).toBe(1);
    expect(result.counts.trying).toBe(1);
    expect(result.totalTouched).toBe(4);
    expect(result.masteredPct).toBe(50);
  });

  test('zero touched topics -> 0% mastered, not NaN or a crash', () => {
    const result = summarizeStudentMastery({});
    expect(result.totalTouched).toBe(0);
    expect(result.masteredPct).toBe(0);
  });

  test('all topics mastered -> 100%, not 99 from rounding', () => {
    const topicStatus = {
      A: { status: 'mastered' as const },
      B: { status: 'mastered' as const },
      C: { status: 'mastered' as const },
    };
    expect(summarizeStudentMastery(topicStatus).masteredPct).toBe(100);
  });
});
