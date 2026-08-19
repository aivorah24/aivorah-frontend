import { computeStudentCompletion } from '../studentCompletion';

function agedDob(yearsAgo: number): string {
  const today = new Date();
  return `01/01/${today.getFullYear() - yearsAgo}`;
}

const base = {
  fullName: '',
  dob: '',
  curriculum: '',
  school: '',
  grade: '',
  avatarStyle: '',
  learningStyle: '',
};

describe('computeStudentCompletion — aboutYouDone', () => {
  test('name under 2 chars -> not done', () => {
    expect(computeStudentCompletion({ ...base, fullName: 'A', dob: agedDob(15) }).aboutYouDone).toBe(false);
  });

  test('valid name but under 14 -> not done', () => {
    expect(computeStudentCompletion({ ...base, fullName: 'Ann', dob: agedDob(10) }).aboutYouDone).toBe(false);
  });

  test('valid name and 14+ -> done', () => {
    expect(computeStudentCompletion({ ...base, fullName: 'Ann', dob: agedDob(15) }).aboutYouDone).toBe(true);
  });
});

describe('computeStudentCompletion — curriculumDone / schoolGradeDone', () => {
  test('no curriculum -> not done', () => {
    expect(computeStudentCompletion({ ...base, curriculum: '' }).curriculumDone).toBe(false);
  });

  test('curriculum set -> done', () => {
    expect(computeStudentCompletion({ ...base, curriculum: 'IB PYP' }).curriculumDone).toBe(true);
  });

  test('school under 2 chars or no grade -> not done', () => {
    expect(computeStudentCompletion({ ...base, school: 'A', grade: 'Grade 4' }).schoolGradeDone).toBe(false);
    expect(computeStudentCompletion({ ...base, school: 'HIS', grade: '' }).schoolGradeDone).toBe(false);
  });

  test('valid school and grade -> done', () => {
    expect(computeStudentCompletion({ ...base, school: 'HIS', grade: 'Grade 4' }).schoolGradeDone).toBe(true);
  });
});

describe('computeStudentCompletion — requiredDone (gates Complete Setup)', () => {
  test('all three required cards done -> requiredDone true, even with optional cards empty', () => {
    const result = computeStudentCompletion({
      ...base,
      fullName: 'Ann', dob: agedDob(15), curriculum: 'IB PYP', school: 'HIS', grade: 'Grade 4',
    });
    expect(result.requiredDone).toBe(true);
  });

  test('missing just one required card -> requiredDone false', () => {
    const result = computeStudentCompletion({
      ...base,
      fullName: 'Ann', dob: agedDob(15), curriculum: '', school: 'HIS', grade: 'Grade 4',
    });
    expect(result.requiredDone).toBe(false);
  });
});

describe('computeStudentCompletion — completionPct (out of 5 cards)', () => {
  test('nothing filled -> 0%', () => {
    expect(computeStudentCompletion(base).completionPct).toBe(0);
  });

  test('all 5 cards done -> 100%', () => {
    const result = computeStudentCompletion({
      fullName: 'Ann', dob: agedDob(15), curriculum: 'IB PYP', school: 'HIS', grade: 'Grade 4',
      avatarStyle: 'default', learningStyle: 'visual',
    });
    expect(result.completionPct).toBe(100);
  });

  test('3 of 5 cards done (the 3 required ones) -> 60%', () => {
    const result = computeStudentCompletion({
      ...base,
      fullName: 'Ann', dob: agedDob(15), curriculum: 'IB PYP', school: 'HIS', grade: 'Grade 4',
    });
    expect(result.completionPct).toBe(60);
  });
});
