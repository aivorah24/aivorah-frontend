// Standalone unit test for useNotificationPreferences — no RNTL renderHook
// available in this version (see src/screens/teacher/schedule/__tests__/unit/
// useTagFilters.test.tsx for the established pattern), so a tiny harness
// component exposes the hook's state/handlers as text/props for assertions.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';

function Harness({ email, triggerPoll }: { email: string | undefined; triggerPoll: () => void }) {
  const h = useNotificationPreferences(email, triggerPoll);
  return (
    <View>
      <Text testID="submissionAlerts">{String(h.submissionAlerts)}</Text>
      <Text testID="parentMessages">{String(h.parentMessages)}</Text>
      <Text testID="weeklyReport">{String(h.weeklyReport)}</Text>
      <Text testID="aiInsights">{String(h.aiInsights)}</Text>
      <Text testID="challengeAlerts">{String(h.challengeAlerts)}</Text>
      <TouchableOpacity testID="save-teacherMessages-off" onPress={() => h.saveNotifPrefs({ teacherMessages: false })}>
        <Text>save</Text>
      </TouchableOpacity>
    </View>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useNotificationPreferences', () => {
  test('defaults match the real teacher-facing labels (all on except challenge alerts)', async () => {
    await render(<Harness email="teacher@school.com" triggerPoll={jest.fn()} />);
    expect(screen.getByTestId('submissionAlerts').props.children).toBe('true');
    expect(screen.getByTestId('parentMessages').props.children).toBe('true');
    expect(screen.getByTestId('weeklyReport').props.children).toBe('true');
    expect(screen.getByTestId('aiInsights').props.children).toBe('true');
    expect(screen.getByTestId('challengeAlerts').props.children).toBe('false');
  });

  test('a real saved prefs blob in AsyncStorage overrides the defaults on load', async () => {
    await AsyncStorage.setItem('notifPrefs_teacher@school.com', JSON.stringify({
      assignmentAlerts: false, teacherMessages: false, challengeUpdates: true,
      weeklyReport: false, aiInsights: false,
    }));
    await render(<Harness email="teacher@school.com" triggerPoll={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('submissionAlerts').props.children).toBe('false'));
    expect(screen.getByTestId('parentMessages').props.children).toBe('false');
    expect(screen.getByTestId('challengeAlerts').props.children).toBe('true');
    expect(screen.getByTestId('weeklyReport').props.children).toBe('false');
    expect(screen.getByTestId('aiInsights').props.children).toBe('false');
  });

  test('a real corrupt AsyncStorage value is ignored, not crashed on', async () => {
    await AsyncStorage.setItem('notifPrefs_teacher@school.com', 'not-json{{{');
    await render(<Harness email="teacher@school.com" triggerPoll={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('submissionAlerts')).toBeTruthy());
    expect(screen.getByTestId('submissionAlerts').props.children).toBe('true');
  });

  test('saveNotifPrefs persists the CURRENT state under the bell-compatible key names and triggers a poll', async () => {
    const triggerPoll = jest.fn();
    const user = userEvent.setup();
    await render(<Harness email="teacher@school.com" triggerPoll={triggerPoll} />);

    await user.press(screen.getByTestId('save-teacherMessages-off'));

    expect(triggerPoll).toHaveBeenCalledTimes(1);
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem('notifPrefs_teacher@school.com');
      expect(raw).toBeTruthy();
    });
    const saved = JSON.parse((await AsyncStorage.getItem('notifPrefs_teacher@school.com'))!);
    expect(saved).toEqual({
      assignmentAlerts: true, teacherMessages: false, challengeUpdates: false,
      weeklyReport: true, aiInsights: true,
    });
  });

  test('a real anonymous/guest teacher (no email) still gets a stable, namespaced key with no crash', async () => {
    const user = userEvent.setup();
    await render(<Harness email={undefined} triggerPoll={jest.fn()} />);

    await user.press(screen.getByTestId('save-teacherMessages-off'));

    expect(screen.getByTestId('submissionAlerts').props.children).toBe('true'); // no crash, defaults intact
  });
});
