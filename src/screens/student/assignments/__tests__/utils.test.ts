import { formatDueDate, getStamp } from '../utils';

describe('formatDueDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-19T10:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('a past due date returns the real "Ready to submit" label, not overdue', () => {
    const result = formatDueDate('2026-08-15');
    expect(result.label).toBe('Ready to submit');
    expect(result.isOverdue).toBe(false);
  });

  test('a due date of today returns the real "Due today" label', () => {
    const result = formatDueDate('2026-08-19');
    expect(result.label).toBe('Due today');
    expect(result.colorKey).toBe('accentYellow');
  });

  test('a due date of tomorrow returns the real "Due tomorrow" label', () => {
    const result = formatDueDate('2026-08-20');
    expect(result.label).toBe('Due tomorrow');
  });

  test('a due date further out formats the real short date and uses the muted color', () => {
    const result = formatDueDate('2026-08-25');
    expect(result.label).toBe('Due 25 Aug');
    expect(result.colorKey).toBe('textMuted');
  });
});

describe('getStamp', () => {
  test('a null score falls back to the real "Keep Going!" stamp', () => {
    expect(getStamp(null).id).toBe('keepgoing');
  });

  test('a score of exactly 80 unlocks the real "Amazing Storyteller" stamp (boundary)', () => {
    expect(getStamp(80).id).toBe('amazing');
  });

  test('a score of 79 falls just short, gets the real "Hardworking Farmer" stamp', () => {
    expect(getStamp(79).id).toBe('hardworking');
  });

  test('a score of exactly 60 unlocks the real "Hardworking Farmer" stamp (boundary)', () => {
    expect(getStamp(60).id).toBe('hardworking');
  });

  test('a score of 0 still gets the real "Keep Going!" stamp, not undefined', () => {
    expect(getStamp(0).id).toBe('keepgoing');
  });
});
