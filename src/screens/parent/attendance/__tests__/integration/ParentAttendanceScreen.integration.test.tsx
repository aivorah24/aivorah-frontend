import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import ParentAttendanceScreen from '../../ParentAttendanceScreen';

jest.mock('../../../../../config/firebase', () => ({
  auth: { authStateReady: jest.fn().mockResolvedValue(undefined), currentUser: { getIdToken: jest.fn().mockResolvedValue('tok') } },
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#c90', accentRed: '#e33', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
let mockUser: any = { email: 'p@a.com', schoolId: 'sch1' };
jest.mock('../../../../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('../../../../../features/classes/components/IndependentAccountEmpty', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text>connect-school</Text> };
});

const KIDS = [{ id: 'k1', name: 'Asha', grade: 'Grade 5' }, { id: 'k2', name: 'Ben', grade: 'Grade 3' }];
const SUMMARIES: Record<string, any> = {
  k1: { summary: { present: 1, absent: 1, late: 1, total: 3, ratePct: 50 }, history: [
    { date: '2026-09-03', status: 'late' }, { date: '2026-09-02', status: 'absent' }, { date: '2026-09-01', status: 'present' },
  ] },
  k2: { summary: { present: 0, absent: 0, late: 0, total: 0, ratePct: null }, history: [] },
};

beforeEach(() => {
  mockUser = { email: 'p@a.com', schoolId: 'sch1' };
  global.fetch = jest.fn((url: string) => {
    const u = String(url);
    if (u.includes('/parent/') && u.includes('/children')) return Promise.resolve({ ok: true, json: async () => KIDS });
    const id = (u.match(/\/attendance\/student\/([^/]+)\/summary/) || [])[1];
    return Promise.resolve({ ok: true, json: async () => SUMMARIES[id] });
  }) as any;
});

const nav = { openDrawer: jest.fn(), navigate: jest.fn() };

describe('ParentAttendanceScreen', () => {
  test("lists only the parent's own children, from the students service", async () => {
    await render(<ParentAttendanceScreen navigation={nav} route={{ params: {} }} />);
    expect(await screen.findByTestId('attendance-child-k1')).toBeTruthy();
    expect(screen.getByTestId('attendance-child-k2')).toBeTruthy();
    const urls = (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => /\/parent\/p%40a\.com\/children$/.test(u))).toBe(true);
  });

  test('counts, rate and the full history (every month) for the selected child', async () => {
    await render(<ParentAttendanceScreen navigation={nav} route={{ params: {} }} />);
    await waitFor(() => expect(screen.getByTestId('attendance-count-present').props.children).toBe(1));
    expect(screen.getByTestId('attendance-count-absent').props.children).toBe(1);
    expect(screen.getByTestId('attendance-count-late').props.children).toBe(1);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByTestId('attendance-history-row-2026-09-02')).toBeTruthy();
    expect(screen.getAllByText('Absent')).toHaveLength(2); // the count label and the history badge
    expect(screen.getByTestId('attendance-history-row-2026-09-03')).toBeTruthy();
  });

  test('a child with no marks shows "No attendance recorded yet", never 100%', async () => {
    const user = userEvent.setup();
    await render(<ParentAttendanceScreen navigation={nav} route={{ params: {} }} />);
    await user.press(await screen.findByTestId('attendance-child-k2'));
    await waitFor(() => expect(screen.getByText('No attendance recorded yet')).toBeTruthy());
    expect(screen.queryByText('100%')).toBeNull();
    expect(screen.getByTestId('attendance-count-present').props.children).toBe(0);
  });

  test('a childId route param opens that child', async () => {
    await render(<ParentAttendanceScreen navigation={nav} route={{ params: { childId: 'k2' } }} />);
    await waitFor(() => expect(screen.getByText('No attendance recorded yet')).toBeTruthy());
  });

  test('a parent with no school link sees the connect-school bridge and nothing is fetched', async () => {
    mockUser = { email: 'p@a.com' };
    await render(<ParentAttendanceScreen navigation={nav} route={{ params: {} }} />);
    expect(screen.getByText('connect-school')).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
