jest.setTimeout(15000);

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import StatsRow from '../StatsRow';

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = { accentYellow: '#fa0', accentGreen: '#0a0', accentRed: '#f00' };

describe('StatsRow — real stat values', () => {
  test('renders the real XP, challenges, topics, and streak values', async () => {
    await render(<StatsRow stats={{ xpPoints: 1500, challengesCompleted: 4, completedTopics: ['a', 'b'], currentStreak: 7 }} styles={styles} colors={colors} />);
    expect(screen.getByText('1,500')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('7d')).toBeTruthy();
  });

  test('a missing completedTopics field defaults the Topics Done count to 0', async () => {
    await render(<StatsRow stats={{ xpPoints: 0, challengesCompleted: 0, currentStreak: 0 } as any} styles={styles} colors={colors} />);
    // All four values render as literal "0" (xp), "0" (challenges), "0" (topics), "0d" (streak)
    expect(screen.getAllByText('0').length).toBe(3);
    expect(screen.getByText('0d')).toBeTruthy();
  });

  test('shows the real labels', async () => {
    await render(<StatsRow stats={{ xpPoints: 0, challengesCompleted: 0, completedTopics: [], currentStreak: 0 }} styles={styles} colors={colors} />);
    expect(screen.getByText('Total XP')).toBeTruthy();
    expect(screen.getByText('Challenges')).toBeTruthy();
    expect(screen.getByText('Topics Done')).toBeTruthy();
    expect(screen.getByText('Streak')).toBeTruthy();
  });
});
