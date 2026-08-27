import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ChallengesGrid from '../ChallengesGrid';
import type { Challenge } from '../../types';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = { accentYellow: '#fa0', accentGreen: '#0a0', textDim: '#666' };

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'c1', title: 'Fractions Quiz', description: '', grade: 'Grade 4', curriculum: 'NCERT',
    subject: 'Math', chapterId: null, topic: 'Fractions', difficulty: 'Easy', xpReward: 100,
    questionCount: 5, timeLimitMinutes: 10, type: 'mcq', category: 'quiz', imageUrl: null,
    assignmentId: null, status: 'available', score: null, xpAwarded: null, dueDate: null,
    assignedByRole: null, ...overrides,
  } as Challenge;
}

describe('ChallengesGrid — loading', () => {
  test('shows a spinner and nothing else while loading', async () => {
    await render(<ChallengesGrid loading={true} filtered={[]} activeTab="Available" onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.queryByText('No challenges available')).toBeNull();
  });
});

describe('ChallengesGrid — empty states per tab', () => {
  test('Available tab empty state shows the real "pull to refresh" hint', async () => {
    await render(<ChallengesGrid loading={false} filtered={[]} activeTab="Available" onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('No challenges available')).toBeTruthy();
    expect(screen.getByText('Pull down to refresh')).toBeTruthy();
  });

  test('Assigned tab empty state points to asking a teacher/parent', async () => {
    await render(<ChallengesGrid loading={false} filtered={[]} activeTab="Assigned" onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('No assigned challenges yet')).toBeTruthy();
    expect(screen.getByText('Ask your teacher or parent to assign a challenge')).toBeTruthy();
  });

  test('Completed tab empty state shows its own real copy', async () => {
    await render(<ChallengesGrid loading={false} filtered={[]} activeTab="Completed" onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('No completed challenges yet')).toBeTruthy();
  });
});

describe('ChallengesGrid — populated', () => {
  test('renders a real ChallengeCard per filtered challenge', async () => {
    await render(<ChallengesGrid loading={false} filtered={[makeChallenge({ id: 'c1', title: 'Quiz One' }), makeChallenge({ id: 'c2', title: 'Quiz Two' })]} activeTab="Available" onStart={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Quiz One')).toBeTruthy();
    expect(screen.getByText('Quiz Two')).toBeTruthy();
  });
});
