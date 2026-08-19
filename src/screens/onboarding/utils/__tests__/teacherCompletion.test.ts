import { computeTeacherCompletion, TeachingEntry } from '../teacherCompletion';

const emptyEntry: TeachingEntry = { curriculum: '', grade: '', subjectsInput: '' };

const base = {
  fullName: '',
  dob: '',
  mobile: '',
  school: '',
  city: '',
  state: '',
  country: '',
  teacherRole: '',
  entries: [emptyEntry] as TeachingEntry[],
  avatarStyle: '',
};

describe('computeTeacherCompletion — personalDone', () => {
  test('missing dob or mobile -> not done', () => {
    expect(computeTeacherCompletion({ ...base, fullName: 'A Teacher', dob: '', mobile: '9999999999' }).personalDone).toBe(false);
    expect(computeTeacherCompletion({ ...base, fullName: 'A Teacher', dob: '01/01/1990', mobile: '' }).personalDone).toBe(false);
  });

  test('all three filled -> done', () => {
    expect(computeTeacherCompletion({ ...base, fullName: 'A Teacher', dob: '01/01/1990', mobile: '9999999999' }).personalDone).toBe(true);
  });
});

describe('computeTeacherCompletion — schoolDone', () => {
  test('any missing field -> not done', () => {
    expect(computeTeacherCompletion({ ...base, school: 'HIS', city: '', state: 'TS', country: 'India' }).schoolDone).toBe(false);
  });

  test('all four filled -> done', () => {
    expect(computeTeacherCompletion({ ...base, school: 'HIS', city: 'Hyderabad', state: 'TS', country: 'India' }).schoolDone).toBe(true);
  });
});

describe('computeTeacherCompletion — teachingDone / teachesFromEntries', () => {
  test('an entry with curriculum+grade but no subjects is NOT a complete entry', () => {
    const entries = [{ curriculum: 'IB PYP', grade: 'Grade 4', subjectsInput: '' }];
    const result = computeTeacherCompletion({ ...base, entries });
    expect(result.teachingDone).toBe(false);
    expect(result.teachesFromEntries).toHaveLength(1); // has curriculum+grade
    expect(result.completeEntries).toHaveLength(0); // but no subjects
  });

  test('an entry with curriculum, grade, and subjects -> teachingDone true', () => {
    const entries = [{ curriculum: 'IB PYP', grade: 'Grade 4', subjectsInput: 'Math, Science' }];
    const result = computeTeacherCompletion({ ...base, entries });
    expect(result.teachingDone).toBe(true);
    expect(result.completeEntries[0].subjects).toEqual(['Math', 'Science']);
  });

  test('primaryCurriculum/primaryGrade come from the first complete entry', () => {
    const entries = [
      { curriculum: 'IB PYP', grade: 'Grade 4', subjectsInput: 'Math' },
      { curriculum: 'CBSE', grade: 'Grade 6', subjectsInput: 'Science' },
    ];
    const result = computeTeacherCompletion({ ...base, entries });
    expect(result.primaryCurriculum).toBe('IB PYP');
    expect(result.primaryGrade).toBe('Grade 4');
  });
});

describe('computeTeacherCompletion — requiredDone / completionPct', () => {
  const fullyValid = {
    fullName: 'A Teacher', dob: '01/01/1990', mobile: '9999999999',
    school: 'HIS', city: 'Hyderabad', state: 'TS', country: 'India',
    teacherRole: 'Subject Teacher',
    entries: [{ curriculum: 'IB PYP', grade: 'Grade 4', subjectsInput: 'Math' }],
    avatarStyle: '',
  };

  test('all 4 required cards done, avatar skipped -> requiredDone true, 80%', () => {
    const result = computeTeacherCompletion(fullyValid);
    expect(result.requiredDone).toBe(true);
    expect(result.completionPct).toBe(80);
  });

  test('all 5 cards done -> 100%', () => {
    const result = computeTeacherCompletion({ ...fullyValid, avatarStyle: 'default' });
    expect(result.completionPct).toBe(100);
  });

  test('missing professional role -> requiredDone false', () => {
    const result = computeTeacherCompletion({ ...fullyValid, teacherRole: '' });
    expect(result.requiredDone).toBe(false);
  });
});
