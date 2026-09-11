import { filterStudentsForChallenge } from '../../components/AssignChallengeModal';

const S = (id: string, name: string, grade: string) => ({ id, name, grade });

describe('filterStudentsForChallenge', () => {
  const students = [S('1', 'Alice', 'Grade 3'), S('2', 'Bob', 'Grade 4'), S('3', 'Carl', 'Grade 3')];

  test('matches students in the same grade as the challenge', () => {
    const result = filterStudentsForChallenge(students, { grade: 'Grade 3' } as any, '');
    expect(result.map(s => s.id)).toEqual(['1', '3']);
  });

  test('search narrows within the grade-matched set', () => {
    const result = filterStudentsForChallenge(students, { grade: 'Grade 3' } as any, 'ali');
    expect(result.map(s => s.id)).toEqual(['1']);
  });

  // The bug: roster grade strings ("3rd Grade", "G3", a stale/blank value, ...)
  // can fail to normalize-match the challenge's grade string even when the
  // teacher's real students are the right age group — this previously showed
  // "No Grade 3 students linked to your account" with a non-empty roster,
  // making it look like the roster fetch itself was broken (it wasn't) and
  // making challenge assignment impossible. AssignToPicker.tsx (the
  // equivalent Assignments-flow picker) already hit this exact class of bug
  // and fixed it with the same fallback-to-full-roster approach applied here.
  test('falls back to the full (search-only-filtered) roster when no student matches the grade format', () => {
    const oddGradeStudents = [S('1', 'Alice', '3rd Grade'), S('2', 'Bob', 'G4')];
    const result = filterStudentsForChallenge(oddGradeStudents, { grade: 'Grade 3' } as any, '');
    expect(result.map(s => s.id)).toEqual(['1', '2']);
  });

  test('the fallback still respects an active search term', () => {
    const oddGradeStudents = [S('1', 'Alice', '3rd Grade'), S('2', 'Bob', 'G4')];
    const result = filterStudentsForChallenge(oddGradeStudents, { grade: 'Grade 3' } as any, 'bob');
    expect(result.map(s => s.id)).toEqual(['2']);
  });

  test('no challenge grade set (falsy) matches every student', () => {
    const result = filterStudentsForChallenge(students, null, '');
    expect(result).toHaveLength(3);
  });
});
