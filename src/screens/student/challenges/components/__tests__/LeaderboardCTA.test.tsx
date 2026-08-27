import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import LeaderboardCTA from '../LeaderboardCTA';

jest.setTimeout(15000);

const styles: any = new Proxy({}, { get: () => ({}) });
const colors: any = { accentYellow: '#fa0' };

describe('LeaderboardCTA', () => {
  test('shows the real call-to-action text', async () => {
    await render(<LeaderboardCTA onPress={jest.fn()} styles={styles} colors={colors} />);
    expect(screen.getByText('Live Class Leaderboard')).toBeTruthy();
  });

  test('pressing it calls the real onPress handler', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<LeaderboardCTA onPress={onPress} styles={styles} colors={colors} />);

    await user.press(screen.getByText('Live Class Leaderboard'));

    expect(onPress).toHaveBeenCalled();
  });
});
