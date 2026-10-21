import { subjectsFor, subjectLabel, gradeNumber } from '../../constants';

describe('subjects by curriculum and grade', () => {
  test('CBSE primary has EVS, middle school has Science + Social Science, senior school splits sciences', () => {
    expect(subjectsFor('CBSE', 'Grade 4')).toContain('Environmental Studies');
    expect(subjectsFor('CBSE', 'Grade 4')).not.toContain('Science');
    expect(subjectsFor('CBSE', 'Grade 7')).toEqual(expect.arrayContaining(['Science', 'Social Studies']));
    expect(subjectsFor('CBSE', 'Grade 11')).toEqual(expect.arrayContaining(['Physics', 'Chemistry', 'Biology', 'Accountancy']));
    expect(subjectLabel('Social Studies', 'CBSE', 'Grade 7')).toBe('Social Science');
    expect(subjectLabel('Language Acquisition', 'CBSE', 'Grade 7')).toBe('Second Language');
  });

  test('ICSE middle school teaches Physics/Chemistry/Biology and History & Civics', () => {
    expect(subjectsFor('ICSE', 'Grade 7')).toEqual(expect.arrayContaining(['Physics', 'Chemistry', 'Biology', 'History & Civics']));
    expect(subjectsFor('ICSE', 'Grade 7')).not.toContain('Science');
  });

  test('IB names change from PYP to MYP to DP', () => {
    expect(subjectsFor('IB PYP', 'Grade 4')).toContain('Language Acquisition');
    expect(subjectLabel('Social Studies', 'IB PYP', 'Grade 4')).toBe('Social Studies');
    expect(subjectLabel('Social Studies', 'IB MYP', 'Grade 7')).toBe('Individuals and Societies');
    expect(subjectsFor('IB DP', 'Grade 11')).toContain('Theory of Knowledge');
  });

  test('Cambridge has Global Perspectives; unknown curriculum keeps the full list', () => {
    expect(subjectsFor('Cambridge', 'Grade 5')).toContain('Global Perspectives');
    expect(subjectsFor('', 'Grade 5')).toContain('Social Studies');
  });

  test('grade parsing', () => {
    expect(gradeNumber('Grade 10')).toBe(10);
    expect(gradeNumber('UKG')).toBe(0);
    expect(gradeNumber('')).toBeNull();
  });
});
