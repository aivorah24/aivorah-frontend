// Integration test for the refactored parent Challenges screen. Covers the
// real end-to-end flow this feature exists for: a parent sees their child's
// available challenges and can assign one, with the due-date default and
// the resulting success confirmation, matching the behavior of the retired
// .legacy-screens/parent/ParentChallengesScreen.tsx.

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import ParentChallengesScreen from '../../ParentChallengesScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => { cb(); },
  useNavigation: () => ({ navigate: jest.fn(), openDrawer: jest.fn() }),
  useRoute: () => ({ name: 'ParentChallenges' }),
}));
jest.mock('../../../../../hooks/useResponsive', () => ({
  useResponsive: () => ({ showPermanentSidebar: false }),
}));
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@example.com' } }),
}));
jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 0, unreadAssignments: 0, unreadChallenges: 0, unreadEvents: 0,
    unreadJoinRequests: 0, latestNotif: null, notificationItems: [],
    clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(),
    clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn(),
  }),
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textMain: '#000', textMuted: '#000', textDim: '#000',
      accentYellow: '#c90', accentGreen: '#0a0', accentRed: '#a00', accentOrange: '#f80',
      bgDark: '#111', cardDark: '#222', borderColor: '#333',
      background: '#fff', card: '#fff', border: '#ccc', text: '#000',
    },
  }),
}));

const CHILD = { id: 'child-1', name: 'Aanya', grade: 'Grade 3', curriculum: 'CBSE' };
const CHALLENGE = {
  id: 'ch-1', title: 'Fractions Sprint', description: 'Quick fractions drill',
  grade: 'Grade 3', curriculum: 'CBSE', subject: 'Math', chapterId: 1, topic: 'Fractions',
  difficulty: 'Easy', xpReward: 50, questionCount: 5, timeLimitMinutes: 10,
  type: 'school_challenge', category: 'math',
};

function mockFetchByUrl(handlers: Record<string, any>) {
  (global as any).fetch = jest.fn((url: string, opts?: any) => {
    const match = Object.keys(handlers).find((k) => url.includes(k));
    const entry = match ? handlers[match] : { ok: true, body: {} };
    return Promise.resolve({
      ok: entry.ok !== false,
      json: async () => (typeof entry.body === 'function' ? entry.body(opts) : entry.body),
    });
  });
}

describe('ParentChallengesScreen', () => {
  test('shows the linked child\'s available challenges grouped by section', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/student/': { body: { xpPoints: 120, challengesCompleted: 1, currentStreak: 2 } },
      '/challenges?': { body: [CHALLENGE] },
    });

    await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);

    await waitFor(() => expect(screen.getByText('Fractions Sprint')).toBeTruthy());
    expect(screen.getByText('School Challenges')).toBeTruthy();
    expect(screen.getByText('120')).toBeTruthy();
  });

  test('shows the empty state when the child has no challenges for their grade', async () => {
    mockFetchByUrl({
      '/parent/': { body: [{ ...CHILD, grade: 'Grade 3' }] },
      '/student/': { body: { xpPoints: 0, challengesCompleted: 0, currentStreak: 0 } },
      '/challenges?': { body: [] },
    });

    await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);

    await waitFor(() =>
      expect(screen.getByText('No challenges available for Grade 3 yet.')).toBeTruthy(),
    );
  });

  test('assigning a challenge posts to /challenges/assign with assignedByRole parent and shows confirmation', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/student/': { body: { xpPoints: 120, challengesCompleted: 1, currentStreak: 2 } },
      '/challenges?': { body: [CHALLENGE] },
      '/challenges/assign': { body: {} },
    });

    await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);

    await waitFor(() => expect(screen.getByText('Fractions Sprint')).toBeTruthy());
    fireEvent.press(screen.getByText('Assign to Child'));

    await waitFor(() => expect(screen.getByText(/Assign/)).toBeTruthy());
    fireEvent.press(screen.getByText('Assign'));

    await waitFor(() =>
      expect(screen.getByText('"Fractions Sprint" assigned to Aanya!')).toBeTruthy(),
    );

    const assignCall = (fetch as jest.Mock).mock.calls.find(([url]: [string]) => url.includes('/challenges/assign'));
    expect(assignCall).toBeTruthy();
    const body = JSON.parse(assignCall[1].body);
    expect(body).toMatchObject({
      challengeId: 'ch-1', studentId: 'child-1',
      assignedById: 'parent@example.com', assignedByRole: 'parent',
    });
  });

  test('surfaces the grade-mismatch error returned by aivorah-challenges-service', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/student/': { body: { xpPoints: 0, challengesCompleted: 0, currentStreak: 0 } },
      '/challenges?': { body: [CHALLENGE] },
      '/challenges/assign': { ok: false, body: { error: 'This challenge is for Grade 3, but the student is in Grade 6.' } },
    });

    await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);

    await waitFor(() => expect(screen.getByText('Fractions Sprint')).toBeTruthy());
    fireEvent.press(screen.getByText('Assign to Child'));
    await waitFor(() => expect(screen.getByText(/Assign/)).toBeTruthy());
    fireEvent.press(screen.getByText('Assign'));

    await waitFor(() =>
      expect(screen.getByText('This challenge is for Grade 3, but the student is in Grade 6.')).toBeTruthy(),
    );
  });
});
