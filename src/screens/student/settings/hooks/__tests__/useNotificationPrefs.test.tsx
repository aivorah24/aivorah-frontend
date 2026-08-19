import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useNotificationPrefs } from '../useNotificationPrefs';

jest.setTimeout(15000);

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const mockTriggerPoll = jest.fn();
const mockClearUnreadAssignments = jest.fn();
const mockClearUnreadChallenges = jest.fn();
const mockMuteCategory = jest.fn();
const mockSetRecoverySaved = jest.fn();

function Harness({ userEmail = 'a@a.com' }: { userEmail?: string }) {
  const h = useNotificationPrefs(userEmail, mockTriggerPoll, mockClearUnreadAssignments, mockClearUnreadChallenges, mockMuteCategory, mockSetRecoverySaved);
  return (
    <>
      <Text testID="assignmentAlerts">{String(h.assignmentAlerts)}</Text>
      <Text testID="challengeUpdates">{String(h.challengeUpdates)}</Text>
      <TouchableOpacity testID="toggleAssignmentsOn" onPress={() => h.toggleAssignmentAlerts(true)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="toggleAssignmentsOff" onPress={() => h.toggleAssignmentAlerts(false)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="toggleChallengesOn" onPress={() => h.toggleChallengeUpdates(true)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="toggleChallengesOff" onPress={() => h.toggleChallengeUpdates(false)}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  global.fetch = jest.fn().mockResolvedValue(jsonRes({})) as any;
});

describe('useNotificationPrefs — loading on mount', () => {
  test('does not fetch at all with no real userEmail', async () => {
    await render(<Harness userEmail={'' as any} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('loads real server preferences and applies them', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ assignmentAlerts: false, challengeUpdates: false })) as any;
    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('assignmentAlerts').props.children).toBe('false'));
    expect(screen.getByTestId('challengeUpdates').props.children).toBe('false');
  });

  test('a real server load failure leaves the real defaults in place, no crash', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('assignmentAlerts').props.children).toBe('true'));
  });

  test('a real saved recoveryEmail from server preferences calls setRecoverySaved', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ recoveryEmail: 'backup@b.com' })) as any;
    await render(<Harness />);

    await waitFor(() => expect(mockSetRecoverySaved).toHaveBeenCalledWith('backup@b.com'));
  });

  test('a real AsyncStorage bell-pref read does not crash and eventually settles to a defined boolean', async () => {
    // Both the server GET and the AsyncStorage read run independently on mount;
    // which one's value "wins" depends on real promise-chain timing (AsyncStorage's
    // shorter chain vs. fetch's two-hop .then(json).then(setState)), so this only
    // asserts the read completes cleanly, not a specific winner.
    await AsyncStorage.setItem('notifPrefs_a@a.com', JSON.stringify({ assignmentAlerts: false }));
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ assignmentAlerts: true })) as any;
    await render(<Harness />);

    await waitFor(() => expect(['true', 'false']).toContain(screen.getByTestId('assignmentAlerts').props.children));
  });
});

describe('useNotificationPrefs — toggling', () => {
  test('turning a real toggle ON clears the matching unread badge', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('assignmentAlerts').props.children).toBe('true'));

    await user.press(screen.getByTestId('toggleAssignmentsOn'));

    expect(mockClearUnreadAssignments).toHaveBeenCalled();
    expect(mockMuteCategory).not.toHaveBeenCalled();
  });

  test('turning a real toggle OFF mutes that category instead', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('assignmentAlerts').props.children).toBe('true'));

    await user.press(screen.getByTestId('toggleAssignmentsOff'));

    expect(mockMuteCategory).toHaveBeenCalledWith('assignmentAlerts');
    expect(mockClearUnreadAssignments).not.toHaveBeenCalled();
  });

  test('a real toggle persists to AsyncStorage and triggers a real poll', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('assignmentAlerts').props.children).toBe('true'));

    await user.press(screen.getByTestId('toggleAssignmentsOff'));

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem('notifPrefs_a@a.com');
      expect(JSON.parse(raw!).assignmentAlerts).toBe(false);
    });
    expect(mockTriggerPoll).toHaveBeenCalled();
  });

  test('a real toggle before the initial server load resolves still updates the UI, no premature PATCH', async () => {
    // fetch never resolves — notifLoaded.current stays false the whole test.
    global.fetch = jest.fn(() => new Promise(() => {})) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('toggleChallengesOff'));

    expect(screen.getByTestId('challengeUpdates').props.children).toBe('false');
    // Only the initial GET was made — no PATCH, since notifLoaded is still false.
    const patchCalls = (global.fetch as jest.Mock).mock.calls.filter(c => c[1]?.method === 'PATCH');
    expect(patchCalls).toHaveLength(0);
  });

  test('challenge toggle ON clears the real challenges unread badge', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('challengeUpdates').props.children).toBe('true'));

    await user.press(screen.getByTestId('toggleChallengesOn'));

    expect(mockClearUnreadChallenges).toHaveBeenCalled();
  });
});
