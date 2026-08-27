import React from 'react';
import { render, screen } from '@testing-library/react-native';
import QuizHeader from '../QuizHeader';
import type { Challenge } from '../../types';

jest.setTimeout(15000);

const colors: any = { borderColor: '#333', textMain: '#fff', textDim: '#666', textMuted: '#888', accentRed: '#f00', cardDark: '#111' };

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'c1', title: 'Fractions Quiz', description: '', grade: 'Grade 4', curriculum: 'NCERT',
    subject: 'Math', chapterId: null, topic: 'Fractions', difficulty: 'Easy', xpReward: 100,
    questionCount: 5, timeLimitMinutes: 10, type: 'mcq', category: 'quiz', imageUrl: null,
    assignmentId: 'asg1', status: 'assigned', score: null, xpAwarded: null, dueDate: null,
    assignedByRole: null, ...overrides,
  } as Challenge;
}

describe('QuizHeader — title and meta', () => {
  test('shows the real challenge title and time limit', async () => {
    await render(<QuizHeader activeChallenge={makeChallenge({ title: 'Water Cycle Quiz', timeLimitMinutes: 15 })} questionCount={3} timeLeft={null} hasResult={false} onClose={jest.fn()} colors={colors} />);
    expect(screen.getByText('Water Cycle Quiz')).toBeTruthy();
    expect(screen.getByText('3 questions · 15 min')).toBeTruthy();
  });

  test('falls back to the challenge\'s own questionCount when the live count is falsy (0)', async () => {
    await render(<QuizHeader activeChallenge={makeChallenge({ questionCount: 7 })} questionCount={0} timeLeft={null} hasResult={false} onClose={jest.fn()} colors={colors} />);
    expect(screen.getByText('7 questions · 10 min')).toBeTruthy();
  });
});

describe('QuizHeader — countdown timer', () => {
  test('shows a formatted mm:ss countdown when timeLeft is set and there is no result yet', async () => {
    await render(<QuizHeader activeChallenge={makeChallenge()} questionCount={5} timeLeft={125} hasResult={false} onClose={jest.fn()} colors={colors} />);
    expect(screen.getByText('02:05')).toBeTruthy();
  });

  test('pads single-digit minutes and seconds with a leading zero', async () => {
    await render(<QuizHeader activeChallenge={makeChallenge()} questionCount={5} timeLeft={5} hasResult={false} onClose={jest.fn()} colors={colors} />);
    expect(screen.getByText('00:05')).toBeTruthy();
  });

  test('no timer is shown when timeLeft is null', async () => {
    await render(<QuizHeader activeChallenge={makeChallenge()} questionCount={5} timeLeft={null} hasResult={false} onClose={jest.fn()} colors={colors} />);
    expect(screen.queryByText(/^\d{2}:\d{2}$/)).toBeNull();
  });

  test('the timer is hidden once a result exists, even if timeLeft is still set', async () => {
    await render(<QuizHeader activeChallenge={makeChallenge()} questionCount={5} timeLeft={30} hasResult={true} onClose={jest.fn()} colors={colors} />);
    expect(screen.queryByText('00:30')).toBeNull();
  });
});

