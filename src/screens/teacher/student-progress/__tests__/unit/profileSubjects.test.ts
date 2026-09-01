import { profileSubjectsFor, profileCurricula, profileGradesFor, mergeGrades } from '../../utils/profileSubjects';

describe('profileSubjectsFor', () => {
  test('a teacher configured for Mathematics AND English for the selected class shows both', () => {
    const teaches = [{ grade: 'Grade 3', curriculum: 'CBSE', subjects: ['Mathematics', 'English'] }];
    expect(profileSubjectsFor(teaches, 'CBSE', 'Grade 3')).toEqual(['Mathematics', 'English']);
  });

  test('grade comparison is normalized — "Grade 3" (profile) matches "3" (real student format)', () => {
    const teaches = [{ grade: 'Grade 3', curriculum: 'CBSE', subjects: ['Mathematics'] }];
    expect(profileSubjectsFor(teaches, 'CBSE', '3')).toEqual(['Mathematics']);
  });

  test('a teaches entry for a DIFFERENT class is excluded — edge case of two classes under different curricula', () => {
    const teaches = [
      { grade: 'Grade 3', curriculum: 'CBSE', subjects: ['Mathematics'] },
      { grade: 'Grade 4', curriculum: 'IB PYP', subjects: ['Science'] },
    ];
    expect(profileSubjectsFor(teaches, 'CBSE', 'Grade 3')).toEqual(['Mathematics']);
  });

  test('no curriculum/grade filter yet -> every configured subject across all classes', () => {
    const teaches = [
      { grade: 'Grade 3', curriculum: 'CBSE', subjects: ['Mathematics'] },
      { grade: 'Grade 4', curriculum: 'IB PYP', subjects: ['Science'] },
    ];
    expect(profileSubjectsFor(teaches, undefined, undefined).sort()).toEqual(['Mathematics', 'Science']);
  });

  test('no teaches array at all -> empty, not a crash', () => {
    expect(profileSubjectsFor(undefined, 'CBSE', 'Grade 3')).toEqual([]);
  });

  test('a teaches entry with no subjects array -> skipped safely', () => {
    const teaches = [{ grade: 'Grade 3', curriculum: 'CBSE' }];
    expect(profileSubjectsFor(teaches, 'CBSE', 'Grade 3')).toEqual([]);
  });
});

// Regression coverage for the reported bug: a teacher changed their
// Curriculum & Grade in Settings, but Student Progress kept showing the OLD
// subjects — because the Curriculum/Grade dropdowns were real-student-data
// only, with nowhere for the newly-configured combo to appear at all.
describe('profileCurricula', () => {
  test('every real curriculum the teacher is configured for, deduplicated', () => {
    const teaches = [
      { grade: 'Grade 3', curriculum: 'CBSE', subjects: ['Mathematics'] },
      { grade: 'Grade 6', curriculum: 'CBSE', subjects: ['Science'] },
      { grade: 'Grade 7', curriculum: 'IB MYP', subjects: ['Mathematics'] },
    ];
    expect(profileCurricula(teaches).sort()).toEqual(['CBSE', 'IB MYP']);
  });

  test('no teaches array at all -> empty, not a crash', () => {
    expect(profileCurricula(undefined)).toEqual([]);
  });
});

describe('profileGradesFor', () => {
  test('grades configured for the given curriculum only', () => {
    const teaches = [
      { grade: 'Grade 3', curriculum: 'CBSE', subjects: ['Mathematics'] },
      { grade: 'Grade 6', curriculum: 'CBSE', subjects: ['Science'] },
      { grade: 'Grade 7', curriculum: 'IB MYP', subjects: ['Mathematics'] },
    ];
    expect(profileGradesFor(teaches, 'CBSE').sort()).toEqual(['Grade 3', 'Grade 6']);
  });

  test('no curriculum given -> every configured grade across all classes', () => {
    const teaches = [
      { grade: 'Grade 3', curriculum: 'CBSE', subjects: ['Mathematics'] },
      { grade: 'Grade 7', curriculum: 'IB MYP', subjects: ['Mathematics'] },
    ];
    expect(profileGradesFor(teaches, undefined).sort()).toEqual(['Grade 3', 'Grade 7']);
  });
});

describe('mergeGrades', () => {
  test('a profile-only grade (no real students yet) is still included', () => {
    expect(mergeGrades(['3', '4'], ['Grade 6'])).toEqual(['3', '4', 'Grade 6']);
  });

  test('the same grade in two formats ("3" vs "Grade 3") is deduplicated to one entry', () => {
    const result = mergeGrades(['3'], ['Grade 3']);
    expect(result).toHaveLength(1);
    expect(['3', 'Grade 3']).toContain(result[0]);
  });

  test('no profile grades -> real data list unchanged', () => {
    expect(mergeGrades(['3', '4'], [])).toEqual(['3', '4']);
  });
});
