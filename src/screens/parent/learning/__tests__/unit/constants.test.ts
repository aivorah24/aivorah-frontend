import { subjectMeta, formatStudyTime, SUBJECT_META } from '../../constants';

describe('subjectMeta', () => {
  it('returns the known meta for a mapped subject', () => {
    expect(subjectMeta('Mathematics')).toBe(SUBJECT_META.Mathematics);
  });

  it('falls back to a default meta for an unmapped subject', () => {
    const meta = subjectMeta('Sanskrit');
    expect(meta.icon).toBe('book');
  });
});

describe('formatStudyTime', () => {
  it('formats zero and sub-hour minutes', () => {
    expect(formatStudyTime(0)).toBe('0m');
    expect(formatStudyTime(45)).toBe('45m');
  });

  it('formats whole hours without a minutes remainder', () => {
    expect(formatStudyTime(60)).toBe('1h');
    expect(formatStudyTime(120)).toBe('2h');
  });

  it('formats hours with a minutes remainder', () => {
    expect(formatStudyTime(90)).toBe('1h 30m');
    expect(formatStudyTime(125)).toBe('2h 5m');
  });
});
