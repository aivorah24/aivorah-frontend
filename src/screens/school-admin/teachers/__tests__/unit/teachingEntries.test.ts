import {
  getGradesForCurriculum, curriculaForBase, defaultCurriculumForBase, emptyEntry,
  getSubjectsForEntry, entriesToTeaches,
} from '../../utils/teachingEntries';

describe('curriculaForBase', () => {
  test('IB base expands to all three IB programmes', () => {
    expect(curriculaForBase('IB')).toEqual(['IB PYP', 'IB MYP', 'IB DP']);
  });
  test('a known non-IB base narrows to just itself', () => {
    expect(curriculaForBase('CBSE')).toEqual(['CBSE']);
  });
  test('an unknown/null base offers every curriculum', () => {
    expect(curriculaForBase(null)).toEqual(['IB PYP', 'IB MYP', 'IB DP', 'CBSE', 'ICSE', 'Cambridge']);
  });
});

describe('defaultCurriculumForBase', () => {
  test('a recognized base is used as the default', () => { expect(defaultCurriculumForBase('CBSE')).toBe('CBSE'); });
  test('IB base has no single default (ambiguous between PYP/MYP/DP)', () => { expect(defaultCurriculumForBase('IB')).toBe(''); });
  test('null base has no default', () => { expect(defaultCurriculumForBase(null)).toBe(''); });
});

describe('emptyEntry', () => {
  test('defaults to blank fields', () => { expect(emptyEntry()).toEqual({ curriculum: '', grade: '', subjectsInput: '' }); });
  test('accepts a preset curriculum', () => { expect(emptyEntry('CBSE')).toEqual({ curriculum: 'CBSE', grade: '', subjectsInput: '' }); });
});

describe('getGradesForCurriculum', () => {
  test('IB PYP is grades 1-5', () => { expect(getGradesForCurriculum('IB PYP')).toEqual(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5']); });
  test('IB DP is grades 11-12', () => { expect(getGradesForCurriculum('IB DP')).toEqual(['Grade 11', 'Grade 12']); });
  test('unrecognized curriculum falls back to the full Nursery-12 range', () => {
    expect(getGradesForCurriculum('Unknown')).toContain('Nursery');
    expect(getGradesForCurriculum('Unknown')).toContain('Grade 12');
  });
});

describe('getSubjectsForEntry', () => {
  test('CBSE primary (grade <= 5) gets EVS instead of separate Science/Social Science', () => {
    const subjects = getSubjectsForEntry('CBSE', 'Grade 3');
    expect(subjects).toContain('EVS');
    expect(subjects).not.toContain('Social Science');
  });
  test('CBSE senior secondary (grade >= 11) is stream-based', () => {
    const subjects = getSubjectsForEntry('CBSE', 'Grade 11');
    expect(subjects).toContain('Physics');
    expect(subjects).toContain('Accountancy');
  });
  test('CBSE middle grades (6-10) get a general Science/Social Science split', () => {
    const subjects = getSubjectsForEntry('CBSE', 'Grade 7');
    expect(subjects).toContain('Science');
    expect(subjects).toContain('Social Science');
  });
  test('unrecognized curriculum falls back to a generic subject list', () => {
    expect(getSubjectsForEntry('Unknown', 'Grade 1')).toEqual(['English', 'Mathematics', 'Science', 'Social Studies']);
  });
});

describe('entriesToTeaches', () => {
  test('drops incomplete entries missing curriculum or grade', () => {
    const entries = [{ curriculum: '', grade: 'Grade 1', subjectsInput: '' }, { curriculum: 'CBSE', grade: '', subjectsInput: '' }];
    expect(entriesToTeaches(entries)).toEqual([]);
  });
  test('splits subjectsInput on commas/semicolons and trims whitespace', () => {
    const entries = [{ curriculum: 'CBSE', grade: 'Grade 3', subjectsInput: ' Maths ; English, EVS ' }];
    expect(entriesToTeaches(entries)).toEqual([{ curriculum: 'CBSE', grade: 'Grade 3', subjects: ['Maths', 'English', 'EVS'] }]);
  });
});
