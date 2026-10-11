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
  const { stats, startTopicActivity, completeLesson } = useStudentData();
  return (
    <View>
      <Text testID="xp">{stats.xpPoints}</Text>
      <Text testID="explored">{stats.topicsExplored}</Text>
      <Text testID="started">{stats.startedTopics.join(',')}</Text>
      <Text testID="isInProgress">{String(stats.startedTopics.includes('Fractions') && !stats.completedTopics.includes('Fractions'))}</Text>
      <TouchableOpacity testID="start" onPress={() => startTopicActivity('Fractions')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="startRapid" onPress={() => {
        // Three synchronous calls in the same event-handler tick, before any
        // re-render — exercises startedTopicsRef's synchronous guard, not
        // just the updater-level check (RCA Phase 3B gate 3).
        startTopicActivity('Fractions');
        startTopicActivity('Fractions');
        startTopicActivity('Fractions');
      }}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="complete" onPress={() => completeLesson('Fractions', 'Math', 'Grade 6', 'CBSE')}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any; // force offline fallback paths
});

describe('StudentDataContext — startTopicActivity (B001/B002/B003 fix)', () => {
  test('Not Started -> In Progress: first open records the topic as started without awarding XP', async () => {
    const user = userEvent.setup();
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);
    await waitFor(() => expect(screen.getByTestId('explored')).toHaveTextContent('0'));
    expect(screen.getByTestId('isInProgress')).toHaveTextContent('false'); // Not Started

    await user.press(screen.getByTestId('start'));

    await waitFor(() => expect(screen.getByTestId('started')).toHaveTextContent('Fractions'));
    expect(screen.getByTestId('explored')).toHaveTextContent('1');
    expect(screen.getByTestId('xp')).toHaveTextContent('0'); // no XP until started topics persist server-side
    expect(screen.getByTestId('isInProgress')).toHaveTextContent('true'); // In Progress
  });

  test('reopening the same topic does not double-count explore XP (no double-counting)', async () => {
    const user = userEvent.setup();
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);
    await waitFor(() => expect(screen.getByTestId('explored')).toHaveTextContent('0'));

    await user.press(screen.getByTestId('start'));
    await waitFor(() => expect(screen.getByTestId('explored')).toHaveTextContent('1'));

    await user.press(screen.getByTestId('start'));
    await user.press(screen.getByTestId('start'));

    expect(screen.getByTestId('explored')).toHaveTextContent('1');
    expect(screen.getByTestId('xp')).toHaveTextContent('0'); // no XP until started topics persist server-side
    expect(screen.getByTestId('started')).toHaveTextContent('Fractions'); // not duplicated in the list
  });

  test('rapid synchronous repeat calls in the same tick do not double-count XP or duplicate the topic (guard fix)', async () => {
    const user = userEvent.setup();
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);
    await waitFor(() => expect(screen.getByTestId('explored')).toHaveTextContent('0'));

    await user.press(screen.getByTestId('startRapid'));

    await waitFor(() => expect(screen.getByTestId('started')).toHaveTextContent('Fractions'));
    expect(screen.getByTestId('explored')).toHaveTextContent('1');
    expect(screen.getByTestId('xp')).toHaveTextContent('0'); // no XP until started topics persist server-side
    expect(screen.getByTestId('started')).toHaveTextContent('Fractions'); // not duplicated
  });

  test('In Progress -> Completed: passing a quiz moves status to Completed, not back to Not Started', async () => {
    const user = userEvent.setup();
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);
    await waitFor(() => expect(screen.getByTestId('explored')).toHaveTextContent('0'));

    await user.press(screen.getByTestId('start'));
    await waitFor(() => expect(screen.getByTestId('isInProgress')).toHaveTextContent('true'));

    await user.press(screen.getByTestId('complete'));

    await waitFor(() => expect(screen.getByTestId('isInProgress')).toHaveTextContent('false')); // now Completed, not In Progress
  });
});
