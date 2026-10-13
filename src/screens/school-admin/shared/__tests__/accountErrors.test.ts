import { friendlyAccountError } from '../accountErrors';

describe('friendlyAccountError', () => {
  test('maps Firebase codes, including "CODE : detail" forms', () => {
    expect(friendlyAccountError('EMAIL_EXISTS', 'x')).toBe('This email is already registered.');
    expect(friendlyAccountError('WEAK_PASSWORD : Password should be at least 6 characters', 'x')).toMatch(/password/i);
    expect(friendlyAccountError('TOO_MANY_ATTEMPTS_TRY_LATER', 'x')).toMatch(/wait/);
  });

  test('never shows an unmapped raw code', () => {
    expect(friendlyAccountError('SOME_NEW_CODE', 'Failed to add parent')).toBe('Failed to add parent');
  });

  test('passes sentences through and falls back on empty', () => {
    expect(friendlyAccountError('An account with this email already exists.', 'x')).toBe('An account with this email already exists.');
    expect(friendlyAccountError('', 'Failed')).toBe('Failed');
    expect(friendlyAccountError(undefined, 'Failed')).toBe('Failed');
  });
});
