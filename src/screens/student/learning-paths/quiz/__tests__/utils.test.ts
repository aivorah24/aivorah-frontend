import { normalizeQuizQuestions, playSound } from '../utils';

describe('normalizeQuizQuestions', () => {
  test('leaves fill_blank correct answers as a real trimmed string, never coerced to a number', () => {
    const [q] = normalizeQuizQuestions([{ type: 'fill_blank', question: 'The cat sat on the ___', correct: '  mat  ' }]);
    expect(q.correct).toBe('mat');
    expect(q.options).toEqual([]);
  });

  test('a real fill_blank with a non-string correct value is stringified, not dropped', () => {
    const [q] = normalizeQuizQuestions([{ type: 'fill_blank', question: 'q', correct: 5 }]);
    expect(q.correct).toBe('5');
  });

  test('maps a real letter-form MCQ answer (A-D) to its real numeric index', () => {
    const [q] = normalizeQuizQuestions([{ question: 'q', options: ['a', 'b', 'c', 'd'], correct: 'C' }]);
    expect(q.correct).toBe(2);
  });

  test('strips a real option-letter prefix with a delimiter ("A) ", "B.", "(C)", "[D]")', () => {
    const [q] = normalizeQuizQuestions([{ question: 'q', options: ['A) Apple', 'B. Banana', '(C) Cherry', '[D] Date'], correct: 0 }]);
    expect(q.options).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
  });

  test('does NOT strip a bare leading letter/digit that is not a real prefix (no delimiter)', () => {
    const [q] = normalizeQuizQuestions([{ question: 'q', options: ['Borrow', '25'], correct: 0 }]);
    expect(q.options).toEqual(['Borrow', '25']);
  });

  test('extracts real values from an interleaved 6-option letter/value layout', () => {
    const [q] = normalizeQuizQuestions([{
      question: 'q',
      options: ['A', 'First', 'B', 'Second', 'C', 'Third'],
      correct: 3, // points at "Second" in the interleaved array
    }]);
    expect(q.options).toEqual(['First', 'Second', 'Third']);
    expect(q.correct).toBe(1);
  });

  test('clamps a real out-of-range correct index into real bounds instead of crashing downstream', () => {
    const [q] = normalizeQuizQuestions([{ question: 'q', options: ['A) one', 'B) two'], correct: 9 }]);
    expect(q.correct).toBe(1);
  });

  test('defaults options to an empty array and question to an empty string when the real payload omits them', () => {
    const [q] = normalizeQuizQuestions([{ correct: 0 }]);
    expect(q.question).toBe('');
    expect(q.options).toEqual([]);
  });

  test('a real empty/undefined input list produces a real empty output list, no crash', () => {
    expect(normalizeQuizQuestions([])).toEqual([]);
    expect(normalizeQuizQuestions(undefined as any)).toEqual([]);
  });
});

describe('playSound', () => {
  const originalOS = require('react-native').Platform.OS;
  afterEach(() => { require('react-native').Platform.OS = originalOS; });

  test('is a real no-op on native platforms (no Audio global required)', () => {
    require('react-native').Platform.OS = 'ios';
    expect(() => playSound('gold')).not.toThrow();
  });

  test('constructs and plays a real Audio object with the real sound file name on web', () => {
    require('react-native').Platform.OS = 'web';
    const play = jest.fn().mockResolvedValue(undefined);
    (global as any).Audio = jest.fn().mockImplementation(() => ({ volume: 1, play }));

    playSound('silver');

    expect((global as any).Audio).toHaveBeenCalledWith(expect.stringContaining('/sounds/silver.wav'));
    expect(play).toHaveBeenCalled();
  });
});
