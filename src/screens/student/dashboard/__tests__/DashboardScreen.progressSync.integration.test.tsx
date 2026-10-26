// Dashboard ↔ Learning Paths progress sync. Repro of the reported bug: a
// CBSE student (no curated syllabusRegistry data for their grade) finishes 2
// English chapters including quizzes, then returns to the dashboard. Every
// API response here is shaped like the real learning-paths / leaderboard
// service responses the Learning Paths screens consume.

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import DashboardScreen from '../DashboardScreen';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Dashboard', name: 'Dashboard' }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

const STATS = {
  studyTimeMinutes: 25, learningPathMinutes: 25, assignmentTimeMinutes: 0, challengeTimeMinutes: 0,
  topicsExplored: 4, xpPoints: 450, level: 1, challengesCompleted: 0, assignmentsDone: 0,
  currentStreak: 0, lastActiveDate: '2026-10-13', todayStudyMinutes: 25, todayXP: 450,
  // Both topics of "Bit and Wisdom" + "The Kite" passed; "A Tiger in the Zoo" opened.
  completedTopics: ['Bit and Wisdom: Reading', 'Bit and Wisdom: Poem', 'The Kite'],
  lastLesson: 'The Kite', totalTopics: 0,
  startedTopics: ['A Tiger in the Zoo: Part 1'],
};
let mockActivity: any = {};

jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'arjun@test.ai', name: 'Arjun Kumar', grade: 'Grade 9', curriculum: 'CBSE' },
    refreshProfile: jest.fn(),
  }),
}));

jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ stats: STATS, studentId: 'student-1', learningActivity: mockActivity }),
  formatStudyTime: (mins: number) => `${mins}m`,
  formatLevel: (level: number) => `Level ${level}`,
  xpForNextLevel: () => ({ current: 0, needed: 500, level: 1 }),
}));

jest.mock('../../../../context/ThemeContext', () => ({ useTheme: () => ({ colors: {}, isDark: false }) }));
jest.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 0, unreadAssignments: 0, unreadChallenges: 0, unreadEvents: 0, latestNotif: null,
    notificationItems: [], clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(),
    clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn(), unreadJoinRequests: 0,
  }),
}));
jest.mock('../../../../hooks/useResponsive', () => ({ useResponsive: () => ({ isMobile: false, isTablet: false }) }));

const SUBJECTS = {
  subjects: [
    { subject: 'Arts', chapters: [{ unitNo: 1, title: 'Colours Around Us' }, { unitNo: 2, title: 'Clay Modelling' }] },
    { subject: 'English', chapters: [{ unitNo: 1, title: 'Bit and Wisdom' }, { unitNo: 2, title: 'The Kite' }, { unitNo: 3, title: 'A Tiger in the Zoo' }] },
  ],
};
const SYLLABUS: Record<string, any> = {
  Arts: { units: [
    { unitNo: 1, title: 'Colours Around Us', topics: [{ id: 'a1', name: 'Primary Colours', kind: 'section' }] },
    { unitNo: 2, title: 'Clay Modelling', topics: [{ id: 'a2', name: 'Shaping Clay', kind: 'section' }] },
  ] },
  English: { units: [
    { unitNo: 1, title: 'Bit and Wisdom', topics: [{ id: 'e1', name: 'Bit and Wisdom: Reading', kind: 'section' }, { id: 'e2', name: 'Bit and Wisdom: Poem', kind: 'section' }] },
    { unitNo: 2, title: 'The Kite', topics: [{ id: 'e3', name: 'The Kite', kind: 'section' }] },
    { unitNo: 3, title: 'A Tiger in the Zoo', topics: [{ id: 'e4', name: 'A Tiger in the Zoo: Part 1', kind: 'section' }, { id: 'e5', name: 'A Tiger in the Zoo: Part 2', kind: 'section' }] },
  ] },
};
let mockPerf: any;
let mockWeekly: any;

function routeFetch(url: string) {
  const json = (data: any) => Promise.resolve({ ok: true, json: async () => data });
  if (url.includes('/curriculum/subjects')) return json(SUBJECTS);
  if (url.includes('/teacher/syllabus/current')) {
    const subject = decodeURIComponent(/subject=([^&]+)/.exec(url)![1]);
    return json(SYLLABUS[subject] ?? { units: [] });
  }
  if (url.includes('/performance')) return json(mockPerf);
  if (url.includes('/weekly')) return json(mockWeekly);
  return json({});
}

function makeNavigation() {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    navigate: jest.fn(),
    openDrawer: jest.fn(),
    addListener: jest.fn((event: string, cb: () => void) => {
      (listeners[event] ||= []).push(cb);
      return () => { listeners[event] = listeners[event].filter(f => f !== cb); };
    }),
    emit: (event: string) => (listeners[event] || []).forEach(f => f()),
  };
}

beforeEach(() => {
  // Weekly consistency counts "today" as active; pin it to the fixture's day.
  jest.useFakeTimers({ now: new Date('2026-10-13T10:00:00.000Z'), advanceTimers: true });
  mockActivity = {};
  mockPerf = {
    topics: {
      'Bit and Wisdom: Reading': { avgScore: 80, quizCount: 1, sessions: 0, lastActivity: '2026-10-13T08:00:00.000Z', subject: 'English' },
      'Bit and Wisdom: Poem': { avgScore: 70, quizCount: 1, sessions: 0, lastActivity: '2026-10-13T08:30:00.000Z', subject: 'English' },
      'The Kite': { avgScore: 90, quizCount: 1, sessions: 0, lastActivity: '2026-10-13T09:00:00.000Z', subject: 'English' },
    },
    avgScore: 80,
  };
  mockWeekly = { days: [
    { date: '2026-10-12', day: 'Mon', studyMinutes: 30, xp: 150, topicsCompleted: 1 },
    { date: '2026-10-13', day: 'Tue', studyMinutes: 25, xp: 450, topicsCompleted: 3 },
    { date: '2026-10-14', day: 'Wed', studyMinutes: 0, xp: 0, topicsCompleted: 0 },
  ] };
  global.fetch = jest.fn((url: string) => routeFetch(String(url))) as any;
});

afterEach(() => { jest.useRealTimers(); });

describe('DashboardScreen — Learning Path progress sync', () => {
  test('chapters, mastery, quiz score, consistency, continue learning and chapter status all reflect Learning Path progress', async () => {
    const navigation = makeNavigation();
    await render(<DashboardScreen navigation={navigation} route={{}} />);

    // Bug 4: chapter count (Goals card) — 2 finished of 5 total chapters.
    expect(await screen.findByText('2 / 5')).toBeTruthy();
    // Bug 2: Mastered pill.
    expect(screen.getByText('2/5')).toBeTruthy();
    // Bug 7: hero card.
    expect(screen.getByText(/2 of 5 chapters mastered/)).toBeTruthy();
    // Bug 1: quiz score shows, not "No quizzes yet"; best chapter is named.
    expect(screen.queryByText('No quizzes yet')).toBeNull();
    expect(screen.getByText('90%')).toBeTruthy();
    // Bug 3: orange Consistency pill (all 3 quizzes passed) + weekly (2 of 7 days).
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('29%')).toBeTruthy();
    // Bug 5: Continue Learning is English (the subject studied), not Arts;
    // the last topic is finished → Completed + next chapter suggested.
    expect(screen.getByText('English · Grade 9')).toBeTruthy();
    expect(screen.getByTestId('continue-learning-status')).toHaveTextContent('Completed');
    expect(screen.getByText(/Up next: Chapter 3 · A Tiger in the Zoo/)).toBeTruthy();
    // Bug 6: Learning Path card statuses (English is the default chip — most recently studied).
    expect(screen.getByTestId('chapter-status-English-1')).toHaveTextContent('Completed');
    expect(screen.getByTestId('chapter-status-English-2')).toHaveTextContent('Completed');
    expect(screen.getByTestId('chapter-status-English-3')).toHaveTextContent('In Progress');
  });

  test('reads chapters/topics from the learning-paths service, the same endpoints the Learning Paths screens use', async () => {
    await render(<DashboardScreen navigation={makeNavigation()} route={{}} />);
    await screen.findByText('2 / 5');
    const urls = (global.fetch as jest.Mock).mock.calls.map(c => String(c[0]));
    expect(urls.some(u => u.includes('learning-paths') && u.includes('/curriculum/subjects?grade=Grade%209&curriculum=CBSE'))).toBe(true);
    expect(urls.some(u => u.includes('/teacher/syllabus/current?grade=Grade%209&subject=English&curriculum=CBSE'))).toBe(true);
  });

  test('returning to the dashboard (focus) refetches progress and shows the new quiz without a reload', async () => {
    const navigation = makeNavigation();
    await render(<DashboardScreen navigation={navigation} route={{}} />);
    await screen.findByText('2 / 5');
    const perfCallsBefore = (global.fetch as jest.Mock).mock.calls.filter(c => String(c[0]).includes('/performance')).length;

    // Student goes off and fails the Tiger quiz (40%), then comes back.
    mockPerf = {
      ...mockPerf,
      topics: { ...mockPerf.topics, 'A Tiger in the Zoo: Part 1': { avgScore: 40, quizCount: 1, sessions: 0, lastActivity: '2026-10-13T11:00:00.000Z', subject: 'English' } },
      avgScore: 70,
    };
    await act(async () => { navigation.emit('focus'); });

    await waitFor(() => expect(screen.getByTestId('continue-learning-status')).toHaveTextContent('In progress'));
    expect(screen.getByText('A Tiger in the Zoo: Part 1')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy(); // consistency: 3 of 4 quizzes passed
    const perfCallsAfter = (global.fetch as jest.Mock).mock.calls.filter(c => String(c[0]).includes('/performance')).length;
    expect(perfCallsAfter).toBeGreaterThan(perfCallsBefore);
  });

  test('a quiz just finished on this device shows even if GET /performance has not caught up yet', async () => {
    mockPerf = { topics: {}, avgScore: null };
    mockActivity = { 'The Kite': { subject: 'English', quizzes: [{ score: 90, at: '2026-10-13T09:00:00.000Z' }] } };
    await render(<DashboardScreen navigation={makeNavigation()} route={{}} />);
    await screen.findByText('2 / 5');
    expect(screen.queryByText('No quizzes yet')).toBeNull();
    expect(screen.getAllByText('90%').length).toBeGreaterThan(0);
  });

  test('opened but unfinished topic: Continue Learning offers to resume that same topic', async () => {
    mockActivity = { 'A Tiger in the Zoo: Part 1': { lastOpenedAt: '2026-10-13T12:00:00.000Z' } };
    await render(<DashboardScreen navigation={makeNavigation()} route={{}} />);
    await screen.findByText('2 / 5');
    expect(screen.getByTestId('continue-learning-status')).toHaveTextContent('In progress');
    expect(screen.getByText('Resume')).toBeTruthy();
    expect(screen.getByText('A Tiger in the Zoo: Part 1')).toBeTruthy();
  });
});
