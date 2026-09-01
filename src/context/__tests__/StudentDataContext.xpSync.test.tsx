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
  const { stats, addXP } = useStudentData();
  return (
    <View>
      <Text testID="xp">{stats.xpPoints}</Text>
      <TouchableOpacity testID="addXP" onPress={() => addXP(50)}><Text>add</Text></TouchableOpacity>
    </View>
  );
}

describe('StudentDataContext — XP consistency across a failed sync', () => {
  test('a real network failure syncing addXP is reconciled against the server, not left permanently diverged', async () => {
    const fetchMock = jest.fn((url: string, opts?: any) => {
      // Initial GET on login: server already has 100 XP.
      if (!opts || opts.method === undefined) {
        return Promise.resolve({ ok: true, json: async () => ({ xpPoints: 100 }) } as any);
      }
      // The addXP sync PUT genuinely fails (network blip) — server XP stays 100.
      if (opts.method === 'PUT') {
        return Promise.reject(new Error('network error'));
      }
      return Promise.resolve({ ok: true, json: async () => ({ xpPoints: 100 }) } as any);
    });
    global.fetch = fetchMock as any;

    const user = userEvent.setup();
    await render(<StudentDataProvider><Harness /></StudentDataProvider>);

    await waitFor(() => expect(screen.getByTestId('xp')).toHaveTextContent('100'));

    // Student earns XP locally, but the sync PUT to the server fails.
    await user.press(screen.getByTestId('addXP'));

    // The context must notice the sync failed and reconcile against the
    // server's real value — otherwise this screen would show 150 forever
    // while Leaderboard (which always re-fetches from the server) shows
    // 100, producing the reported "XP inconsistent between pages" bug.
    await waitFor(() => expect(screen.getByTestId('xp')).toHaveTextContent('100'));
    // Stays reconciled — no bounce back to the stale optimistic 150.
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByTestId('xp')).toHaveTextContent('100');
  });
});
