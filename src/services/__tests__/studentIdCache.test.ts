import { primeStudentId, getPrimedStudentId, clearPrimedStudentIds } from '../studentIdCache';

describe('studentIdCache', () => {
  beforeEach(() => clearPrimedStudentIds());
  afterEach(() => jest.useRealTimers());

  test('returns a primed id, matching email case-insensitively', () => {
    primeStudentId('Asha@School.com ', 'id-1');
    expect(getPrimedStudentId('asha@school.com')).toBe('id-1');
  });

  test('unknown email -> null', () => {
    expect(getPrimedStudentId('nobody@x.com')).toBeNull();
  });

  test('expires after 60 seconds so a later lookup asks the server again', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-07T10:00:00Z'));
    primeStudentId('a@b.com', 'id-1');
    jest.setSystemTime(new Date('2026-11-07T10:00:59Z'));
    expect(getPrimedStudentId('a@b.com')).toBe('id-1');
    jest.setSystemTime(new Date('2026-11-07T10:01:01Z'));
    expect(getPrimedStudentId('a@b.com')).toBeNull();
  });

  test('ignores empty values', () => {
    primeStudentId('a@b.com', '');
    expect(getPrimedStudentId('a@b.com')).toBeNull();
  });
});
