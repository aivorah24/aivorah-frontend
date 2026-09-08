import { formatMinutes, formatHour } from '../../utils';

describe('formatMinutes', () => {
  it('formats sub-hour durations as minutes', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(45)).toBe('45 min');
  });

  it('formats whole hours without a minutes remainder', () => {
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(120)).toBe('2h');
  });

  it('formats hours with a minutes remainder', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(125)).toBe('2h 5m');
  });
});

describe('formatHour', () => {
  it('formats midnight as 12:00 AM', () => {
    expect(formatHour(0)).toBe('12:00 AM');
  });

  it('formats morning hours as AM', () => {
    expect(formatHour(9)).toBe('9:00 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatHour(12)).toBe('12:00 PM');
  });

  it('formats afternoon/evening hours as PM', () => {
    expect(formatHour(14)).toBe('2:00 PM');
    expect(formatHour(21)).toBe('9:00 PM');
    expect(formatHour(23)).toBe('11:00 PM');
  });
});
