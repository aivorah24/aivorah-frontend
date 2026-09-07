import { filterRoster, filterByClass } from '../../utils/rosterFilters';
import type { RosterStudent } from '../../types';

function student(overrides: Partial<RosterStudent> = {}): RosterStudent {
  return {
    id: 's1', name: 'A', grade: 'Grade 4', curriculum: 'IB PYP', section: null, class: null, photoUrl: null, scopedSubjects: ['Mathematics'],
    studyTime: 0, learningPathTime: 0, learningPathTimeToday: null, assignmentTime: 0, challengeTime: 0, progressPct: 0, totalTopics: 0, completedTopics: [],
    quizAttempts: 0, quizBestScore: null, lastActive: null, needsAttention: false,
    ...overrides,
  };
}

// Regression tests for the reported bug: "the Activity table ignored the
// Subject/Grade filter pills entirely — filtering to Grade 3 in the heatmap
// left the table below still showing every grade."
describe('filterRoster', () => {
  test('no filters -> returns every real student unchanged', () => {
    const roster = [student({ id: 's1' }), student({ id: 's2', grade: 'Grade 6' })];
    expect(filterRoster(roster, undefined, undefined)).toHaveLength(2);
  });

  test('a grade filter keeps only students in that real grade', () => {
    const roster = [student({ id: 's1', grade: 'Grade 3' }), student({ id: 's2', grade: 'Grade 4' })];
    const result = filterRoster(roster, undefined, 'Grade 3');
    expect(result).toEqual([expect.objectContaining({ id: 's1' })]);
  });

  test('a subject filter keeps only students whose real scopedSubjects include it', () => {
    const roster = [
      student({ id: 's1', scopedSubjects: ['Mathematics'] }),
      student({ id: 's2', scopedSubjects: ['English'] }),
    ];
    const result = filterRoster(roster, 'Mathematics', undefined);
    expect(result).toEqual([expect.objectContaining({ id: 's1' })]);
  });

  test('both filters together apply as a real AND, not an OR', () => {
    const roster = [
      student({ id: 's1', grade: 'Grade 3', scopedSubjects: ['Mathematics'] }),
      student({ id: 's2', grade: 'Grade 3', scopedSubjects: ['English'] }),
      student({ id: 's3', grade: 'Grade 4', scopedSubjects: ['Mathematics'] }),
    ];
    const result = filterRoster(roster, 'Mathematics', 'Grade 3');
    expect(result).toEqual([expect.objectContaining({ id: 's1' })]);
  });
});

// Edge case from the newest feedback: a teacher can handle Grade 3 under IB
// AND Grade 4 under CBSE — a grade filter alone isn't enough to disambiguate
// which curriculum's roster is meant, and section must combine with both.
describe('filterByClass', () => {
  test('curriculum filter disambiguates the same grade taught under two curricula', () => {
    const roster = [
      student({ id: 's1', grade: 'Grade 3', curriculum: 'IB PYP' }),
      student({ id: 's2', grade: 'Grade 3', curriculum: 'CBSE' }),
    ];
    const result = filterByClass(roster, { grade: 'Grade 3', curriculum: 'IB PYP' });
    expect(result).toEqual([expect.objectContaining({ id: 's1' })]);
  });

  test('section filter keeps only the real matching section', () => {
    const roster = [
      student({ id: 's1', section: 'A' }),
      student({ id: 's2', section: 'B' }),
      student({ id: 's3', section: null }),
    ];
    const result = filterByClass(roster, { section: 'A' });
    expect(result).toEqual([expect.objectContaining({ id: 's1' })]);
  });

  test('no section filter ("All sections") returns every section unchanged', () => {
    const roster = [student({ id: 's1', section: 'A' }), student({ id: 's2', section: 'B' })];
    expect(filterByClass(roster, {})).toHaveLength(2);
  });

  test('grade + curriculum + subject + section all combine as AND', () => {
    const roster = [
      student({ id: 's1', grade: 'Grade 3', curriculum: 'IB PYP', section: 'A', scopedSubjects: ['Mathematics'] }),
      student({ id: 's2', grade: 'Grade 3', curriculum: 'IB PYP', section: 'B', scopedSubjects: ['Mathematics'] }),
    ];
    const result = filterByClass(roster, { grade: 'Grade 3', curriculum: 'IB PYP', subject: 'Mathematics', section: 'A' });
    expect(result).toEqual([expect.objectContaining({ id: 's1' })]);
  });
});
