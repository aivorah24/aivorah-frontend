import {
  computeRealTopicPerf, computeAvgScore, computeConsistency, computeWeeklyConsistency, computeBestTopic,
} from '../performanceStats';

const perfData = {
  topics: {
    'Area and Perimeter': { avgScore: 80, sessions: 2 },
    'Place Value and Comparison': { avgScore: 75, sessions: 1 },
    'LCM and HCF': { avgScore: null, sessions: 1 },
  },
  avgScore: 78,
};

const curriculumTopics = [
  { topic: 'Area and Perimeter', subject: 'Mathematics' },
  { topic: 'Place Value and Comparison', subject: 'Mathematics' },
  { topic: 'LCM and HCF', subject: 'Mathematics' },
  { topic: 'Fractions', subject: 'Mathematics' }, // no perf data -> pct 0 -> filtered out
];

describe('computeRealTopicPerf', () => {
  test('no curriculum topics -> empty array', () => {
    expect(computeRealTopicPerf(null, perfData)).toEqual([]);
    expect(computeRealTopicPerf(undefined, perfData)).toEqual([]);
  });

  test('only includes topics with a real (>0) score', () => {
    const result = computeRealTopicPerf(curriculumTopics, perfData);
    const labels = result.map(t => t.label);
    expect(labels).toContain('Area and Perimeter');
    expect(labels).toContain('Place Value and Comparison');
    expect(labels).not.toContain('LCM and HCF'); // null avgScore -> pct 0 -> filtered
    expect(labels).not.toContain('Fractions'); // no perf entry -> pct 0 -> filtered
  });

  test('pct comes from perfData avgScore', () => {
    const result = computeRealTopicPerf(curriculumTopics, perfData);
    expect(result.find(t => t.label === 'Area and Perimeter')?.pct).toBe(80);
  });
});

describe('computeAvgScore', () => {
  test('uses perfData.avgScore when available', () => {
    expect(computeAvgScore([], 78)).toBe(78);
  });

  test('falls back to average of realTopicPerf when perfData.avgScore is null', () => {
    const topics = [{ label: 'A', fullLabel: 'A', subject: 'Math', pct: 80 }, { label: 'B', fullLabel: 'B', subject: 'Math', pct: 60 }];
    expect(computeAvgScore(topics, null)).toBe(70);
  });

  test('no data at all -> 0', () => {
    expect(computeAvgScore([], null)).toBe(0);
  });
});

describe('computeConsistency', () => {
  test('no topics -> 0', () => {
    expect(computeConsistency([])).toBe(0);
  });

  test('% of topics scoring >= 60', () => {
    const topics = [
      { label: 'A', fullLabel: 'A', subject: 'Math', pct: 80 },
      { label: 'B', fullLabel: 'B', subject: 'Math', pct: 60 },
      { label: 'C', fullLabel: 'C', subject: 'Math', pct: 40 },
      { label: 'D', fullLabel: 'D', subject: 'Math', pct: 30 },
    ];
    expect(computeConsistency(topics)).toBe(50); // 2 of 4 >= 60
  });

  test('all topics below 60 -> 0%', () => {
    const topics = [{ label: 'A', fullLabel: 'A', subject: 'Math', pct: 40 }];
    expect(computeConsistency(topics)).toBe(0);
  });
});

describe('computeWeeklyConsistency', () => {
  test('0 days active -> 0%', () => {
    expect(computeWeeklyConsistency(0)).toBe(0);
  });

  test('7 days active -> 100%', () => {
    expect(computeWeeklyConsistency(7)).toBe(100);
  });

  test('3 of 7 days -> 43%', () => {
    expect(computeWeeklyConsistency(3)).toBe(43);
  });

  test('streak longer than a week is capped at 7 -> still 100%', () => {
    expect(computeWeeklyConsistency(30)).toBe(100);
  });
});

describe('computeBestTopic', () => {
  test('empty -> null', () => {
    expect(computeBestTopic([])).toBeNull();
  });

  test('returns the highest-scoring topic', () => {
    const topics = [
      { label: 'Place Value', fullLabel: 'Place Value', subject: 'Math', pct: 75 },
      { label: 'Area', fullLabel: 'Area', subject: 'Math', pct: 100 },
      { label: 'Algebra', fullLabel: 'Algebra', subject: 'Math', pct: 40 },
    ];
    expect(computeBestTopic(topics)?.label).toBe('Area');
  });
});
