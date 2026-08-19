// Integration tests for LeaderboardScreen — the real, flat screen (no
// separate hooks/components split for this feature). ScreenLayout (real, not
// mocked) gates all children behind its own screen-time-status fetch for
// student users, so global.fetch must be mocked to resolve for anything to
// render — and this screen's own leaderboard fetch reuses the same
// global.fetch mock, routed by URL.

import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import LeaderboardScreen from '../LeaderboardScreen';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useRoute: () => ({ key: 'Leaderboard', name: 'Leaderboard' }),
    // Run only on mount/dep-change (via useEffect), like the real hook's
    // focus behavior — calling the callback unconditionally on every render
    // causes an infinite render loop since it triggers state updates.
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', accentYellow: '#fa0', accentGreen: '#0a0', textMain: '#fff', textMuted: '#888',
    textDim: '#666', borderColor: '#333', cardDark: '#111', accentRed: '#f00',
  } }),
}));

let mockAuthUser: any;
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ studentId: 's1' }),
}));

function makeEntry(overrides: any = {}) {
  return { rank: 1, id: 's1', name: 'Aanya Sharma', grade: 'Grade 4', score: 500, level: 3, streak: 5, topics: 4, ...overrides };
}

function mockFetchWithLeaderboard(leaderboard: any[]) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (String(url).includes('/student/leaderboard')) {
      return Promise.resolve({ json: async () => leaderboard });
    }
    // ScreenLayout's screen-time-status gate.
    return Promise.resolve({ json: async () => ({}) });
  }) as any;
}

function navProp() {
  return { openDrawer: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthUser = { name: 'A Student', email: 'a@a.com', grade: 'Grade 4', curriculum: 'IB PYP', school: 'Greenwood' };
  mockFetchWithLeaderboard([]);
});

describe('LeaderboardScreen — loading and empty states', () => {
  test('shows "Not ranked yet" once loaded with no entries', async () => {
    await render(<LeaderboardScreen navigation={navProp()} />);
    expect(await screen.findByText('Not ranked yet')).toBeTruthy();
    expect(screen.getByText('No rankings in this view yet.')).toBeTruthy();
  });
});

describe('LeaderboardScreen — populated board', () => {
  test('renders real student rows and the school chip from the real user', async () => {
    mockFetchWithLeaderboard([
      makeEntry({ rank: 1, id: 'other-1', name: 'Rohan Gupta', score: 800 }),
      makeEntry({ rank: 2, id: 's1', name: 'Aanya Sharma', score: 500 }),
    ]);
    await render(<LeaderboardScreen navigation={navProp()} />);

    expect((await screen.findAllByText('Rohan Gupta')).length).toBeGreaterThan(0); // podium + table row
    expect(screen.getAllByText('Aanya Sharma').length).toBeGreaterThan(0);
    expect(screen.getByText('Greenwood')).toBeTruthy();
  });

  test('shows the real rank card for the current student when they are on the board', async () => {
    mockFetchWithLeaderboard([
      makeEntry({ rank: 1, id: 'other-1', name: 'Rohan Gupta', score: 1000 }),
      makeEntry({ rank: 2, id: 's1', name: 'Aanya Sharma', score: 400 }),
    ]);
    await render(<LeaderboardScreen navigation={navProp()} />);

    expect(await screen.findByText("You're doing great!")).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
    expect(screen.getByText('400 / 1,000 XP to reach #1')).toBeTruthy();
  });

  test('shows "Top of the board!" when the student is ranked #1, with no progress bar text', async () => {
    mockFetchWithLeaderboard([makeEntry({ rank: 1, id: 's1', name: 'Aanya Sharma', score: 500 })]);
    await render(<LeaderboardScreen navigation={navProp()} />);

    expect(await screen.findByText('Top of the board! 🏆')).toBeTruthy();
  });

  test('the "View Full Leaderboard" button appears only once there are more than 6 entries', async () => {
    const many = Array.from({ length: 7 }, (_, i) => makeEntry({ rank: i + 1, id: `s${i}`, name: `Student ${i}`, score: 700 - i * 10 }));
    mockFetchWithLeaderboard(many);
    await render(<LeaderboardScreen navigation={navProp()} />);

    expect(await screen.findByText('View Full Leaderboard')).toBeTruthy();
  });

  test('the "View Full Leaderboard" button is absent with 6 or fewer entries', async () => {
    const six = Array.from({ length: 6 }, (_, i) => makeEntry({ rank: i + 1, id: `s${i}`, name: `Student ${i}`, score: 600 - i * 10 }));
    mockFetchWithLeaderboard(six);
    await render(<LeaderboardScreen navigation={navProp()} />);

    await screen.findAllByText('Student 0'); // appears in both the podium and the table row
    expect(screen.queryByText('View Full Leaderboard')).toBeNull();
  });
});

describe('LeaderboardScreen — scope tabs', () => {
  test('switching to the Grade tab re-fetches with grade+school query params', async () => {
    const { getByText } = await render(<LeaderboardScreen navigation={navProp()} />);
    await screen.findByText('Not ranked yet');

    (global.fetch as jest.Mock).mockClear();
    const user = userEvent.setup();
    await user.press(getByText('Grade'));

    await waitFor(() => {
      const calledUrl = (global.fetch as jest.Mock).mock.calls.find((c: any[]) => String(c[0]).includes('/student/leaderboard'))?.[0];
      expect(calledUrl).toContain('grade=Grade%204');
      expect(calledUrl).toContain('school=Greenwood');
    });
  });

  test('switching to the Curriculum tab re-fetches with a curriculum query param', async () => {
    const { getByText } = await render(<LeaderboardScreen navigation={navProp()} />);
    await screen.findByText('Not ranked yet');

    (global.fetch as jest.Mock).mockClear();
    const user = userEvent.setup();
    await user.press(getByText('Curriculum'));

    await waitFor(() => {
      const calledUrl = (global.fetch as jest.Mock).mock.calls.find((c: any[]) => String(c[0]).includes('/student/leaderboard'))?.[0];
      expect(calledUrl).toContain('curriculum=IB%20PYP');
    });
  });

  test('switching to Overall re-fetches with no scope params beyond the limit', async () => {
    const { getByText } = await render(<LeaderboardScreen navigation={navProp()} />);
    await screen.findByText('Not ranked yet');

    (global.fetch as jest.Mock).mockClear();
    const user = userEvent.setup();
    await user.press(getByText('Overall'));

    await waitFor(() => {
      const calledUrl = (global.fetch as jest.Mock).mock.calls.find((c: any[]) => String(c[0]).includes('/student/leaderboard'))?.[0];
      expect(calledUrl).toContain('/student/leaderboard?limit=500');
      expect(calledUrl).not.toContain('grade=');
      expect(calledUrl).not.toContain('curriculum=');
      expect(calledUrl).not.toContain('school=');
    });
  });
});
