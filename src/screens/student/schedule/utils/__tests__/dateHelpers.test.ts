import {
  deriveTypeFromTag, calcEventTop, calcEventHeight, calcEndTime, typeColors,
  toTitleCase, fmtHour12, dateISO, buildWeek, buildMonthCalendar,
} from '../dateHelpers';

describe('deriveTypeFromTag', () => {
  test('empty/falsy tag -> "study"', () => {
    expect(deriveTypeFromTag('')).toBe('study');
  });

  test.each([
    ['Live Class', 'lesson'],
    ['Video meeting', 'lesson'],
    ['AI Challenge', 'challenge'],
    ['Deadline', 'deadline'],
    ['Worksheet', 'assignment'],
    ['Assignment', 'assignment'],
    ['Working Day', 'break'],
    ['Holidays and vacations', 'study'], // no keyword match -> falls to default
  ])('%s -> %s', (tag, expected) => {
    expect(deriveTypeFromTag(tag)).toBe(expected);
  });

  test.each([
    ['Study Session', 'study'],
    ['Class / Lesson', 'lesson'],
    ['Homework', 'assignment'],
    ['Challenge', 'practice'], // timed session, not an all-day challenge deadline
    ['Quick Task', 'study'],
    ['Learning Activity', 'study'],
    ['Break', 'break'],
    ['Other', 'study'],
  ])('student option %s -> %s', (tag, expected) => {
    expect(deriveTypeFromTag(tag)).toBe(expected);
  });

  test('a student-scheduled challenge gets the challenge colour', () => {
    expect(typeColors('practice')).toEqual(typeColors('challenge'));
  });

  test('matching is case-insensitive', () => {
    expect(deriveTypeFromTag('LIVE CLASS')).toBe('lesson');
  });
});

describe('calcEventTop', () => {
  test('the timeline start hour (midnight) is at position 0', () => {
    expect(calcEventTop('00:00')).toBe(0);
  });

  test('a full hour offset multiplies by HOUR_HEIGHT (56px)', () => {
    expect(calcEventTop('01:00')).toBe(56);
  });

  test('a half-hour offset adds half of HOUR_HEIGHT', () => {
    expect(calcEventTop('01:30')).toBe(56 + 28);
  });
});

describe('calcEventHeight', () => {
  test('no endTime -> defaults to exactly one hour tall', () => {
    expect(calcEventHeight('10:00')).toBe(56);
  });

  test('a 30-minute event is half the hour height, but never below the 40px minimum', () => {
    expect(calcEventHeight('10:00', '10:30')).toBe(40); // 28 < 40 floor
  });

  test('a 2-hour event is proportionally taller', () => {
    expect(calcEventHeight('10:00', '12:00')).toBe(112);
  });

  test('endTime before or equal to startTime (invalid/zero duration) falls back to the default hour height', () => {
    expect(calcEventHeight('10:00', '10:00')).toBe(56);
    expect(calcEventHeight('10:00', '09:00')).toBe(56);
  });
});

describe('calcEndTime', () => {
  test('adds a real known duration to the start time', () => {
    expect(calcEndTime('10:00', '1 hr')).toBe('11:00');
  });

  test('an unrecognized duration key falls back to 60 minutes', () => {
    expect(calcEndTime('10:00', 'not-a-real-duration')).toBe('11:00');
  });

  test('wraps past midnight correctly', () => {
    expect(calcEndTime('23:30', '1 hr')).toBe('00:30');
  });

  test('a fractional-hour duration (1.5 hrs) computes real minutes', () => {
    expect(calcEndTime('09:00', '1.5 hrs')).toBe('10:30');
  });
});

describe('typeColors', () => {
  test('a known type returns its real 3-tuple [accent, fill, text]', () => {
    expect(typeColors('lesson')).toEqual(['#7FC29B', '#E4F3E9', '#2E7D5B']);
  });

  test('an unknown type falls back to the "study" (sky) palette', () => {
    expect(typeColors('unknown-type')).toEqual(['#7FB2D6', '#E1EEFA', '#2E6285']);
  });
});

describe('toTitleCase', () => {
  test('capitalizes the first letter of every word', () => {
    expect(toTitleCase('quick task')).toBe('Quick Task');
  });

  test('empty/undefined input -> empty string, no crash', () => {
    expect(toTitleCase('')).toBe('');
    expect(toTitleCase(undefined as any)).toBe('');
  });
});

describe('fmtHour12', () => {
  test.each([
    ['00:00', '12 am'],
    ['08:00', '8 am'],
    ['12:00', '12 pm'],
    ['13:00', '1 pm'],
    ['23:00', '11 pm'],
  ])('%s -> %s', (input, expected) => {
    expect(fmtHour12(input)).toBe(expected);
  });
});

describe('dateISO', () => {
  test('formats a real Date as YYYY-MM-DD', () => {
    expect(dateISO(new Date('2026-04-15T10:00:00Z'))).toBe('2026-04-15');
  });
});

describe('buildWeek', () => {
  // Noon (not midnight) avoids a local-midnight Date rolling back a day when
  // dateISO() converts to UTC via toISOString() on machines behind UTC.
  test('always starts on Monday, regardless of which day of the week the base date is', () => {
    const week = buildWeek(new Date('2026-04-15T12:00:00')); // a Wednesday
    expect(week[0].day).toBe('MON');
    expect(week[6].day).toBe('SUN');
    expect(week).toHaveLength(7);
  });

  test('a base date that IS already Monday stays as the first day', () => {
    const week = buildWeek(new Date('2026-04-13T12:00:00')); // a Monday
    expect(week[0].date).toBe(13);
  });

  test('dates are sequential across the week, including month boundaries', () => {
    const week = buildWeek(new Date('2026-03-31T12:00:00')); // Tuesday, crosses into April
    const isos = week.map(d => d.iso);
    expect(isos[0]).toBe('2026-03-30');
    expect(isos[6]).toBe('2026-04-05');
  });
});

describe('buildMonthCalendar', () => {
  test('every week row has exactly 7 cells', () => {
    const weeks = buildMonthCalendar(2026, 4);
    weeks.forEach(w => expect(w).toHaveLength(7));
  });

  test('all real day numbers 1..N appear exactly once, in order', () => {
    const weeks = buildMonthCalendar(2026, 4); // April has 30 days
    const days = weeks.flat().filter((d): d is number => d !== null);
    expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  test('leading cells before day 1 are null, padding to the correct weekday column', () => {
    const weeks = buildMonthCalendar(2026, 4); // April 1, 2026 is a Wednesday -> 2 leading nulls (Mon, Tue)
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toBeNull();
    expect(weeks[0][2]).toBe(1);
  });

  test('February in a leap year has 29 real days', () => {
    const weeks = buildMonthCalendar(2028, 2);
    const days = weeks.flat().filter((d): d is number => d !== null);
    expect(days[days.length - 1]).toBe(29);
  });
});
