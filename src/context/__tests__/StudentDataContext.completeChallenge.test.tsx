import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { StudentDataProvider, useStudentData } from '../StudentDataContext';

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { email: 'student@test.ai', role: 'student' } }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

function Harness() {
  const { stats, completeChallenge } = useStudentData();
  return (
    <View>
      <Text testID="xp">{stats.xpPoints}</Text>
      <Text testID="challenges">{stats.challengesCompleted}</Text>
      <TouchableOpacity testID="complete50" onPress={() => completeChallenge(50)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="completeZero" onPress={() => completeChallenge(0)}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ xpPoints: 0, challengesCompleted: 0 }) }) as any;
});

describe('StudentDataContext — completeChallenge', () => {
  test('a real challenge completion increments both the Challenges counter and XP together', async () => {
    const user = userEvent.setup();
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);
    await waitFor(() => expect(screen.getByTestId('challenges')).toHaveTextContent('0'));

    await user.press(screen.getByTestId('complete50'));

    await waitFor(() => expect(screen.getByTestId('challenges')).toHaveTextContent('1'));
    expect(screen.getByTestId('xp')).toHaveTextContent('50');
  });

  test('a real completion with zero XP awarded still increments the Challenges counter', async () => {
    const user = userEvent.setup();
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);
    await waitFor(() => expect(screen.getByTestId('challenges')).toHaveTextContent('0'));

    await user.press(screen.getByTestId('completeZero'));

    await waitFor(() => expect(screen.getByTestId('challenges')).toHaveTextContent('1'));
    expect(screen.getByTestId('xp')).toHaveTextContent('0');
  });
});
