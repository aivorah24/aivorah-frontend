import { daysUntil, formatDate, stripGradePrefix, gradeFromLabel } from '../../utils/helpers';

describe('daysUntil', () => {
  test('a date in the past is overdue', () => {
    const past = new Date(Date.now() - 3 * 86400000).toISOString();
    const result = daysUntil(past);
    expect(result.overdue).toBe(true);
    expect(result.label).toMatch(/overdue$/);
  });

  test('today is "Due today", not overdue', () => {
    const today = new Date().toISOString();
    const result = daysUntil(today);
    expect(result.overdue).toBe(false);
    expect(result.label).toBe('Due today');
  });

  test('a future date reports days remaining', () => {
    const future = new Date(Date.now() + 5 * 86400000 + 3600000).toISOString();
    const result = daysUntil(future);
    expect(result.overdue).toBe(false);
    expect(result.label).toBe('Due in 6d');
  });
});

describe('formatDate', () => {
  test('formats as "Mon D, YYYY"', () => {
    expect(formatDate('2026-03-15T00:00:00.000Z')).toMatch(/Mar \d{1,2}, 2026/);
  });
});

describe('stripGradePrefix', () => {
  test('strips a leading "PYP 4" banner', () => {
    expect(stripGradePrefix('PYP 4: Area and Perimeter')).toBe('Area and Perimeter');
  });
  test('strips a leading "Grade: 5" banner', () => {
    expect(stripGradePrefix('Grade: 5 - Fractions')).toBe('Fractions');
  });
  test('strips a leading "Class 3" banner', () => {
    expect(stripGradePrefix('Class 3 – Multiplication')).toBe('Multiplication');
  });
  test('leaves text with no grade banner untouched', () => {
    expect(stripGradePrefix('Area and Perimeter')).toBe('Area and Perimeter');
  });
  test('handles empty/undefined input', () => {
    expect(stripGradePrefix('')).toBe('');
    expect(stripGradePrefix(undefined as any)).toBe('');
  });
});

describe('gradeFromLabel', () => {
  test('a PYP label picks the matching grade pill', () => {
    expect(gradeFromLabel('PYP 4', ['Grade 3', 'Grade 4', 'Grade 6'])).toBe('Grade 4');
  });

  test('a grade the teacher does not teach is still selected, not left on their default', () => {
    expect(gradeFromLabel('Grade 4', ['Grade 6'])).toBe('Grade 4');
  });

  test('Grade 1 does not match Grade 10–12', () => {
    expect(gradeFromLabel('Grade 1', ['Grade 10', 'Grade 11', 'Grade 12'])).toBe('Grade 1');
  });

  test('a non-numeric grade is kept as written', () => {
    expect(gradeFromLabel('UKG', ['LKG', 'UKG'])).toBe('UKG');
  });
});
