import { filterRoster } from '../../utils/rosterFilters';
import type { RosterStudent } from '../../types';

function student(overrides: Partial<RosterStudent> = {}): RosterStudent {
  return {
    id: 's1', name: 'A', grade: 'Grade 4', curriculum: 'IB PYP', photoUrl: null, scopedSubjects: ['Mathematics'],
    studyTime: 0, learningPathTime: 0, assignmentTime: 0, challengeTime: 0, progressPct: 0, totalTopics: 0, completedTopics: [],
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
