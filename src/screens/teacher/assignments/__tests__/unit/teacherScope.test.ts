import { buildTeacherScope, normalizeSubject, sameGrade } from '../../utils/teacherScope';

describe('teacherScope', () => {
  test('free-text subjects are matched to the app\'s subject names', () => {
    expect(normalizeSubject(' maths ')).toBe('Mathematics');
    expect(normalizeSubject('SST')).toBe('Social Studies');
    expect(normalizeSubject('computer science')).toBe('ICT');
    expect(normalizeSubject('Robotics')).toBe('Robotics'); // unknown: kept as typed
  });

  test('PYP 4 and Grade 4 are the same grade; LKG is not Grade 4', () => {
    expect(sameGrade('PYP 4', 'Grade 4')).toBe(true);
    expect(sameGrade('Grade 10', 'Grade 1')).toBe(false);
    expect(sameGrade('LKG', 'Grade 4')).toBe(false);
    expect(sameGrade('UKG', 'ukg')).toBe(true);
  });

  test('only the teacher\'s grades, and per grade only their subjects', () => {
    const scope = buildTeacherScope([
      { curriculum: 'CBSE', grade: 'Grade 4', subjects: ['Maths', 'Science'] },
      { curriculum: 'CBSE', grade: 'Grade 6', subjects: ['English'] },
    ]);
    expect(scope.grades).toEqual(['Grade 4', 'Grade 6']);
    expect(scope.subjects).toEqual(['Mathematics', 'Science', 'English']);
    expect(scope.allows('Grade 4', 'Mathematics')).toBe(true);
    expect(scope.allows('PYP 4', 'Science')).toBe(true);
    expect(scope.allows('Grade 4', 'English')).toBe(false);   // English only in Grade 6
    expect(scope.allows('Grade 6', 'English')).toBe(true);
    expect(scope.allows('Grade 9', 'Mathematics')).toBe(false); // not their grade
  });

  test('a grade saved without subjects allows every subject of that grade', () => {
    const scope = buildTeacherScope([{ grade: 'Grade 5', subjects: [] }]);
    expect(scope.allows('Grade 5', 'Visual Arts')).toBe(true);
    expect(scope.allows('Grade 3', 'Visual Arts')).toBe(false);
  });

  test('nothing saved yet: nothing to restrict by', () => {
    const scope = buildTeacherScope(undefined);
    expect(scope.grades).toEqual([]);
    expect(scope.allows('Grade 9', 'ICT')).toBe(true);
  });
});
