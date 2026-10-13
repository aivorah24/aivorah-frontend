import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StudentDataProvider, useStudentData } from '../StudentDataContext';

jest.mock('../AuthContext', () => ({
  useAuth: () => ({ user: { email: 'arjun@test.ai', role: 'student' } }),
}));

const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => { mockStore[k] = v; return Promise.resolve(); }),
}));

// arjun@test.ai is a demo account with a fixed id (no /user/sync needed).
const ID = 'aaaa0000-0000-0000-0000-000000000001';

function Harness() {
  const { learningActivity, startTopicActivity, recordQuizResult } = useStudentData();
  const a = learningActivity['Bit and Wisdom'];
  return (
    <View>
      <Text testID="opened">{a?.lastOpenedAt ? 'yes' : 'no'}</Text>
      <Text testID="scores">{(a?.quizzes ?? []).map(q => q.score).join(',')}</Text>
      <Text testID="subject">{a?.subject ?? ''}</Text>
      <TouchableOpacity testID="open" onPress={() => startTopicActivity('Bit and Wisdom')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="quiz" onPress={() => recordQuizResult('Bit and Wisdom', 80, 'English')}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
});

describe('StudentDataContext — learningActivity (dashboard progress sync)', () => {
  test('opening a topic and finishing its quiz are recorded per topic name and persisted per student', async () => {
    const user = userEvent.setup();
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(`@lp_activity_${ID}`));

    await user.press(screen.getByTestId('open'));
    await user.press(screen.getByTestId('quiz'));

    await waitFor(() => expect(screen.getByTestId('scores')).toHaveTextContent('80'));
    expect(screen.getByTestId('opened')).toHaveTextContent('yes');
    expect(screen.getByTestId('subject')).toHaveTextContent('English');
    await waitFor(() => expect(JSON.parse(mockStore[`@lp_activity_${ID}`] ?? '{}')['Bit and Wisdom']?.quizzes?.[0]?.score).toBe(80));
  });

  test('activity saved on this device is restored after a reload', async () => {
    mockStore[`@lp_activity_${ID}`] = JSON.stringify({ 'Bit and Wisdom': { subject: 'English', quizzes: [{ score: 70, at: '2026-10-13T10:00:00.000Z' }] } });
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);
    await waitFor(() => expect(screen.getByTestId('scores')).toHaveTextContent('70'));
  });

  test('learningActivity is never sent to the stats endpoint (kept out of stats)', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);
    await user.press(screen.getByTestId('quiz'));
    await waitFor(() => expect(screen.getByTestId('scores')).toHaveTextContent('80'));
    const bodies = (global.fetch as jest.Mock).mock.calls.map(c => String(c[1]?.body ?? ''));
    bodies.forEach(b => expect(b).not.toContain('Bit and Wisdom'));
  });
});
