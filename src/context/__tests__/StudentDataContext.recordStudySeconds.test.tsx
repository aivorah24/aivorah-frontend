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
  const { stats, recordStudySeconds } = useStudentData();
  return (
    <View>
      <Text testID="total">{stats.studyTimeMinutes}</Text>
      <Text testID="lp">{stats.learningPathMinutes}</Text>
      <Text testID="ch">{stats.challengeTimeMinutes}</Text>
      <TouchableOpacity testID="lp40" onPress={() => recordStudySeconds(40, 'learningPath', 'Math')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="ch40" onPress={() => recordStudySeconds(40, 'challenge')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="lp150" onPress={() => recordStudySeconds(150, 'learningPath', 'Math')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="zero" onPress={() => recordStudySeconds(0, 'learningPath', 'Math')}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

function studyTimePosts() {
  return (global.fetch as jest.Mock).mock.calls
    .filter(([url, init]) => String(url).endsWith('/study-time') && init?.method === 'POST')
    .map(([, init]) => JSON.parse(init.body));
}

beforeEach(() => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
});

async function setup() {
  const user = userEvent.setup();
  await render(<StudentDataProvider><Harness /></StudentDataProvider>);
  await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('0'));
  return user;
}

describe('StudentDataContext — recordStudySeconds', () => {
  test('two 40s sessions add up to 1 minute instead of being dropped', async () => {
    const user = await setup();

    await user.press(screen.getByTestId('lp40'));
    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(studyTimePosts()).toHaveLength(0);

    await user.press(screen.getByTestId('lp40'));
    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('1'));
    expect(screen.getByTestId('lp')).toHaveTextContent('1');
    expect(studyTimePosts()).toEqual([{ minutes: 1, source: 'learningPath', subject: 'Math' }]);
  });

  test('remainders are kept per source, not mixed across streams', async () => {
    const user = await setup();

    await user.press(screen.getByTestId('lp40'));
    await user.press(screen.getByTestId('ch40'));

    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(studyTimePosts()).toHaveLength(0);
  });

  test('sends whole minutes immediately and carries the leftover seconds', async () => {
    const user = await setup();

    await user.press(screen.getByTestId('lp150')); // 2m30s
    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('2'));

    await user.press(screen.getByTestId('lp40')); // 30 + 40 = 70s -> 1 more minute
    await waitFor(() => expect(screen.getByTestId('total')).toHaveTextContent('3'));
    expect(studyTimePosts().map(p => p.minutes)).toEqual([2, 1]);
  });

  test('zero seconds is a no-op', async () => {
    const user = await setup();

    await user.press(screen.getByTestId('zero'));

    expect(screen.getByTestId('total')).toHaveTextContent('0');
    expect(studyTimePosts()).toHaveLength(0);
  });
});
