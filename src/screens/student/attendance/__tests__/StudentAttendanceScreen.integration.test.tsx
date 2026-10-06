import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import StudentAttendanceScreen from '../StudentAttendanceScreen';

jest.mock('../../../../config/firebase', () => ({
  auth: { authStateReady: jest.fn().mockResolvedValue(undefined), currentUser: { getIdToken: jest.fn().mockResolvedValue('tok') } },
}));
jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#c90', accentRed: '#e33', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
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
});
