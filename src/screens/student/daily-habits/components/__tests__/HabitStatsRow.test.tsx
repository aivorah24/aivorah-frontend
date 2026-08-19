import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HabitStatsRow from '../HabitStatsRow';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });

describe('HabitStatsRow', () => {
  test('shows the real streak, total coins, and completed/total counts', async () => {
    await render(<HabitStatsRow streak={5} totalCoins={120} completedCount={2} totalHabits={4} textMuted="#888" styles={styles} />);
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('2/4')).toBeTruthy();
  });

  test('shows the real labels', async () => {
    await render(<HabitStatsRow streak={0} totalCoins={0} completedCount={0} totalHabits={0} textMuted="#888" styles={styles} />);
    expect(screen.getByText('Day Streak')).toBeTruthy();
    expect(screen.getByText('Total Coins')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });
});
