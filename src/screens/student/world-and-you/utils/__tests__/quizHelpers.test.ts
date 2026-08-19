import { categoryIcon, normalizeQuizQuestions, quizCacheKey } from '../quizHelpers';

describe('categoryIcon', () => {
  test('returns the real mapped icon for a known category', () => {
    // Pull a real key straight from CATEGORY_ICONS to avoid guessing its contents.
    const { CATEGORY_ICONS } = require('../../constants');
    const [knownCategory, knownIcon] = Object.entries(CATEGORY_ICONS)[0] as [string, any];
    expect(categoryIcon(knownCategory)).toBe(knownIcon);
  });

  test('falls back to "star" for an unknown category', () => {
    expect(categoryIcon('Not A Real Category')).toBe('star');
  });
});

describe('normalizeQuizQuestions', () => {
  test('a letter correct answer is converted to its 0-based index', () => {
    const result = normalizeQuizQuestions([{ question: 'Q1', options: ['A', 'B', 'C', 'D'], correct: 'C' }]);
    expect(result[0].correct).toBe(2);
  });

  test('a numeric correct index passes through unchanged', () => {
    const result = normalizeQuizQuestions([{ question: 'Q1', options: ['A', 'B', 'C', 'D'], correct: 3 }]);
    expect(result[0].correct).toBe(3);
  });

  test('strips a real "A. " style prefix from option text', () => {
    const result = normalizeQuizQuestions([{ question: 'Q1', options: ['A. Paris', 'B. London', 'C. Rome', 'D. Berlin'], correct: 0 }]);
    expect(result[0].options).toEqual(['Paris', 'London', 'Rome', 'Berlin']);
  });

  test('does NOT strip a real leading letter with no separator', () => {
    const result = normalizeQuizQuestions([{ question: 'Q1', options: ['Big bruise', 'Small cut', 'No injury', 'Broken bone'], correct: 0 }]);
    expect(result[0].options).toEqual(['Big bruise', 'Small cut', 'No injury', 'Broken bone']);
  });

  test('unwraps a doubled options array (letter badges at even indices)', () => {
    const result = normalizeQuizQuestions([{ question: 'Q1', options: ['A', 'Paris', 'B', 'London', 'C', 'Rome', 'D', 'Berlin'], correct: 0 }]);
    expect(result[0].options).toEqual(['Paris', 'London', 'Rome', 'Berlin']);
  });

  test('clamps an out-of-range correct index to the last valid option', () => {
    const result = normalizeQuizQuestions([{ question: 'Q1', options: ['A', 'B'], correct: 9 }]);
    expect(result[0].correct).toBe(1);
  });

  test('an empty/undefined input returns an empty array', () => {
    expect(normalizeQuizQuestions(undefined as any)).toEqual([]);
  });
});

describe('quizCacheKey', () => {
  test('produces a real deterministic key from the headline and today\'s date, stripping punctuation', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(quizCacheKey('Robot Helps in Surgery!')).toBe(`quiz_done_robothelpsinsurgery_${today}`);
  });

  test('truncates a very long headline to the first 24 hashed characters', () => {
    const key = quizCacheKey('A'.repeat(50));
    const hashPart = key.split('_')[2];
    expect(hashPart.length).toBe(24);
  });

  test('two different headlines produce two different keys', () => {
    expect(quizCacheKey('Headline One')).not.toBe(quizCacheKey('Headline Two'));
  });
});
