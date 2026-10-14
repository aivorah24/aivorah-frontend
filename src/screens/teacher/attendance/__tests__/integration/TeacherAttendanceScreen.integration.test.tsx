import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import TeacherAttendanceScreen from '../../TeacherAttendanceScreen';

jest.mock('../../../../../config/firebase', () => ({
  auth: { authStateReady: jest.fn().mockResolvedValue(undefined), currentUser: { getIdToken: jest.fn().mockResolvedValue('tok') } },
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentGreen: '#9a9', accentYellow: '#c90', accentRed: '#e33', textDim: '#999', textMain: '#111', textMuted: '#666', textHeading: '#000', borderColor: '#ddd', cardDark: '#fff', bgDark: '#fafafa' } }),
}));
jest.mock('../../../../../components/common/Header', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ title }: any) => <Text>{title}</Text> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => ({ __esModule: true, default: ({ children }: any) => children }));

type Handler = (url: string, init?: any) => { ok?: boolean; status?: number; body: any };
function mockApi(handler: Handler) {
  global.fetch = jest.fn((url: string, init?: any) => {
    const r = handler(String(url), init);
    return Promise.resolve({ ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body });
  }) as any;
}
const calls = () => (global.fetch as jest.Mock).mock.calls.map((c) => String(c[0]));

const CLASSES = { classes: [{ grade: 'Grade 5', section: 'A' }, { grade: 'Grade 5', section: 'B' }] };
const ROSTER = { date: '2026-09-15', students: [{ id: 's1', name: 'Asha Rao', status: 'present' }, { id: 's2', name: 'Ben Das', status: null }] };

describe('TeacherAttendanceScreen', () => {
  test('a teacher with no class sees "No classes assigned" and no chips', async () => {
    mockApi(() => ({ body: { classes: [] } }));
    await render(<TeacherAttendanceScreen navigation={{}} route={{ params: {} }} />);
    expect(await screen.findByTestId('attendance-empty')).toBeTruthy();
    expect(screen.getByText('No classes assigned')).toBeTruthy();
    expect(screen.queryByTestId('attendance-class-Grade 5-A')).toBeNull();
  });

  test('one chip per class; the first class loads with each status shown as selected', async () => {
    mockApi((url) => (url.includes('/classes/mine') ? { body: CLASSES } : { body: ROSTER }));
    await render(<TeacherAttendanceScreen navigation={{}} route={{ params: {} }} />);
    expect(await screen.findByTestId('attendance-class-Grade 5-A')).toBeTruthy();
    expect(screen.getByTestId('attendance-class-Grade 5-B')).toBeTruthy();
    expect(await screen.findByTestId('attendance-row-s1')).toBeTruthy();
    expect(screen.getByTestId('attendance-status-s1-present').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('attendance-status-s1-absent').props.accessibilityState).toEqual({ selected: false });
    expect(calls().some((u) => u.includes('/attendance/class?grade=Grade+5&section=A'))).toBe(true);
  });

  test('marking and saving shows "Saved" inline and reloads the day', async () => {
    let saved: any = null;
    mockApi((url, init) => {
      if (url.includes('/classes/mine')) return { body: CLASSES };
      if (url.includes('/attendance/save')) { saved = JSON.parse(init.body); return { body: { success: true } }; }
      return { body: ROSTER };
    });
    const user = userEvent.setup();
    await render(<TeacherAttendanceScreen navigation={{}} route={{ params: {} }} />);
    await user.press(await screen.findByTestId('attendance-status-s2-late'));
    expect(screen.getByTestId('attendance-status-s2-late').props.accessibilityState).toEqual({ selected: true });
    await user.press(screen.getByTestId('attendance-save'));
    await waitFor(() => expect(screen.getByTestId('attendance-save-message').props.children).toMatch(/Saved/));
    expect(StyleSheet.flatten(screen.getByTestId('attendance-save-message').props.style).color).toBe('#9a9');
    expect(saved.records).toEqual({ s1: 'present', s2: 'late' });
    expect(calls().filter((u) => u.includes('/attendance/class')).length).toBeGreaterThanOrEqual(2);
  });

  test('typing a full date loads that day', async () => {
    mockApi((url) => (url.includes('/classes/mine') ? { body: CLASSES } : { body: ROSTER }));
    const user = userEvent.setup();
    await render(<TeacherAttendanceScreen navigation={{}} route={{ params: {} }} />);
    await screen.findByTestId('attendance-row-s1');
    const input = screen.getByTestId('attendance-date');
    await user.clear(input);
    await user.type(input, '2026-09-15');
    await waitFor(() => expect(calls().some((u) => u.includes('date=2026-09-15'))).toBe(true));
  });

  test("a deep link to another teacher's class shows the error, no rows and no Save", async () => {
    mockApi((url) => (url.includes('/classes/mine') ? { body: { classes: [{ grade: 'Grade 5', section: 'A' }] } }
      : { ok: false, status: 403, body: { error: 'You are not the class teacher of this class' } }));
    await render(<TeacherAttendanceScreen navigation={{}} route={{ params: { grade: 'Grade 5', section: 'B' } }} />);
    expect(await screen.findByTestId('attendance-error')).toBeTruthy();
    expect(screen.getByText('You are not the class teacher of this class')).toBeTruthy();
    expect(screen.queryByTestId('attendance-save')).toBeNull();
    expect(calls().some((u) => u.includes('section=B'))).toBe(true);
  });

  test('stat cards and pills use Aivorah status tokens; Save is a compact centred gold button', async () => {
    mockApi((url) => (url.includes('/classes/mine') ? { body: CLASSES } : { body: ROSTER }));
    await render(<TeacherAttendanceScreen navigation={{}} route={{ params: {} }} />);
    await screen.findByTestId('attendance-row-s1');
    const st = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);
    expect(st('attendance-stat-present').color).toBe('#9a9');
    expect(st('attendance-stat-absent').color).toBe('#e33');
    expect(st('attendance-stat-late').color).toBe('#c90');
    expect(st('attendance-stat-unmarked').color).toBe('#999');
    expect(st('attendance-stat-card-absent').borderLeftColor).toBe('#e33');
    expect(st('attendance-status-s1-present').borderColor).toBe('#9a9');
    const save = st('attendance-save');
    expect(save).toMatchObject({ backgroundColor: '#c90', height: 44, paddingHorizontal: 24, borderRadius: 12, alignSelf: 'center' });
    expect(save.width).toBeUndefined();
  });
});
