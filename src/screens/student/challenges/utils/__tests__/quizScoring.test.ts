import { isQuestionCorrect } from '../quizScoring';
import type { Question } from '../../types';

function mcqQuestion(overrides: Partial<Question> = {}): Question {
  return { question: 'What is 2+2?', options: ['3', '4', '5'], answer: '4', type: 'mcq', ...overrides };
}

describe('isQuestionCorrect — a null given answer', () => {
  test('is always incorrect, regardless of question type', () => {
    expect(isQuestionCorrect(mcqQuestion(), null)).toBe(false);
    expect(isQuestionCorrect(mcqQuestion({ type: 'fill_blank' }), null)).toBe(false);
    expect(isQuestionCorrect(mcqQuestion({ type: 'open_ended' }), null)).toBe(false);
  });
});

describe('isQuestionCorrect — mcq (default) type', () => {
  test('an exact match to the answer option is correct', () => {
    expect(isQuestionCorrect(mcqQuestion(), '4')).toBe(true);
  });

  test('a non-matching option is incorrect', () => {
    expect(isQuestionCorrect(mcqQuestion(), '3')).toBe(false);
  });

  test('is case-sensitive (exact option string match, no normalization)', () => {
    expect(isQuestionCorrect(mcqQuestion({ answer: 'Paris' }), 'paris')).toBe(false);
  });

  test('an undefined type defaults to mcq exact-match behavior', () => {
    expect(isQuestionCorrect(mcqQuestion({ type: undefined }), '4')).toBe(true);
  });
});

describe('isQuestionCorrect — fill_blank type', () => {
  test('matches the single answer field when no acceptAnswers list exists', () => {
    const q = mcqQuestion({ type: 'fill_blank', answer: 'Photosynthesis' });
    expect(isQuestionCorrect(q, 'photosynthesis')).toBe(true);
  });

  test('is case-insensitive and collapses internal whitespace', () => {
    const q = mcqQuestion({ type: 'fill_blank', answer: 'New Delhi' });
    expect(isQuestionCorrect(q, '  new   delhi  ')).toBe(true);
  });

  test('matches any entry in acceptAnswers, not just the primary answer', () => {
    const q = mcqQuestion({ type: 'fill_blank', answer: 'Mumbai', acceptAnswers: ['Bombay', 'Mumbai'] });
    expect(isQuestionCorrect(q, 'bombay')).toBe(true);
  });

  test('an empty acceptAnswers array falls back to the primary answer', () => {
    const q = mcqQuestion({ type: 'fill_blank', answer: 'Delhi', acceptAnswers: [] });
    expect(isQuestionCorrect(q, 'delhi')).toBe(true);
  });

  test('a non-matching typed answer is incorrect', () => {
    const q = mcqQuestion({ type: 'fill_blank', answer: 'Delhi' });
    expect(isQuestionCorrect(q, 'Mumbai')).toBe(false);
  });
});

describe('isQuestionCorrect — open_ended type', () => {
  test('any non-empty response earns credit', () => {
    const q = mcqQuestion({ type: 'open_ended' });
    expect(isQuestionCorrect(q, 'My honest reflection.')).toBe(true);
  });

  test('a whitespace-only response earns no credit', () => {
    const q = mcqQuestion({ type: 'open_ended' });
    expect(isQuestionCorrect(q, '   ')).toBe(false);
  });

  test('an empty string earns no credit', () => {
    const q = mcqQuestion({ type: 'open_ended' });
    expect(isQuestionCorrect(q, '')).toBe(false);
  });
});
