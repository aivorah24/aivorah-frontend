// Integration test for DailyHabitsScreen — the real screen, real hook
// (useDailyHabits), and real subcomponents, driven entirely through a
// mocked global.fetch.

import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import DailyHabitsScreen from '../DailyHabitsScreen';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => false }),
  useRoute: () => ({ key: 'DailyHabits', name: 'DailyHabits' }),
  useFocusEffect: (cb: () => void) => { const React = require('react'); React.useEffect(cb, []); },
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888',
    textDim: '#666', accentRed: '#f00',
  } }),
}));

let mockUser: any;
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function navProp() {
  return { openDrawer: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { email: 'a@a.com' };
});

describe('DailyHabitsScreen — loading and error', () => {
  test('a load failure shows the real friendly error message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<DailyHabitsScreen navigation={navProp()} />);
    await waitFor(() => expect(screen.getByText('Could not load habits. Please try again.')).toBeTruthy());
  });
});

describe('DailyHabitsScreen — populated', () => {
  test('shows real stats, progress, habit cards, and motivation footer', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      habits: [],
      parentTasks: [{ id: 't1', label: 'Brush teeth', icon: 'smile', coins: 5, fromParent: true }],
      today: { completed: [], coinsEarned: 0 },
      streak: 3, streakBonus: 0, totalCoins: 20, journalText: '', date: '2026-08-19',
    })) as any;

    await render(<DailyHabitsScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('Brush teeth')).toBeTruthy());
    expect(screen.getByText('0 of 1 habits completed')).toBeTruthy();
    expect(screen.getByText("Every great person started with small daily habits. You're on your way!")).toBeTruthy();
  });

  test('checking in a real habit updates the grid and stats from the server response', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/checkin')) return jsonRes({ completed: ['t1'], coinsEarned: 5, streak: 1, totalCoins: 25, journalText: 'Great job today!', checked: true, coinsChange: 5 });
      return jsonRes({
        habits: [], parentTasks: [{ id: 't1', label: 'Brush teeth', icon: 'smile', coins: 5, fromParent: true }],
        today: { completed: [], coinsEarned: 0 }, streak: 0, streakBonus: 0, totalCoins: 20, journalText: '', date: '2026-08-19',
      });
    }) as any;
    const user = userEvent.setup();

    await render(<DailyHabitsScreen navigation={navProp()} />);
    await waitFor(() => expect(screen.getByText('Brush teeth')).toBeTruthy());

    await user.press(screen.getByText('Brush teeth'));

    await waitFor(() => expect(screen.getByText('All habits done! Amazing!')).toBeTruthy());
    expect(screen.getByText('My Daily Journal')).toBeTruthy(); // real journal card now appears
  });

  test('shows the real empty-habits message when the child has no assigned tasks', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      habits: [], parentTasks: [], today: { completed: [], coinsEarned: 0 },
      streak: 0, streakBonus: 0, totalCoins: 0, journalText: '', date: '2026-08-19',
    })) as any;

    await render(<DailyHabitsScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('No habits yet')).toBeTruthy());
  });

  test('shows the real "all habits done" state and streak milestone banner', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      habits: [], parentTasks: [{ id: 't1', label: 'Brush teeth', icon: 'smile', coins: 5, fromParent: true }],
      today: { completed: ['t1'], coinsEarned: 5 }, streak: 10, streakBonus: 0, totalCoins: 20, journalText: '', date: '2026-08-19',
    })) as any;

    await render(<DailyHabitsScreen navigation={navProp()} />);

    await waitFor(() => expect(screen.getByText('All habits done! Amazing!')).toBeTruthy());
    expect(screen.getByText('10-day streak! Keep going to 100 days!')).toBeTruthy();
  });
});
