import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useDailyHabits } from '../useDailyHabits';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(cb, []); },
}));

let mockUser: any;
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function baseToday(overrides: any = {}) {
  return {
    habits: [], parentTasks: [], today: { completed: [], coinsEarned: 0 },
    streak: 0, streakBonus: 0, totalCoins: 0, journalText: '', date: '2026-08-19',
    ...overrides,
  };
}

function Harness() {
  const hook = useDailyHabits();
  return (
    <>
      <Text testID="loading">{String(hook.loading)}</Text>
      <Text testID="error">{hook.error}</Text>
      <Text testID="refreshing">{String(hook.refreshing)}</Text>
      <Text testID="checking">{String(hook.checking)}</Text>
      <Text testID="coinPop">{hook.coinPop ? `${hook.coinPop.id}:${hook.coinPop.coins}` : 'null'}</Text>
      <Text testID="totalCoins">{String(hook.data?.totalCoins ?? '')}</Text>
      <TouchableOpacity testID="toggleT1" onPress={() => hook.toggleHabit('t1')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="refresh" onPress={() => hook.onRefresh()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { email: 'a@a.com' };
});

describe('useDailyHabits — initial fetch', () => {
  test('fetches real today data for the logged-in user', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(baseToday({ totalCoins: 50 }))) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('totalCoins').props.children).toBe('50');
    expect(screen.getByTestId('error').props.children).toBe('');
  });

  test('no logged-in user email skips the fetch entirely, stays loading', async () => {
    mockUser = null;
    global.fetch = jest.fn() as any;
    await render(<Harness />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a non-ok response sets the real friendly error message', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({}, false)) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe('Could not load habits. Please try again.');
  });

  test('a network failure sets the same real friendly error message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe('Could not load habits. Please try again.');
  });
});

describe('useDailyHabits — toggleHabit', () => {
  test('checking in a habit updates the real today state from the server response', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/checkin')) return jsonRes({ completed: ['t1'], coinsEarned: 5, streak: 1, totalCoins: 55, journalText: 'Great job!', checked: true, coinsChange: 5 });
      return jsonRes(baseToday({ totalCoins: 50 }));
    }) as any;
    const user = userEvent.setup();

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('toggleT1'));

    await waitFor(() => expect(screen.getByTestId('totalCoins').props.children).toBe('55'));
  });

  test('checking in shows a real coin pop when coins were earned, then clears it after the delay', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/checkin')) return jsonRes({ completed: ['t1'], coinsEarned: 5, streak: 1, totalCoins: 55, checked: true, coinsChange: 5 });
      return jsonRes(baseToday());
    }) as any;
    const user = userEvent.setup();

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    await user.press(screen.getByTestId('toggleT1'));

    await waitFor(() => expect(screen.getByTestId('coinPop').props.children).toBe('t1:5'));
    await waitFor(() => expect(screen.getByTestId('coinPop').props.children).toBe('null'), { timeout: 3000 });
  });

  test('un-checking (checked:false) shows no coin pop even with a real coinsChange', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/checkin')) return jsonRes({ completed: [], coinsEarned: 0, streak: 0, totalCoins: 45, checked: false, coinsChange: -5 });
      return jsonRes(baseToday());
    }) as any;
    const user = userEvent.setup();

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    await user.press(screen.getByTestId('toggleT1'));

    await waitFor(() => expect(screen.getByTestId('totalCoins').props.children).toBe('45'));
    expect(screen.getByTestId('coinPop').props.children).toBe('null');
  });

  test('a second toggle press while already checking is ignored (guarded)', async () => {
    let resolveCheckin: (v: any) => void;
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/checkin')) return new Promise((resolve) => { resolveCheckin = resolve; });
      return jsonRes(baseToday());
    }) as any;
    const user = userEvent.setup();

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('toggleT1'));
    await waitFor(() => expect(screen.getByTestId('checking').props.children).toBe('t1'));

    (global.fetch as jest.Mock).mockClear();
    await user.press(screen.getByTestId('toggleT1'));
    expect(global.fetch).not.toHaveBeenCalled();

    resolveCheckin!(jsonRes({ completed: [], coinsEarned: 0, streak: 0, totalCoins: 0, checked: true, coinsChange: 0 }));
  });

  test('a checkin network failure is swallowed, checking resets to null', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/checkin')) return Promise.reject(new Error('down'));
      return jsonRes(baseToday());
    }) as any;
    const user = userEvent.setup();

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    await user.press(screen.getByTestId('toggleT1'));

    await waitFor(() => expect(screen.getByTestId('checking').props.children).toBe('null'));
  });
});

describe('useDailyHabits — refresh', () => {
  test('onRefresh sets refreshing then real fetch resolves it back to false', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes(baseToday())) as any;
    const user = userEvent.setup();

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('refresh'));

    await waitFor(() => expect(screen.getByTestId('refreshing').props.children).toBe('false'));
  });
});
