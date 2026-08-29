import React from 'react';
import { render, screen } from '@testing-library/react-native';
import StatsRow from '../StatsRow';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = { accentYellow: '#fa0', accentGreen: '#0a0', accentRed: '#f00' };

describe('StatsRow — real stat values', () => {
  test('renders the real XP, challenges, and streak values', async () => {
    await render(<StatsRow stats={{ xpPoints: 1500, challengesCompleted: 4, currentStreak: 7 }} styles={styles} colors={colors} />);
    expect(screen.getByText('1,500')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
  });

  test('zero values render as literal 0s, not blank', async () => {
    await render(<StatsRow stats={{ xpPoints: 0, challengesCompleted: 0, currentStreak: 0 }} styles={styles} colors={colors} />);
    expect(screen.getAllByText('0').length).toBe(2);
    expect(screen.getByText('0d')).toBeTruthy();
  });

  test('shows the real labels — no Topics Done card', async () => {
    await render(<StatsRow stats={{ xpPoints: 0, challengesCompleted: 0, currentStreak: 0 }} styles={styles} colors={colors} />);
    expect(screen.getByText('Total XP')).toBeTruthy();
    expect(screen.getByText('Challenges')).toBeTruthy();
    expect(screen.getByText('Streak')).toBeTruthy();
    expect(screen.queryByText('Topics Done')).toBeNull();
  });
});
