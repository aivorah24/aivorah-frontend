import { safeIcon } from '../constants';

describe('safeIcon', () => {
  test('maps a known icon name to itself', () => {
    expect(safeIcon('smile')).toBe('smile');
    expect(safeIcon('book-open')).toBe('book-open');
  });

  test('maps "check" to the real "check-circle" icon', () => {
    expect(safeIcon('check')).toBe('check-circle');
  });

  test('falls back to "check-circle" for an unknown icon name', () => {
    expect(safeIcon('not-a-real-icon')).toBe('check-circle');
  });
});
