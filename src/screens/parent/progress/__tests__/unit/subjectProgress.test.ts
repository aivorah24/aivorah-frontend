import { buildSubjectProgress, learningPathTotals } from '../../utils/subjectProgress';

describe('buildSubjectProgress', () => {
  const subjects = [
    { subject: 'English', topics: ['Poem', 'Story', 'Grammar', 'Letter'] },
    { subject: 'Hindi', topics: ['Kabir', 'Premchand'] },
    { subject: 'Health and Physical Education', topics: [], topicCount: 9 },
  ];

  test('one row per learning-path subject, in its order, counted against its own topics', () => {
    const rows = buildSubjectProgress(subjects, ['Poem', 'Story', 'Kabir', 'Fractions']);
    expect(rows.map(r => [r.label, r.completed, r.total, r.pct])).toEqual([
      ['English', 2, 4, 50],
      ['Hindi', 1, 2, 50],
      ['Health and Physical Education', 0, 9, 0],
    ]);
  });

  test('no hardcoded subjects: an empty learning path gives no rows', () => {
    expect(buildSubjectProgress([], ['Fractions'])).toEqual([]);
  });

  test('learningPathTotals sums the rows', () => {
    expect(learningPathTotals(buildSubjectProgress(subjects, ['Poem']))).toEqual({ completed: 1, total: 15 });
  });
});
