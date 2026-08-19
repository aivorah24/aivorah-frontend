import React from 'react';
import { render, screen } from '@testing-library/react-native';
import HabitProgressCard from '../HabitProgressCard';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const baseProps = { cardDark: '#111', borderColor: '#333', textMain: '#fff', styles };

describe('HabitProgressCard — progress text', () => {
  test('shows the real "X of Y habits completed" when not all done', async () => {
    await render(<HabitProgressCard allDone={false} completedCount={2} totalHabits={5} coinsEarned={20} progressPct={0.4} streak={0} streakBonus={0} {...baseProps} />);
    expect(screen.getByText('2 of 5 habits completed')).toBeTruthy();
    expect(screen.getByText('+20 coins')).toBeTruthy();
  });

  test('shows the real "All habits done!" message when allDone is true', async () => {
    await render(<HabitProgressCard allDone={true} completedCount={5} totalHabits={5} coinsEarned={50} progressPct={1} streak={0} streakBonus={0} {...baseProps} />);
    expect(screen.getByText('All habits done! Amazing!')).toBeTruthy();
  });
});

describe('HabitProgressCard — streak milestone banner', () => {
  test('is hidden when the streak is not a multiple of 10', async () => {
    await render(<HabitProgressCard allDone={false} completedCount={1} totalHabits={3} coinsEarned={5} progressPct={0.33} streak={7} streakBonus={0} {...baseProps} />);
    expect(screen.queryByText(/day streak/)).toBeNull();
  });

  test('shows the real "keep going" message at a 10-day milestone', async () => {
    await render(<HabitProgressCard allDone={false} completedCount={1} totalHabits={3} coinsEarned={5} progressPct={0.33} streak={10} streakBonus={0} {...baseProps} />);
    expect(screen.getByText('10-day streak! Keep going to 100 days!')).toBeTruthy();
  });

  test('shows the real bonus-coins message at exactly the 100-day milestone', async () => {
    await render(<HabitProgressCard allDone={false} completedCount={1} totalHabits={3} coinsEarned={5} progressPct={0.33} streak={100} streakBonus={20} {...baseProps} />);
    expect(screen.getByText('100-day streak! +20 bonus coins earned!')).toBeTruthy();
  });

  test('a streak of 0 shows no milestone banner', async () => {
    await render(<HabitProgressCard allDone={false} completedCount={0} totalHabits={3} coinsEarned={0} progressPct={0} streak={0} streakBonus={0} {...baseProps} />);
    expect(screen.queryByText(/day streak/)).toBeNull();
  });
});
