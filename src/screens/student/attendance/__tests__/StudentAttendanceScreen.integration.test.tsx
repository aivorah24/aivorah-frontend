import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import StudentAttendanceScreen from '../StudentAttendanceScreen';

jest.mock('../../../../config/firebase', () => ({
  auth: { authStateReady: jest.fn().mockResolvedValue(undefined), currentUser: { getIdToken: jest.fn().mockResolvedValue('tok') } },
}));
jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentGreen: '#9a9', accentYellowGlow: 'rgba(0,0,0,0.1)', accentYellow: '#c90', accentRed: '#e33', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
let mockStudentId = 's1';
jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ studentId: mockStudentId }),
}));
jest.mock('../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));

const SUMMARY = {
  summary: { present: 8, absent: 1, late: 1, total: 10, ratePct: 80 },
  history: [
    { date: '2026-09-03', status: 'late' },
    { date: '2026-09-02', status: 'absent' },
    { date: '2026-09-01', status: 'present' },
  ],
};

beforeEach(() => {
  mockStudentId = 's1';
  global.fetch = jest.fn((url: string) => {
    const id = (String(url).match(/\/attendance\/student\/([^/]+)\/summary/) || [])[1];
    return Promise.resolve({ ok: true, json: async () => (id === 's1' ? SUMMARY : { summary: { present: 0, absent: 0, late: 0, total: 0, ratePct: null }, history: [] }) });
  }) as any;
});

const nav = { openDrawer: jest.fn(), navigate: jest.fn() };

describe('StudentAttendanceScreen', () => {
  test('shows the logged-in student\'s own counts, rate and history — no child picker', async () => {
    await render(<StudentAttendanceScreen navigation={nav} />);
    await waitFor(() => expect(screen.getByTestId('attendance-count-present').props.children).toBe(8));
    expect(screen.getByTestId('attendance-count-absent').props.children).toBe(1);
    expect(screen.getByTestId('attendance-count-late').props.children).toBe(1);
    expect(screen.getByText('80%')).toBeTruthy();
    expect(screen.getByTestId('attendance-history-row-2026-09-02')).toBeTruthy();
    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/attendance/student/s1/summary'))).toBe(true);
  });

  test('a student with no marks sees "No attendance recorded yet", never 100%', async () => {
    mockStudentId = 's2';
    await render(<StudentAttendanceScreen navigation={nav} />);
    await waitFor(() => expect(screen.getByText('No attendance recorded yet')).toBeTruthy());
    expect(screen.queryByText('100%')).toBeNull();
    expect(screen.getByTestId('attendance-count-present').props.children).toBe(0);
  });

  test('cards, log badges and calendar dots use Aivorah status tokens; today has a gold underline', async () => {
    jest.useFakeTimers({ now: new Date(2026, 8, 3, 10), doNotFake: ['setTimeout', 'setInterval', 'queueMicrotask', 'nextTick', 'setImmediate'] });
    try {
      await render(<StudentAttendanceScreen navigation={nav} />);
      await waitFor(() => expect(screen.getByTestId('attendance-count-present').props.children).toBe(8));
      const bg = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style).backgroundColor;
      const fg = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style).color;
      expect(fg('attendance-count-present')).toBe('#9a9');
      expect(fg('attendance-count-absent')).toBe('#e33');
      expect(fg('attendance-count-late')).toBe('#c90');
      expect(StyleSheet.flatten(screen.getByTestId('attendance-card-absent').props.style).borderLeftColor).toBe('#e33');
      expect(bg('attendance-badge-2026-09-01')).toBe('#9a918');
      expect(bg('attendance-badge-2026-09-02')).toBe('#e3318');
      expect(bg('attendance-day-dot-2026-09-01')).toBe('#9a9');
      expect(bg('attendance-day-dot-2026-09-02')).toBe('#e33');
      expect(bg('attendance-day-dot-2026-09-03')).toBe('#c90');
      expect(bg('attendance-day-today')).toBe('#c90');
    } finally {
      jest.useRealTimers();
    }
  });
});
