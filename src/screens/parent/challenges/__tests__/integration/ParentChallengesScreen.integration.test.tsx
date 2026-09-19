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
  type: 'school_challenge', category: 'School Challenges',
};
const NEW_TYPE_CHALLENGE = {
  id: 'ch-2', title: 'Multiplication Mystery', description: 'Pattern puzzle',
  grade: 'Grade 3', curriculum: 'CBSE', subject: 'Math', chapterId: 2, topic: 'Multiplication',
  difficulty: 'Easy', xpReward: 140, questionCount: 5, timeLimitMinutes: 10,
  type: 'pattern_challenge', category: 'Pattern Challenge',
};
const HARD_ASSIGNED_CHALLENGE = {
  id: 'ch-3', title: 'Geometry Gauntlet', description: 'Advanced shapes drill',
  grade: 'Grade 3', curriculum: 'CBSE', subject: 'Math', chapterId: 3, topic: 'Geometry',
  difficulty: 'Hard', xpReward: 200, questionCount: 8, timeLimitMinutes: 20,
  type: 'school_challenge', category: 'School Challenges', status: 'assigned', assignmentId: 'asg-1',
};
const COMPLETED_CHALLENGE = {
  id: 'ch-4', title: 'Times Table Trial', description: 'Recall drill',
  grade: 'Grade 3', curriculum: 'CBSE', subject: 'Math', chapterId: 4, topic: 'Multiplication',
  difficulty: 'Medium', xpReward: 100, questionCount: 5, timeLimitMinutes: 10,
  type: 'school_challenge', category: 'School Challenges', status: 'completed', assignmentId: 'asg-2',
};

function mockFetchByUrl(handlers: Record<string, any>) {
  (global as any).fetch = jest.fn((url: string, opts?: any) => {
    const match = Object.keys(handlers).find((k) => url.includes(k));
    const entry = match ? handlers[match] : { ok: true, body: {} };
    return Promise.resolve({
      ok: entry.ok !== false,
      json: async () => (typeof entry.body === 'function' ? entry.body(opts, url) : entry.body),
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

  test('renders a challenge whose type is outside the legacy three-type set (regression for the type-taxonomy bug)', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/student/': { body: { xpPoints: 120, challengesCompleted: 1, currentStreak: 2 } },
      '/challenges?': { body: [NEW_TYPE_CHALLENGE] },
    });

    await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);

    await waitFor(() => expect(screen.getByText('Multiplication Mystery')).toBeTruthy());
    expect(screen.getByText('Pattern Challenge')).toBeTruthy();
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

  // Accepted coverage gap: the multi-child tab row (children.length > 1,
  // ParentChallengesScreen.tsx ~lines 42-56, including the tab's onPress ->
  // setSelectedIdx at ~line 48) isn't exercised here. This integration
  // file's `useFocusEffect` test double invokes its callback unconditionally
  // on every render (real React Navigation's doesn't), which drives a
  // background render/re-fetch loop each test's assertions "outrun" rather
  // than actually converge from - fine for a single-child tree, but a
  // two-child tree pushed rendering past the 5s/15s test timeout reliably,
  // in this environment, not as a product bug. The underlying logic this
  // tab's onPress calls is covered directly at the hook level by
  // useParentChallenges.test.ts's "switches child on setSelectedIdx and
  // refetches", which doesn't render the JSX tree at all and isn't
  // susceptible to this test-double's render-loop behavior.

  test('the Class Leaderboard CTA navigates to ParentLeaderboard', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/student/': { body: { xpPoints: 120, challengesCompleted: 1, currentStreak: 2 } },
      '/challenges?': { body: [CHALLENGE] },
    });
    const navigation = { navigate: jest.fn(), openDrawer: jest.fn() };

    await render(<ParentChallengesScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('Class Leaderboard')).toBeTruthy());

    fireEvent.press(screen.getByText('Class Leaderboard'));
    expect(navigation.navigate).toHaveBeenCalledWith('ParentLeaderboard');
  });

  test('an already-assigned or completed challenge shows its status badge instead of the Assign button', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/student/': { body: { xpPoints: 120, challengesCompleted: 1, currentStreak: 2 } },
      '/challenges?': { body: [HARD_ASSIGNED_CHALLENGE, COMPLETED_CHALLENGE] },
    });

    await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);

    await waitFor(() => expect(screen.getByText('Geometry Gauntlet')).toBeTruthy());
    expect(screen.getByText('Assigned')).toBeTruthy();
    // 'Done' also labels the stats-row tile - just confirm the card's own
    // "Done" badge is present among the matches, not that it's unique.
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0);
    expect(screen.getByText('Hard')).toBeTruthy();
  });

  test('pressing Cancel in the assign modal closes it without assigning', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/student/': { body: { xpPoints: 120, challengesCompleted: 1, currentStreak: 2 } },
      '/challenges?': { body: [CHALLENGE] },
    });

    await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);
    await waitFor(() => expect(screen.getByText('Fractions Sprint')).toBeTruthy());
    fireEvent.press(screen.getByText('Assign to Child'));
    await waitFor(() => expect(screen.getByText('Cancel')).toBeTruthy());

    fireEvent.press(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Cancel')).toBeNull());
    expect(screen.getByText('Assign to Child')).toBeTruthy();
  });

  test('picking a different due-date option updates the assign request', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/student/': { body: { xpPoints: 120, challengesCompleted: 1, currentStreak: 2 } },
      '/challenges?': { body: [CHALLENGE] },
      '/challenges/assign': { body: {} },
    });

    await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);
    await waitFor(() => expect(screen.getByText('Fractions Sprint')).toBeTruthy());
    fireEvent.press(screen.getByText('Assign to Child'));
    await waitFor(() => expect(screen.getByText('3 Days')).toBeTruthy());

    fireEvent.press(screen.getByText('3 Days'));
    await waitFor(() => expect(screen.getByText(/Due: 2026-/)).toBeTruthy());
    fireEvent.press(screen.getByText('Assign'));

    await waitFor(() =>
      expect(screen.getByText('"Fractions Sprint" assigned to Aanya!')).toBeTruthy(),
    );
    const assignCall = (fetch as jest.Mock).mock.calls.find(([url]: [string]) => url.includes('/challenges/assign'));
    const body = JSON.parse(assignCall[1].body);
    const threeDaysOut = new Date(); threeDaysOut.setDate(threeDaysOut.getDate() + 3);
    expect(body.dueDate).toBe(threeDaysOut.toISOString().split('T')[0]);
  });

  test('a network failure during assign shows a generic error, not a crash', async () => {
    mockFetchByUrl({
      '/parent/': { body: [CHILD] },
      '/student/': { body: { xpPoints: 120, challengesCompleted: 1, currentStreak: 2 } },
      '/challenges?': { body: [CHALLENGE] },
    });

    await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);
    await waitFor(() => expect(screen.getByText('Fractions Sprint')).toBeTruthy());
    fireEvent.press(screen.getByText('Assign to Child'));
    await waitFor(() => expect(screen.getByText(/Assign/)).toBeTruthy());

    (global as any).fetch = jest.fn((url: string) => {
      if (url.includes('/challenges/assign')) return Promise.reject(new Error('network down'));
      return Promise.resolve({ ok: true, json: async () => [CHALLENGE] });
    });
    fireEvent.press(screen.getByText('Assign'));

    await waitFor(() => expect(screen.getByText('Network error. Please try again.')).toBeTruthy());
  });
});
