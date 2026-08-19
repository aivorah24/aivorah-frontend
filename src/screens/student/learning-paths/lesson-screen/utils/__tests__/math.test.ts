import { parseSubtraction } from '../math';

describe('parseSubtraction', () => {
  test('parses a real simple two-digit subtraction problem', () => {
    expect(parseSubtraction('45 - 27')).toEqual({ top: 45, bottom: 27 });
  });

  test('parses real numbers embedded in a real word problem, ignoring the surrounding text', () => {
    expect(parseSubtraction('Solve: 82 - 39 = ?')).toEqual({ top: 82, bottom: 39 });
  });

  test('returns real null when there is no subtraction pattern at all', () => {
    expect(parseSubtraction('What is 5 + 3?')).toBeNull();
  });

  test('returns real null when the top number is smaller than the bottom (would require negative borrow)', () => {
    expect(parseSubtraction('5 - 27')).toBeNull();
  });

  test('returns real null when either real number exceeds two digits (100+)', () => {
    expect(parseSubtraction('145 - 27')).toBeNull();
    expect(parseSubtraction('45 - 127')).toBeNull();
  });

  test('returns real null for empty/undefined input, no crash', () => {
    expect(parseSubtraction('')).toBeNull();
    expect(parseSubtraction(undefined as any)).toBeNull();
  });

  test('handles a real equal top/bottom (borrow-free zero-result case)', () => {
    expect(parseSubtraction('50 - 50')).toEqual({ top: 50, bottom: 50 });
  });
});
