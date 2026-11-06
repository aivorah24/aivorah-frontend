import {
  PERIOD_OPTIONS, DEFAULT_PERIOD, localDateKey, formatDateKey,
  topPerformersTitle, xpStatLabel, daysLeftInPeriod,
} from '../../utils/leaderboardPeriod';

describe('leaderboardPeriod', () => {
  it('offers Today, This Week, This Month, Custom Date and All Time, defaulting to This Week', () => {
    expect(PERIOD_OPTIONS.map(o => o.label)).toEqual(['Today', 'This Week', 'This Month', 'Custom Date', 'All Time']);
    expect(DEFAULT_PERIOD).toBe('week');
  });

  it('localDateKey uses the local calendar day, zero-padded', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('formatDateKey reads like "5 Nov 2026"', () => {
    expect(formatDateKey('2026-11-05')).toBe('5 Nov 2026');
  });

  it('titles follow the selected period', () => {
    expect(topPerformersTitle('today', '')).toBe('Top Performers Today');
    expect(topPerformersTitle('week', '')).toBe('Top Performers This Week');
    expect(topPerformersTitle('month', '')).toBe('Top Performers This Month');
    expect(topPerformersTitle('custom', '2026-10-21')).toBe('Top Performers on 21 Oct 2026');
    expect(topPerformersTitle('all', '')).toBe('Top Performers (All Time)');
    expect(xpStatLabel('today', '')).toBe('XP Earned Today');
    expect(xpStatLabel('custom', '2026-10-21')).toBe('XP Earned on 21 Oct 2026');
    expect(xpStatLabel('all', '')).toBe('Total XP Earned');
  });

  it('days left counts today and runs to Sunday / the month end', () => {
    expect(daysLeftInPeriod('week', new Date(2026, 10, 2))).toBe(7);   // Monday
    expect(daysLeftInPeriod('week', new Date(2026, 10, 5))).toBe(4);   // Thursday
    expect(daysLeftInPeriod('week', new Date(2026, 10, 8))).toBe(1);   // Sunday
    expect(daysLeftInPeriod('month', new Date(2026, 10, 6))).toBe(25); // 6..30 Nov
    expect(daysLeftInPeriod('month', new Date(2028, 1, 29))).toBe(1);  // leap day
  });
});
