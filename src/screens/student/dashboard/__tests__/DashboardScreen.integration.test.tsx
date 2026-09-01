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

let mockUser: any = { email: 'a@a.com', name: 'A Student', grade: 'Grade 4', curriculum: 'IB PYP' };
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    get user() { return mockUser; },
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
  mockUser = { email: 'a@a.com', name: 'A Student', grade: 'Grade 4', curriculum: 'IB PYP' };
});

describe('DashboardScreen', () => {
  test('renders without crashing and shows the Learning Path section', async () => {
    await render(<DashboardScreen navigation={{ addListener: jest.fn(() => jest.fn()), navigate: jest.fn() }} route={{}} />);
    expect(await screen.findByText('Learning Path')).toBeTruthy();
    expect(screen.getByText('AIVORAH AI COACH')).toBeTruthy();
  });

  test('a real Grade 11 student with no curriculum set on their profile queries NCERT/CBSE, not IB PYP (which only covers Grade 1-5)', async () => {
    mockUser = { email: 'a@a.com', name: 'A Student', grade: 'Grade 11', curriculum: undefined };
    const calledUrls: string[] = [];
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      calledUrls.push(String(url));
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    await render(<DashboardScreen navigation={{ addListener: jest.fn(() => jest.fn()), navigate: jest.fn() }} route={{}} />);
    await screen.findByText('Learning Path');

    const curriculumUrls = calledUrls.filter((u) => u.includes('/curriculum'));
    // Real bug: an unset curriculum used to unconditionally fall back to
    // IB_PYP, which has no Grade 11 content and always came back empty —
    // even for CBSE/NCERT students whose profile just never had curriculum
    // explicitly set.
    expect(curriculumUrls.length).toBeGreaterThan(0);
    curriculumUrls.forEach((u) => expect(u).not.toContain('curriculum=IB_PYP'));
  });

  test('an API failure does not crash the screen — still renders the main sections', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
    await render(<DashboardScreen navigation={{ addListener: jest.fn(() => jest.fn()), navigate: jest.fn() }} route={{}} />);
    expect(await screen.findByText('Learning Path')).toBeTruthy();
  });
});
