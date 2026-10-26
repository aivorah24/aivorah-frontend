import { curriculumGradeError, ibProgrammeForGrade } from '../curriculumGrades';

describe('curriculumGradeError', () => {
  test('IB DP with Grade 7 explains the range and suggests MYP', () => {
    expect(curriculumGradeError('IB DP', 'Grade 7')).toBe('IB DP is only for Grade 11–12. Please choose Grade 11 or 12, or switch to IB MYP for Grade 7.');
  });
  test('IB PYP with Grade 9 suggests MYP', () => {
    expect(curriculumGradeError('IB PYP', 'Grade 9')).toBe('IB PYP is only for Grade 1–5. Please choose a grade from 1 to 5, or switch to IB MYP for Grade 9.');
  });
  test('valid IB pairs and non-IB boards pass', () => {
    expect(curriculumGradeError('IB MYP', 'Grade 10')).toBeNull();
    expect(curriculumGradeError('IB_PYP', 'Grade 3')).toBeNull();
    expect(curriculumGradeError('CBSE', 'Grade 12')).toBeNull();
    expect(curriculumGradeError('Cambridge', 'Grade 11')).toBeNull();
  });
  test('pre-primary grades are not valid for MYP/DP', () => {
    expect(curriculumGradeError('IB DP', 'UKG')).toBe('IB DP is only for Grade 11–12. Please choose Grade 11 or 12.');
  });
  test('ibProgrammeForGrade', () => {
    expect(ibProgrammeForGrade('Grade 5')).toBe('IB PYP');
    expect(ibProgrammeForGrade('Grade 11')).toBe('IB DP');
    expect(ibProgrammeForGrade('LKG')).toBeNull();
  });
});
