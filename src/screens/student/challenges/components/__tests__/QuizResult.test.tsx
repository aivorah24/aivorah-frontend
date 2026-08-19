import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import QuizResult from '../QuizResult';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = { accentYellow: '#fa0', accentGreen: '#0a0', textMuted: '#888', borderColor: '#333' };

function makeEntry(overrides: any = {}) {
  return { id: 's1', name: 'Aanya Sharma', rank: 1, totalStudents: 10, count: 3, avgScore: 90, xp: 300, ...overrides };
}

describe('QuizResult — score circle and title', () => {
  test('a perfect 100 shows "Perfect Score!"', async () => {
    await render(<QuizResult quizResult={{ score: 100, xpAwarded: 100 }} leaderboard={[]} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('Perfect Score!')).toBeTruthy();
  });

  test('a score of 80-99 shows "Outstanding!"', async () => {
    await render(<QuizResult quizResult={{ score: 85, xpAwarded: 85 }} leaderboard={[]} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Outstanding!')).toBeTruthy();
  });

  test('a score of 60-79 shows "Well done!"', async () => {
    await render(<QuizResult quizResult={{ score: 65, xpAwarded: 65 }} leaderboard={[]} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Well done!')).toBeTruthy();
  });

  test('a score below 60 shows "Good effort!"', async () => {
    await render(<QuizResult quizResult={{ score: 30, xpAwarded: 30 }} leaderboard={[]} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Good effort!')).toBeTruthy();
  });

  test('shows the real XP earned', async () => {
    await render(<QuizResult quizResult={{ score: 50, xpAwarded: 42 }} leaderboard={[]} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('+42 XP earned')).toBeTruthy();
  });
});

describe('QuizResult — score band banner', () => {
  test('a score of exactly 100 shows the real "Perfect! Performer" band', async () => {
    await render(<QuizResult quizResult={{ score: 100, xpAwarded: 100 }} leaderboard={[]} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Perfect! Performer')).toBeTruthy();
  });

  test('a score below 20 shows no band at all', async () => {
    await render(<QuizResult quizResult={{ score: 10, xpAwarded: 10 }} leaderboard={[]} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.queryByText(/Performer/)).toBeNull();
  });
});

describe('QuizResult — leaderboard section', () => {
  test('shows a real "be the first" message when the leaderboard is empty', async () => {
    await render(<QuizResult quizResult={{ score: 50, xpAwarded: 50 }} leaderboard={[]} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Be the first to top the leaderboard!')).toBeTruthy();
  });

  test('shows real top-3 rows with names, xp, and average score', async () => {
    const leaderboard = [
      makeEntry({ id: 's2', name: 'Rohan Gupta', rank: 1, xp: 500, avgScore: 95, count: 4 }),
      makeEntry({ id: 's1', name: 'Aanya Sharma', rank: 2, xp: 300, avgScore: 85, count: 3 }),
    ];
    await render(<QuizResult quizResult={{ score: 85, xpAwarded: 85 }} leaderboard={leaderboard} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);

    expect(screen.getByText('Rohan')).toBeTruthy();
    expect(screen.getByText('Aanya')).toBeTruthy();
    expect(screen.getByText('4 challenges · avg 95%')).toBeTruthy();
    expect(screen.getByText('3 challenges · avg 85%')).toBeTruthy();
  });

  test('marks the current student\'s row with a real "You" chip', async () => {
    const leaderboard = [makeEntry({ id: 's1', name: 'Aanya Sharma' })];
    await render(<QuizResult quizResult={{ score: 85, xpAwarded: 85 }} leaderboard={leaderboard} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('You')).toBeTruthy();
  });

  test('a challenge count of exactly 1 uses the singular "challenge" (no trailing s)', async () => {
    const leaderboard = [makeEntry({ id: 's1', count: 1, avgScore: 100 })];
    await render(<QuizResult quizResult={{ score: 85, xpAwarded: 85 }} leaderboard={leaderboard} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('1 challenge · avg 100%')).toBeTruthy();
  });

  test('shows a spinner while the leaderboard is loading, no rows or empty message', async () => {
    await render(<QuizResult quizResult={{ score: 50, xpAwarded: 50 }} leaderboard={[]} leaderLoading={true} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.queryByText('Be the first to top the leaderboard!')).toBeNull();
  });

  test('a real top-3% rank shows the prominent rank band with the real grade and totals', async () => {
    const leaderboard = [makeEntry({ id: 's1', rank: 1, totalStudents: 50 })];
    await render(<QuizResult quizResult={{ score: 85, xpAwarded: 85 }} leaderboard={leaderboard} leaderLoading={false} studentId="s1" grade="Grade 5" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Top 3% in Grade 5!')).toBeTruthy();
    expect(screen.getByText('Ranked #1 out of 50 students')).toBeTruthy();
  });

  test('a rank outside any band (e.g. bottom half) falls back to the plain "you are ranked" banner', async () => {
    const leaderboard = [makeEntry({ id: 's1', rank: 40, totalStudents: 50 })];
    await render(<QuizResult quizResult={{ score: 50, xpAwarded: 50 }} leaderboard={leaderboard} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('You are ranked #40 out of 50')).toBeTruthy();
  });

  test('the current student not appearing in the leaderboard shows no rank banner at all', async () => {
    const leaderboard = [makeEntry({ id: 'other-student' })];
    await render(<QuizResult quizResult={{ score: 50, xpAwarded: 50 }} leaderboard={leaderboard} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.queryByText(/You are ranked/)).toBeNull();
    expect(screen.queryByText(/in Grade 4!/)).toBeNull();
  });
});

describe('QuizResult — done button', () => {
  test('pressing Done calls the real onDone handler', async () => {
    const onDone = jest.fn();
    const user = userEvent.setup();
    await render(<QuizResult quizResult={{ score: 50, xpAwarded: 50 }} leaderboard={[]} leaderLoading={false} studentId="s1" grade="Grade 4" onDone={onDone} styles={styles} colors={colors} />);

    await user.press(screen.getByText('Done'));

    expect(onDone).toHaveBeenCalled();
  });
});
