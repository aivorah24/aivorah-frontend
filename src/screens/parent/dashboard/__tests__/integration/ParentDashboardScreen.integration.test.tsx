// Integration test for ParentDashboardScreen — renders the real screen with
// its real hooks/components wired together, mocking only the network layer.
// Same pattern as teacher/dashboard/__tests__/integration/TeacherDashboardScreen.integration.test.tsx.
import React from 'react';
import { render, screen, waitFor, fireEvent, userEvent } from '@testing-library/react-native';
import ParentDashboardScreen from '../../ParentDashboardScreen';
jest.mock('../../../../../config/firebase', () => ({
  auth: { authStateReady: jest.fn().mockResolvedValue(undefined), currentUser: { getIdToken: jest.fn().mockResolvedValue('tok') } },
}));


jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'ParentDashboard', name: 'ParentDashboard' }),
}));

let mockUser: any = { email: 'parent@aivorah.test', name: 'Meera Iyer', schoolId: null };
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#000', cardDark: '#111', borderColor: '#222', textMain: '#fff', textMuted: '#ccc',
      textDim: '#999', textHeading: '#fff', accentYellow: '#FFD700', accentGreen: '#0f0', accentRed: '#f00',
    },
    isDark: true,
  }),
}));

let mockNotifState = { unreadCount: 0, unreadAssignments: 0 };
jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: mockNotifState.unreadCount,
    unreadAssignments: mockNotifState.unreadAssignments,
    unreadChallenges: 0, unreadEvents: 0, latestNotif: null, notificationItems: [],
    clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(), clearUnreadChallenges: jest.fn(),
  }),
}));

const navigation = { openDrawer: jest.fn(), navigate: jest.fn(), setParams: jest.fn(), addListener: jest.fn(() => jest.fn()) };

function rawChild(overrides: Record<string, any> = {}) {
  return {
    id: 'c1', name: 'Anaya', grade: 'Grade 4', curriculum: 'IB PYP', school: 'TSRA',
    totalTopics: 20, xpPoints: 500, completedTopics: ['Fractions'], currentStreak: 3,
    studyTimeMinutes: 60, assignmentsDone: 2, challengesCompleted: 1, lastLesson: 'Decimals',
    ...overrides,
  };
}

const TODAY = new Date().toISOString().split('T')[0];
const FUTURE = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
const PAST = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

function jsonRes(url: string, childrenPayload: any[]) {
  if (url.includes('/children') && !url.includes('credentials') && !url.includes('ai-report')) {
    return Promise.resolve({ ok: true, json: async () => childrenPayload });
  }
  if (url.includes('/weekly')) return Promise.resolve({ ok: true, json: async () => ({ days: [] }) });
  if (url.includes('/assignments')) {
    return Promise.resolve({
      ok: true,
      json: async () => [
        { id: 'a1', title: 'Overdue Worksheet', subject: 'Math', dueDate: PAST, status: 'pending' },
        { id: 'a2', title: 'Science Fair Prep', subject: 'Science', dueDate: FUTURE, status: 'pending' },
        { id: 'a3', title: 'Already Done', subject: 'English', dueDate: TODAY, status: 'completed' },
      ],
    });
  }
  if (url.includes('/ai-report')) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        subjectPerformance: [],
        metrics: { xp: 500, level: 3, currentStreak: 3, topicsCompleted: 4, assignmentsDone: 2, activeDaysThisWeek: 5 },
        report: { summary: 'Anaya is progressing well.', strengths: ['Fractions'], areas_for_improvement: [], recommendations: [], encouragement: 'Keep it up!' },
      }),
    });
  }
  if (url.includes('/attendance')) return Promise.resolve({ ok: true, json: async () => ({ summary: { presentDays: 18, totalDays: 20 } }) });
  if (url.includes('/credentials')) {
    return Promise.resolve({ ok: true, json: async () => ({ studentId: 'AN-1001', loginId: 'anaya@aivorah.demo', initialPassword: 'Sunshine42' }) });
  }
  return Promise.resolve({ ok: true, json: async () => ({}) });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { email: 'parent@aivorah.test', name: 'Meera Iyer', schoolId: null };
  mockNotifState = { unreadCount: 0, unreadAssignments: 0 };
});

describe('ParentDashboardScreen', () => {
  // Regression: the bell used to also navigate to Messages, so the tray opened over
  // the wrong screen and the parent lost their place on the dashboard.
  test('tapping the bell opens the notification tray in place — it does not navigate away', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;
    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);
    await waitFor(() => expect(screen.getByText('Welcome, Meera')).toBeTruthy());

    await fireEvent.press(screen.getByTestId('header-bell-button'));

    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalledWith('ParentMessages');
  });

  test('renders the real welcome header with the parent\'s real first name', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('Welcome, Meera')).toBeTruthy());
  });

  test('no real linked children -> the real "Add Child" empty state, no Weekly Snapshot section', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('Add Child')).toBeTruthy());
    expect(screen.queryByText(/Weekly Snapshot/)).toBeNull();
  });

  test('a real child renders their real name, grade, and status badge', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild({ currentStreak: 3, addedAt: '2020-01-01', lastActive: new Date().toISOString(), completedTopics: ['a', 'b', 'c', 'd'] })])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('Anaya')).toBeTruthy());
    expect(screen.getByText('Grade 4')).toBeTruthy();
    expect(screen.getByText('On Track')).toBeTruthy(); // active, established, 20% progress
    expect(screen.getByText("Anaya's Weekly Snapshot")).toBeTruthy();
  });

  test('a child with zero real activity shows "Getting Started", not a fake On Track/Keep Going', async () => {
    global.fetch = jest.fn((url: string) =>
      jsonRes(url, [rawChild({ xpPoints: 0, studyTimeMinutes: 0, completedTopics: [], currentStreak: 0 })])
    ) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    // "Getting Started" can legitimately appear twice — the child's real
    // status badge AND (independently) the "learning style" insight chip
    // both land on this same real label for a zero-activity child.
    await waitFor(() => expect(screen.getAllByText('Getting Started').length).toBeGreaterThan(0));
  });

  test('selecting a second real child switches the Weekly Snapshot to their real name', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild({ id: 'c1', name: 'Anaya' }), rawChild({ id: 'c2', name: 'Rohan', grade: 'Grade 2' })])) as any;
    const user = userEvent.setup();

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);
    await waitFor(() => expect(screen.getByText("Anaya's Weekly Snapshot")).toBeTruthy());

    await user.press(screen.getByText('Rohan'));

    await waitFor(() => expect(screen.getByText("Rohan's Weekly Snapshot")).toBeTruthy());
  });

  // Real business rule (dashboardHelpers-adjacent, lives inline in the
  // screen): only PENDING assignments due today or later are "upcoming" —
  // a long-overdue pending assignment or an already-completed one must
  // never show here.
  test('Upcoming Events shows only real pending, not-yet-due assignments — never overdue or completed ones', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('Science Fair Prep')).toBeTruthy());
    expect(screen.queryByText('Overdue Worksheet')).toBeNull();
    expect(screen.queryByText('Already Done')).toBeNull();
  });

  // Badges are derived from real thresholds on the selected child's data —
  // verify both a real earned badge and a real NOT-earned one stay honest.
  test('badges reflect real thresholds — a real 5-day streak earns "5 Day Streak", a real sub-1000 XP does not earn "1000 XP"', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild({ currentStreak: 5, xpPoints: 500 })])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('5 Day Streak')).toBeTruthy());
    expect(screen.queryByText('1000 XP')).toBeNull();
  });

  test('a real 1000+ XP child earns the real "1000 XP" badge', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild({ xpPoints: 1200 })])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('1000 XP')).toBeTruthy());
  });

  // A B2C parent (no schoolId) must never see school-only attendance data —
  // real gating in useParentDashboardData, verified end-to-end through the screen.
  test('a B2C parent (no schoolId) never shows real attendance data', async () => {
    mockUser = { email: 'parent@aivorah.test', name: 'Meera Iyer', schoolId: null };
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText("Anaya's Weekly Snapshot")).toBeTruthy());
    expect(screen.queryByText(/present/i)).toBeNull();
  });

  test('an unread assignment shows the real alert banner with the real count', async () => {
    mockNotifState = { unreadCount: 0, unreadAssignments: 2 };
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('2 new assignments for your child')).toBeTruthy());
  });

  test('no unread notifications -> no alert banner at all', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('Anaya')).toBeTruthy());
    expect(screen.queryByText(/new assignment/)).toBeNull();
    expect(screen.queryByText(/new message/)).toBeNull();
  });

  test('tapping a real child\'s key button opens the Credentials modal with real login info', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;
    const user = userEvent.setup();

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);
    await waitFor(() => expect(screen.getByTestId('child-card-creds-c1')).toBeTruthy());

    await user.press(screen.getByTestId('child-card-creds-c1'));

    await waitFor(() => expect(screen.getByText("Anaya's credentials")).toBeTruthy());
    expect(screen.getByText('AN-1001')).toBeTruthy();
    expect(screen.getByText('anaya@aivorah.demo')).toBeTruthy();
    expect(screen.getByText('Sunshine42')).toBeTruthy();
  });

  test('closing the Credentials modal removes it', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;
    const user = userEvent.setup();

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);
    await waitFor(() => expect(screen.getByTestId('child-card-creds-c1')).toBeTruthy());
    await user.press(screen.getByTestId('child-card-creds-c1'));
    await waitFor(() => expect(screen.getByText('Login Info')).toBeTruthy());

    await user.press(screen.getByText('Close'));

    await waitFor(() => expect(screen.queryByText('Login Info')).toBeNull());
  });

  // Real honest-empty-state rule in CredentialsModal: no saved password ->
  // a real explanatory message, never a fake/blank password field.
  test('a child with no saved password shows the real "Password not saved" message, not a blank field', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/credentials')) return Promise.resolve({ ok: true, json: async () => ({ studentId: 'AN-1001', loginId: 'anaya@aivorah.demo' }) });
      return jsonRes(url, [rawChild()]);
    }) as any;
    const user = userEvent.setup();

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);
    await waitFor(() => expect(screen.getByTestId('child-card-creds-c1')).toBeTruthy());
    await user.press(screen.getByTestId('child-card-creds-c1'));

    await waitFor(() => expect(screen.getByText(/Password not saved for this account/)).toBeTruthy());
  });

  // Regression test — "View Detailed Report" was previously dead: it called
  // navigation.navigate('ParentAIReports') while a fully-built ReportModal
  // sat unreachable in the same screen. Now it opens the real in-place modal.
  test('the AI Insight card\'s "View Detailed Report" opens the real ReportModal with real data, not just navigation', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;
    const user = userEvent.setup();

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);
    await waitFor(() => expect(screen.getByTestId('ai-insight-view-report')).toBeTruthy());

    await user.press(screen.getByTestId('ai-insight-view-report'));

    await waitFor(() => expect(screen.getByText('AI Performance Report')).toBeTruthy());
    expect(screen.getByText('Anaya is progressing well.')).toBeTruthy();
    expect(screen.getByText('Keep it up!', { exact: false })).toBeTruthy();
    // Did NOT navigate away — this is the in-place modal, not the full screen.
    expect(navigation.navigate).not.toHaveBeenCalledWith('ParentAIReports', expect.anything());
  });

  test('closing the Report modal removes it, and the dashboard is still on screen underneath', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;
    const user = userEvent.setup();

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);
    await waitFor(() => expect(screen.getByTestId('ai-insight-view-report')).toBeTruthy());
    await user.press(screen.getByTestId('ai-insight-view-report'));
    await waitFor(() => expect(screen.getByText('AI Performance Report')).toBeTruthy());

    await user.press(screen.getAllByText('Close')[0]);

    await waitFor(() => expect(screen.queryByText('AI Performance Report')).toBeNull());
    expect(screen.getByText('Anaya')).toBeTruthy();
  });

  // BottomGrid's "Subject Performance -> View Detailed Report" link is the
  // OTHER, deliberately distinct trigger (same button text, different
  // testID) — it still navigates to the full ParentAIReportsScreen rather
  // than opening the modal.
  test('Subject Performance\'s "View Detailed Report" still navigates to the full ParentAIReportsScreen', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild()])) as any;
    const user = userEvent.setup();

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: {} }} />);
    await waitFor(() => expect(screen.getByTestId('subject-performance-view-report')).toBeTruthy());

    await user.press(screen.getByTestId('subject-performance-view-report'));

    expect(navigation.navigate).toHaveBeenCalledWith('ParentAIReports', { childId: 'c1' });
  });

  test('a real childId route param selects that specific child on load, not just the first', async () => {
    global.fetch = jest.fn((url: string) => jsonRes(url, [rawChild({ id: 'c1', name: 'Anaya' }), rawChild({ id: 'c2', name: 'Rohan' })])) as any;

    await render(<ParentDashboardScreen navigation={navigation} route={{ params: { childId: 'c2' } }} />);

    await waitFor(() => expect(screen.getByText("Rohan's Weekly Snapshot")).toBeTruthy());
  });
});
