import { checkDobGradeConsistency, GRADE_AGE_RANGES } from '../dobGradeValidation';

// Jan 1st avoids birthday-boundary flakiness (same convention as validation.test.ts / studentCompletion.test.ts).
function agedDob(yearsAgo: number): string {
  const today = new Date();
  return `01/01/${today.getFullYear() - yearsAgo}`;
}

describe('checkDobGradeConsistency', () => {
  test('DOB too old for grade -> invalid', () => {
    // e.g. 11/08/2011 -> ~15yo, Grade 3 expects age 6-10.
    const result = checkDobGradeConsistency(agedDob(15), 'Grade 3');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Grade 3');
  });

  test('DOB too young for grade -> invalid', () => {
    const result = checkDobGradeConsistency(agedDob(6), 'Grade 6');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Grade 6');
  });

  test('valid DOB + grade -> valid', () => {
    // ~8yo, Grade 3 expects age 6-10.
    const result = checkDobGradeConsistency(agedDob(8), 'Grade 3');
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  test('minimum allowed age for a grade -> valid', () => {
    const { min } = GRADE_AGE_RANGES['Grade 3'];
    expect(checkDobGradeConsistency(agedDob(min), 'Grade 3').valid).toBe(true);
  });

  test('maximum allowed age for a grade -> valid', () => {
    const { max } = GRADE_AGE_RANGES['Grade 3'];
    expect(checkDobGradeConsistency(agedDob(max), 'Grade 3').valid).toBe(true);
  });

  test('one year below minimum -> invalid', () => {
    const { min } = GRADE_AGE_RANGES['Grade 3'];
    expect(checkDobGradeConsistency(agedDob(min - 1), 'Grade 3').valid).toBe(false);
  });

  test('one year above maximum -> invalid', () => {
    const { max } = GRADE_AGE_RANGES['Grade 3'];
    expect(checkDobGradeConsistency(agedDob(max + 1), 'Grade 3').valid).toBe(false);
  });

  test('missing DOB -> skipped (valid)', () => {
    expect(checkDobGradeConsistency('', 'Grade 3').valid).toBe(true);
  });

  test('missing grade -> skipped (valid)', () => {
    expect(checkDobGradeConsistency(agedDob(15), '').valid).toBe(true);
  });

  test('invalid/unparseable DOB -> skipped (valid), not this validator\'s concern', () => {
    expect(checkDobGradeConsistency('not-a-date', 'Grade 3').valid).toBe(true);
  });

  test('unknown grade string -> skipped (valid)', () => {
    expect(checkDobGradeConsistency(agedDob(8), 'Nursery').valid).toBe(true);
    expect(checkDobGradeConsistency(agedDob(8), 'Grade 99').valid).toBe(true);
  });

  // Representative cases across Grade 1-12, one at the typical (mid-range) age each.
  test.each([
    ['Grade 1', 6], ['Grade 2', 7], ['Grade 3', 8], ['Grade 4', 9],
    ['Grade 5', 10], ['Grade 6', 11], ['Grade 7', 12], ['Grade 8', 13],
    ['Grade 9', 14], ['Grade 10', 15], ['Grade 11', 16], ['Grade 12', 17],
  ])('%s at typical age %i -> valid', (grade, age) => {
    expect(checkDobGradeConsistency(agedDob(age as number), grade as string).valid).toBe(true);
  });

  // Worked examples from the design doc.
  test('11/08/2011 -> Grade 3 -> invalid (age ~15, well outside 6-10)', () => {
    const dob = `11/08/${new Date().getFullYear() - 15}`;
    expect(checkDobGradeConsistency(dob, 'Grade 3').valid).toBe(false);
  });

  test('DOB giving age 8 -> Grade 3 -> valid', () => {
    expect(checkDobGradeConsistency(agedDob(8), 'Grade 3').valid).toBe(true);
  });
});
