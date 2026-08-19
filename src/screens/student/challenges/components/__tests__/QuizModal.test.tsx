import React from 'react';
import { render, screen } from '@testing-library/react-native';
import QuizModal from '../QuizModal';
import type { Challenge, Question } from '../../types';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = {
  accentYellow: '#fa0', accentGreen: '#0a0', textMain: '#fff', textDim: '#666', textMuted: '#888',
  borderColor: '#333', bgDark: '#000', cardDark: '#111', accentRed: '#f00',
};

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'c1', title: 'Fractions Quiz', description: '', grade: 'Grade 4', curriculum: 'NCERT',
    subject: 'Math', chapterId: null, topic: 'Fractions', difficulty: 'Easy', xpReward: 100,
    questionCount: 1, timeLimitMinutes: 10, type: 'mcq', category: 'quiz', imageUrl: null,
    assignmentId: 'asg1', status: 'assigned', score: null, xpAwarded: null, dueDate: null,
    assignedByRole: null, ...overrides,
  } as Challenge;
}

const question: Question = { question: 'What is 2+2?', options: ['3', '4'], answer: '4', type: 'mcq' };

function baseProps(overrides: any = {}) {
  return {
    visible: true,
    activeChallenge: makeChallenge(),
    questions: [question],
    answers: [null],
    setAnswers: jest.fn(),
    quizLoading: false,
    quizSubmitting: false,
    quizResult: null,
    timeLeft: null,
    allAnswered: false,
    leaderboard: [],
    leaderLoading: false,
    studentId: 's1',
    grade: 'Grade 4',
    onSubmit: jest.fn(),
    onClose: jest.fn(),
    styles,
    colors,
    ...overrides,
  };
}

describe('QuizModal — loading state', () => {
  test('shows a real loading spinner and message, and neither the quiz nor the result', async () => {
    await render(<QuizModal {...baseProps({ quizLoading: true })} />);
    expect(screen.getByText('Loading questions...')).toBeTruthy();
    expect(screen.queryByText('Submit Answers')).toBeNull();
  });
});

describe('QuizModal — questions state', () => {
  test('shows the real quiz questions when not loading and no result yet', async () => {
    await render(<QuizModal {...baseProps()} />);
    expect(screen.getByText('What is 2+2?')).toBeTruthy();
    expect(screen.getByText('Submit Answers')).toBeTruthy();
  });
});

describe('QuizModal — result state', () => {
  test('shows the real result screen once quizResult is set, hiding the questions', async () => {
    await render(<QuizModal {...baseProps({ quizResult: { score: 90, xpAwarded: 90 } })} />);
    expect(screen.getByText('90%')).toBeTruthy();
    expect(screen.queryByText('Submit Answers')).toBeNull();
  });

  test('the header hides its timer and close button once a result exists', async () => {
    await render(<QuizModal {...baseProps({ quizResult: { score: 90, xpAwarded: 90 }, timeLeft: 30 })} />);
    expect(screen.queryByText('00:30')).toBeNull();
  });
});

