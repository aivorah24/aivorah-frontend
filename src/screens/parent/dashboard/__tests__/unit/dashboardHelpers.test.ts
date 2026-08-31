import { formatStudyTime, formatDueDateShort, formatEventDate, formatEventTime } from '../../utils/dashboardHelpers';

describe('formatStudyTime', () => {
  test('zero hours -> just minutes', () => {
    expect(formatStudyTime(45)).toBe('45m');
  });

  test('exact hours (zero remainder minutes) -> just hours', () => {
    expect(formatStudyTime(120)).toBe('2h');
  });

  test('hours + minutes -> both shown', () => {
    expect(formatStudyTime(125)).toBe('2h 5m');
  });

  test('zero minutes total -> "0m", not blank', () => {
    expect(formatStudyTime(0)).toBe('0m');
  });
});

describe('formatDueDateShort', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-15T12:00:00Z'));
  });
  afterAll(() => { jest.useRealTimers(); });

  // Timestamps use midday UTC (matching the mocked Date.now above) so the
  // "which local day is this" computation stays stable across any
  // reasonable test-runner timezone — a midnight-UTC timestamp shifts to
  // the previous local day under a negative UTC offset, which is a test
  // hazard, not something formatDueDateShort itself needs to worry about.
  test('a date before today -> "Pending" (real overdue state, not a negative day count)', () => {
    expect(formatDueDateShort('2026-08-10T12:00:00Z')).toBe('Pending');
  });

  test('today -> "Today"', () => {
    expect(formatDueDateShort('2026-08-15T12:00:00Z')).toBe('Today');
  });

  test('tomorrow -> "Tomorrow"', () => {
    expect(formatDueDateShort('2026-08-16T12:00:00Z')).toBe('Tomorrow');
  });

  test('further out -> a real short date, not a relative label', () => {
    expect(formatDueDateShort('2026-08-20T12:00:00Z')).toBe('20 Aug');
  });
});

describe('formatEventDate / formatEventTime', () => {
  test('formatEventDate renders a real short day+month', () => {
    expect(formatEventDate('2026-08-20T14:30:00Z')).toMatch(/20 Aug/);
  });

  test('formatEventTime renders a real 12-hour time with AM/PM', () => {
    expect(formatEventTime('2026-08-20T14:30:00Z')).toMatch(/\d{1,2}:\d{2}\s?(am|pm)/i);
  });
});
