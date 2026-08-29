// Pure-function unit tests for scheduleUtils.ts — no rendering needed.
import {
  deriveTypeFromTag,
  calcEventTop,
  calcEventHeight,
  calcEndTime,
  typeColors,
  tagColors,
  dateISO,
  buildWeek,
  fmtHour12,
} from '../../utils/scheduleUtils';
import { HOUR_HEIGHT, TIMELINE_START_HOUR } from '../../constants';

describe('deriveTypeFromTag', () => {
  test('empty/falsy tag falls back to study', () => {
    expect(deriveTypeFromTag('')).toBe('study');
  });
  test('lesson/live class/video tags map to lesson', () => {
    expect(deriveTypeFromTag('Live Class / Lesson')).toBe('lesson');
    expect(deriveTypeFromTag('Video meeting')).toBe('lesson');
  });
  test('challenge tag maps to challenge', () => {
    expect(deriveTypeFromTag('AI Challenge')).toBe('challenge');
  });
  test('deadline tag maps to deadline', () => {
    expect(deriveTypeFromTag('Deadline')).toBe('deadline');
  });
  test('worksheet/assignment tags map to assignment', () => {
    expect(deriveTypeFromTag('Worksheet / Assignment')).toBe('assignment');
  });
  test('break/working day tags map to break', () => {
    expect(deriveTypeFromTag('Working Day / Break')).toBe('break');
  });
  test('unrecognized tag falls back to study', () => {
    expect(deriveTypeFromTag('Something Else')).toBe('study');
  });
  test('is case-insensitive', () => {
    expect(deriveTypeFromTag('DEADLINE')).toBe('deadline');
  });
});

describe('calcEventTop', () => {
  test('at the timeline start hour, top is 0', () => {
    expect(calcEventTop(`${String(TIMELINE_START_HOUR).padStart(2, '0')}:00`)).toBe(0);
  });
  test('one hour after start adds HOUR_HEIGHT', () => {
    const h = String(TIMELINE_START_HOUR + 1).padStart(2, '0');
    expect(calcEventTop(`${h}:00`)).toBe(HOUR_HEIGHT);
  });
  test('minutes contribute a fraction of HOUR_HEIGHT', () => {
    const h = String(TIMELINE_START_HOUR).padStart(2, '0');
    expect(calcEventTop(`${h}:30`)).toBeCloseTo(HOUR_HEIGHT / 2, 5);
  });
});

describe('calcEventHeight', () => {
  test('no endTime defaults to HOUR_HEIGHT', () => {
    expect(calcEventHeight('09:00')).toBe(HOUR_HEIGHT);
  });
  test('zero/negative duration falls back to HOUR_HEIGHT', () => {
    expect(calcEventHeight('09:00', '09:00')).toBe(HOUR_HEIGHT);
    expect(calcEventHeight('09:00', '08:00')).toBe(HOUR_HEIGHT);
  });
  test('a normal duration scales with HOUR_HEIGHT', () => {
    expect(calcEventHeight('09:00', '10:00')).toBe(HOUR_HEIGHT);
  });
  test('short durations are floored at the 46px minimum', () => {
    // 15 min at HOUR_HEIGHT=56 would be 14px, floored to 46.
    expect(calcEventHeight('09:00', '09:15')).toBe(46);
  });
});

describe('calcEndTime', () => {
  test('adds a known duration', () => {
    expect(calcEndTime('09:00', '1 hr')).toBe('10:00');
  });
  test('adds a fractional-hour duration', () => {
    expect(calcEndTime('09:00', '1.5 hrs')).toBe('10:30');
  });
  test('unknown duration key defaults to 60 minutes', () => {
    expect(calcEndTime('09:00', 'bogus')).toBe('10:00');
  });
  test('wraps past midnight', () => {
    expect(calcEndTime('23:30', '1 hr')).toBe('00:30');
  });
});

describe('typeColors', () => {
  test('returns the mapped triple for a known type', () => {
    expect(typeColors('deadline')).toEqual(['#B84A3A', '#F5DDD9', '#7A2A1E']);
  });
  test('unknown type falls back to the lesson/default triple', () => {
    expect(typeColors('not-a-real-type')).toEqual(['#9C844A', '#F5EDDA', '#6B5A30']);
  });
});

describe('tagColors', () => {
  test('a tag matching an ALL_TAGS key returns that tag color for all three slots', () => {
    const [accent, fill, text] = tagColors('AI Challenge', 'challenge');
    expect(accent).toBe('#6B5BA8');
    expect(text).toBe('#6B5BA8');
    expect(fill).toBe('#6B5BA8' + '22');
  });
  test('null/undefined tag falls back to typeColors(type)', () => {
    expect(tagColors(null, 'deadline')).toEqual(typeColors('deadline'));
    expect(tagColors(undefined, 'study')).toEqual(typeColors('study'));
  });
  test('a tag that matches no known key falls back to typeColors(type)', () => {
    expect(tagColors('Totally Unknown Tag', 'break')).toEqual(typeColors('break'));
  });
});

describe('dateISO', () => {
  test('formats a Date as YYYY-MM-DD', () => {
    const d = new Date(Date.UTC(2026, 0, 5)); // Jan 5, 2026
    expect(dateISO(d)).toBe('2026-01-05');
  });
});

// Bug #19: week grid changed from Monday-first to Sunday-first per explicit
// user request.
describe('buildWeek', () => {
  test('always builds Sunday through Saturday, 7 days', () => {
    // Wednesday, Jan 7 2026
    const week = buildWeek(new Date(2026, 0, 7));
    expect(week).toHaveLength(7);
    expect(week[0].day).toBe('SUN');
    expect(week[6].day).toBe('SAT');
    expect(week[0].date).toBe(4);
    expect(week[6].date).toBe(10);
  });
  test('a Saturday base date rolls back to the Sunday that starts that week', () => {
    // Saturday, Jan 10 2026 belongs to the week of Sun Jan 4.
    const sunday = new Date(2026, 0, 4);
    const saturday = new Date(2026, 0, 10);
    const week = buildWeek(saturday);
    expect(week[0].iso).toBe(dateISO(sunday));
    expect(week[6].iso).toBe(dateISO(saturday));
  });
  test('a Sunday base date is itself day 0', () => {
    const sunday = new Date(2026, 0, 4);
    const week = buildWeek(sunday);
    expect(week[0].iso).toBe(dateISO(sunday));
  });
});

describe('fmtHour12', () => {
  test('midnight is 12 am', () => {
    expect(fmtHour12('00:00')).toBe('12 am');
  });
  test('noon is 12 pm', () => {
    expect(fmtHour12('12:00')).toBe('12 pm');
  });
  test('morning hour formats as am', () => {
    expect(fmtHour12('09:00')).toBe('9 am');
  });
  test('afternoon hour formats as pm', () => {
    expect(fmtHour12('15:00')).toBe('3 pm');
  });
});
