import { attendanceStats, classKey, isValidISODate, recordsOf, toggleStatus, todayISO } from '../../utils/attendanceUtils';

const roster: any[] = [
  { id: 'a', name: 'A', status: 'present' },
  { id: 'b', name: 'B', status: 'absent' },
  { id: 'c', name: 'C', status: 'late' },
  { id: 'd', name: 'D', status: null },
];

describe('attendanceUtils', () => {
  test('stats count each status and the unmarked ones', () => {
    expect(attendanceStats(roster)).toEqual({ present: 1, absent: 1, late: 1, unmarked: 1, total: 4 });
  });

  test('tapping a new status sets it; tapping the same status again clears it', () => {
    expect(toggleStatus(roster, 'd', 'late').find((s) => s.id === 'd')!.status).toBe('late');
    expect(toggleStatus(roster, 'a', 'present').find((s) => s.id === 'a')!.status).toBeNull();
  });

  test('only marked students are saved', () => {
    expect(recordsOf(roster)).toEqual({ a: 'present', b: 'absent', c: 'late' });
  });

  test('dates must be real YYYY-MM-DD days', () => {
    expect(isValidISODate('2026-09-15')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-9-15')).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });

  test('class key matches the chip testID shape', () => {
    expect(classKey({ grade: 'Grade 5', section: 'E2E-ATT' })).toBe('Grade 5-E2E-ATT');
  });
});

describe('todayISO', () => {
  test('uses the local calendar day, not UTC (India before 5:30 am is still the same day locally)', () => {
    const early = new Date(2026, 9, 6, 2, 15); // 6 Oct 2026, 02:15 local
    expect(todayISO(early)).toBe('2026-10-06');
  });
  test('pads month and day', () => {
    expect(todayISO(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });
});
