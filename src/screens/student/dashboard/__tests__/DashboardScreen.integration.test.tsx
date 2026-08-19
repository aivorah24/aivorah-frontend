// Integration smoke test for DashboardScreen — the real, live student
// dashboard. This screen has a large dependency surface (5 API calls,
// StudentDataContext, NotificationContext, react-navigation focus effects),
// so this test focuses on: does it render successfully with real data, and
// does it show a sensible empty/loading state without crashing. The
// calculation logic itself (avgScore, consistency, allBarTopics, etc.) is
// already covered by unit tests in utils/__tests__.

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DashboardScreen from '../DashboardScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Dashboard', name: 'Dashboard' }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

const ZERO_STATS = {
  studyTimeMinutes: 0, learningPathMinutes: 0, assignmentTimeMinutes: 0, challengeTimeMinutes: 0,
  topicsExplored: 0, xpPoints: 0, level: 1, challengesCompleted: 0, assignmentsDone: 0,
  currentStreak: 0, lastActiveDate: '', todayStudyMinutes: 0, todayXP: 0,
  completedTopics: [], lastLesson: '', totalTopics: 0,
};

jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'a@a.com', name: 'A Student', grade: 'Grade 4', curriculum: 'IB PYP' },
    refreshProfile: jest.fn(),
  }),
}));

jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ stats: ZERO_STATS, studentId: 'student-1' }),
  formatStudyTime: (mins: number) => `${mins}m`,
  formatLevel: (level: number) => `Level ${level}`,
  xpForNextLevel: () => 100,
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, isDark: true }),
}));

jest.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 0,
    unreadAssignments: 0,
    unreadChallenges: 0,
    unreadEvents: 0,
    latestNotif: null,
    notificationItems: [],
    clearUnread: jest.fn(),
    clearUnreadAssignments: jest.fn(),
    clearUnreadChallenges: jest.fn(),
    clearUnreadEvents: jest.fn(),
    unreadJoinRequests: 0,
  }),
}));

jest.mock('../../../../hooks/useResponsive', () => ({
  useResponsive: () => ({ isMobile: false, isTablet: false }),
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('DashboardScreen', () => {
  test('renders without crashing and shows the Learning Path section', async () => {
    await render(<DashboardScreen navigation={{ addListener: jest.fn(() => jest.fn()), navigate: jest.fn() }} route={{}} />);
    expect(await screen.findByText('Learning Path')).toBeTruthy();
    expect(screen.getByText('AIVORAH AI COACH')).toBeTruthy();
  });

  test('an API failure does not crash the screen — still renders the main sections', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    await render(<DashboardScreen navigation={{ addListener: jest.fn(() => jest.fn()), navigate: jest.fn() }} route={{}} />);
    expect(await screen.findByText('Learning Path')).toBeTruthy();
  });
});
