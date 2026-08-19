import { getAge, validateLoginForm, validateSignupForm } from '../validation';

describe('getAge', () => {
  test('returns null for malformed input (not DD/MM/YYYY)', () => {
    expect(getAge('not-a-date')).toBeNull();
    expect(getAge('12/2020')).toBeNull();
    expect(getAge('')).toBeNull();
  });

  test('returns null for an implausible year', () => {
    expect(getAge('01/01/1800')).toBeNull();
  });

  test('computes age correctly for a birthday that already passed this year', () => {
    const today = new Date();
    const eighteenYearsAgo = today.getFullYear() - 18;
    // Use Jan 1st — guaranteed to have "already happened" this year no matter when tests run.
    expect(getAge(`01/01/${eighteenYearsAgo}`)).toBe(18);
  });

  test('computes age correctly for a birthday that has not happened yet this year', () => {
    const today = new Date();
    const eighteenYearsAgo = today.getFullYear() - 18;
    // Dec 31st — guaranteed to not have happened yet, so age is still 17.
    expect(getAge(`31/12/${eighteenYearsAgo}`)).toBe(17);
  });
});

describe('validateLoginForm', () => {
  test('empty email and password -> error', () => {
    const result = validateLoginForm({ email: '', pass: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please fill in all fields.');
  });

  test('email present but password empty -> error', () => {
    const result = validateLoginForm({ email: 'a@a.com', pass: '' });
    expect(result.valid).toBe(false);
  });

  test('whitespace-only password is treated as empty -> error', () => {
    const result = validateLoginForm({ email: 'a@a.com', pass: '   ' });
    expect(result.valid).toBe(false);
  });

  test('both fields filled -> valid', () => {
    const result = validateLoginForm({ email: 'a@a.com', pass: 'secret1' });
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('validateSignupForm', () => {
  const base = { name: 'A Student', email: 'a@a.com', pass: 'secret1', role: 'teacher' as const, dob: '' };

  test('missing name -> error', () => {
    const result = validateSignupForm({ ...base, name: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter your full name.');
  });

  test('missing email -> error', () => {
    const result = validateSignupForm({ ...base, email: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a valid email address.');
  });

  test('malformed email -> error', () => {
    const result = validateSignupForm({ ...base, email: 'not-an-email' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a valid email format.');
  });

  test('password under 6 characters -> error', () => {
    const result = validateSignupForm({ ...base, pass: '123' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Password must be at least 6 characters.');
  });

  test('non-student role does not require date of birth', () => {
    const result = validateSignupForm({ ...base, role: 'teacher', dob: '' });
    expect(result.valid).toBe(true);
  });

  test('student role with no date of birth -> error', () => {
    const result = validateSignupForm({ ...base, role: 'student', dob: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter your date of birth.');
  });

  test('student role with malformed date of birth -> error', () => {
    const result = validateSignupForm({ ...base, role: 'student', dob: 'not-a-date' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Please enter a valid date of birth (DD/MM/YYYY).');
  });

  test('student under 14 -> blocked from self-registering', () => {
    const today = new Date();
    const tenYearsAgo = today.getFullYear() - 10;
    const result = validateSignupForm({ ...base, role: 'student', dob: `01/01/${tenYearsAgo}` });
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      'Students under 14 cannot self-register. Please ask your parent or teacher to create your account.'
    );
  });

  test('student 14 or older -> valid', () => {
    const today = new Date();
    const fifteenYearsAgo = today.getFullYear() - 15;
    const result = validateSignupForm({ ...base, role: 'student', dob: `01/01/${fifteenYearsAgo}` });
    expect(result.valid).toBe(true);
  });

  test('fully valid teacher signup -> valid, no error', () => {
    const result = validateSignupForm(base);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
