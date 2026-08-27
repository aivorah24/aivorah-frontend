import { getGreeting, todayISO, formatStudyTime, median, formatRelativeTime } from '../../utils/dashboardHelpers';

describe('getGreeting', () => {
  afterEach(() => jest.useRealTimers());

  test('before noon -> Good morning', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-24T08:00:00'));
    expect(getGreeting()).toBe('Good morning');
  });

  test('afternoon (12-17) -> Good afternoon', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-24T14:00:00'));
    expect(getGreeting()).toBe('Good afternoon');
  });

  test('17:00 or later -> Good evening', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-24T19:00:00'));
    expect(getGreeting()).toBe('Good evening');
  });
});

describe('todayISO', () => {
  test('returns the date portion of the current time as YYYY-MM-DD', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-24T19:00:00Z'));
    expect(todayISO()).toBe('2026-08-24');
    jest.useRealTimers();
  });
});

describe('formatStudyTime', () => {
  test('0 minutes -> "0m"', () => {
    expect(formatStudyTime(0)).toBe('0m');
  });
  test('under an hour -> "Nm"', () => {
    expect(formatStudyTime(45)).toBe('45m');
  });
  test('exact hour -> "Nh"', () => {
    expect(formatStudyTime(120)).toBe('2h');
  });
  test('hour + minutes -> "Nh Mm"', () => {
    expect(formatStudyTime(125)).toBe('2h 5m');
  });
});

describe('median', () => {
  test('empty array -> 0', () => {
    expect(median([])).toBe(0);
  });
  test('single value -> that value', () => {
    expect(median([7])).toBe(7);
  });
  test('odd length -> the middle value', () => {
    expect(median([5, 1, 3])).toBe(3);
  });
  test('even length -> rounded average of the two middle values', () => {
    expect(median([1, 2, 3, 4])).toBe(3); // (2+3)/2 = 2.5 -> rounds to 3
  });
  test('resists a single outlier skewing the result', () => {
    // one 23h (1380min) grinder shouldn't drag the "typical" student's time up much
    expect(median([10, 15, 20, 1380])).toBe(18); // (15+20)/2 = 17.5 -> rounds to 18
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-08-24T12:00:00Z')));
  afterEach(() => jest.useRealTimers());

  test('under a minute ago -> "Just now"', () => {
    expect(formatRelativeTime('2026-08-24T11:59:30Z')).toBe('Just now');
  });
  test('under an hour ago -> "Nm ago"', () => {
    expect(formatRelativeTime('2026-08-24T11:45:00Z')).toBe('15m ago');
  });
  test('under a day ago -> "Nh ago"', () => {
    expect(formatRelativeTime('2026-08-24T08:00:00Z')).toBe('4h ago');
  });
  test('exactly one day ago -> "Yesterday"', () => {
    expect(formatRelativeTime('2026-08-23T12:00:00Z')).toBe('Yesterday');
  });
  test('a few days ago -> "Nd ago"', () => {
    expect(formatRelativeTime('2026-08-20T12:00:00Z')).toBe('4d ago');
  });
  test('a week or more ago -> falls back to the ISO date', () => {
    expect(formatRelativeTime('2026-08-01T12:00:00Z')).toBe('2026-08-01');
  });
});
