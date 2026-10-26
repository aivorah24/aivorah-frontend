import { summarizeByTopic, groupByUnit, formatDuration, scoreTone, average } from '../../utils/topicAttempts';

const attempt = (id: string, topic: string, score: number, createdAt: string, timeSpentSeconds = 30) => ({
  id, topic, subject: 'Maths', attemptNumber: null, score, passed: score >= 60,
  totalQuestions: 2, correctAnswers: 1, timeSpentSeconds, createdAt, questions: [],
});

describe('topicAttempts utils', () => {
  test('summarizeByTopic: newest first, best and latest score, total time', () => {
    const map = summarizeByTopic([
      attempt('a1', 'Fractions', 90, '2026-10-01'),
      attempt('a2', 'Fractions', 40, '2026-10-03', 45),
      attempt('a3', 'Angles', 70, '2026-10-02'),
    ]);
    const f = map.get('Fractions')!;
    expect(f.attempts.map(a => a.id)).toEqual(['a2', 'a1']);
    expect(f.bestScore).toBe(90);
    expect(f.latestScore).toBe(40);
    expect(f.totalSeconds).toBe(75);
    expect(map.get('Angles')!.attempts).toHaveLength(1);
  });

  test('groupByUnit keeps syllabus order and groups unit-less topics together', () => {
    const groups = groupByUnit([
      { topic: 'a', unit: 'U1' }, { topic: 'b', unit: 'U2' }, { topic: 'c', unit: 'U1' }, { topic: 'd' },
    ]);
    expect(groups.map(g => [g.unit, g.topics.map(t => t.topic)])).toEqual([
      ['U1', ['a', 'c']], ['U2', ['b']], ['', ['d']],
    ]);
  });

  test('formatDuration', () => {
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(120)).toBe('2m');
    expect(formatDuration(135)).toBe('2m 15s');
    expect(formatDuration(3720)).toBe('1h 2m');
  });

  test('scoreTone and average', () => {
    expect([scoreTone(85), scoreTone(60), scoreTone(59)]).toEqual(['good', 'ok', 'low']);
    expect(average([50, 75])).toBe(63);
    expect(average([])).toBeNull();
  });
});
