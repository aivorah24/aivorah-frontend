import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import ParentScheduleScreen from '../ParentScheduleScreen';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({ navigate: jest.fn(), openDrawer: jest.fn() }),
  useRoute: () => ({ name: 'ParentSchedule' }),
}));
jest.mock('../../../components/common/Header', () => () => null);
jest.mock('../../../components/common/ScreenLayout', () => ({ children }: any) => children);
jest.mock('../../../components/common/TimePicker', () => () => null);
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@example.com' } }),
}));
jest.mock('../../../services/authHeader', () => ({
  authHeader: jest.fn(async () => ({ Authorization: 'Bearer parent-token' })),
}));
jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      textMain: '#000', textMuted: '#000', textDim: '#000', accentYellow: '#c90',
      bgDark: '#111', cardDark: '#222', borderColor: '#333',
    },
  }),
}));

const CHILD = { id: 'child-1', name: 'Aanya', grade: 'Grade 3' };
const navigation = { navigate: jest.fn(), openDrawer: jest.fn() };

function mockApi({ children, saveOk = true }: { children: any[]; saveOk?: boolean }) {
  global.fetch = jest.fn((url: string, init?: any) => {
    if (url.includes('/children')) return Promise.resolve({ ok: true, json: async () => children });
    if (init?.method === 'POST') {
      return Promise.resolve({ ok: saveOk, status: saveOk ? 200 : 500, json: async () => ({ id: 'ev-1', ...JSON.parse(init.body) }) });
    }
    if (url.includes('/schedule/month')) return Promise.resolve({ ok: true, json: async () => ({ dates: [] }) });
    return Promise.resolve({ ok: true, json: async () => [] });
  }) as any;
}

function postBody() {
  const call = (global.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
  return call ? JSON.parse(call[1].body) : null;
}

beforeEach(() => jest.clearAllMocks());

test('a parent with no linked child is pointed to My Kids instead of an empty calendar', async () => {
  mockApi({ children: [] });
  const user = userEvent.setup();
  await render(<ParentScheduleScreen navigation={navigation} route={{}} />);

  const link = await screen.findByTestId('schedule-link-child');
  expect(screen.queryByText(/Add Event for/)).toBeNull();
  await user.press(link);
  expect(navigation.navigate).toHaveBeenCalledWith('ParentMyKids');
});

test("the child's upcoming deadlines exclude completed work", async () => {
  mockApi({ children: [CHILD] });
  await render(<ParentScheduleScreen navigation={navigation} route={{}} />);
  await screen.findAllByTestId(/^parent-schedule-slot-/);

  await waitFor(() => {
    const urls = (global.fetch as jest.Mock).mock.calls.map(([u]) => String(u));
    expect(urls.find(u => u.includes('/schedule/upcoming'))).toContain('hideCompleted=true');
  });
});

test('every schedule-service call (reads and the save) carries the signed-in token', async () => {
  mockApi({ children: [CHILD] });
  const user = userEvent.setup();
  await render(<ParentScheduleScreen navigation={navigation} route={{}} />);
  await user.press((await screen.findAllByTestId(/^parent-schedule-slot-.*-09:00$/))[0]);
  await user.type(screen.getByPlaceholderText(/title/i), 'Reading');
  await user.press(screen.getByText('Add Event'));
  await waitFor(() => expect(postBody()).not.toBeNull());

  const scheduleCalls = (global.fetch as jest.Mock).mock.calls.filter(([u]) => String(u).includes('/schedule'));
  expect(scheduleCalls.length).toBeGreaterThan(2);
  scheduleCalls.forEach(([, init]) => expect(init?.headers?.Authorization).toBe('Bearer parent-token'));
});

test('offers the parent event types, including Challenge, with no emoji', async () => {
  mockApi({ children: [CHILD] });
  const user = userEvent.setup();
  await render(<ParentScheduleScreen navigation={navigation} route={{}} />);
  await user.press((await screen.findAllByTestId(/^parent-schedule-slot-.*-09:00$/))[0]);

  const labels = screen.getAllByLabelText(/^Type: /).map(n => n.props.accessibilityLabel.replace('Type: ', ''));
  expect(labels).toEqual(['Study', 'Class', 'Homework', 'Assignment', 'Challenge', 'Activity', 'Break', 'Other']);
  labels.forEach(l => expect(l).not.toMatch(/\p{Extended_Pictographic}/u));
});

test('saving a Challenge sends a timed practice event with its tag for the linked child', async () => {
  mockApi({ children: [CHILD] });
  const user = userEvent.setup();
  await render(<ParentScheduleScreen navigation={navigation} route={{}} />);
  await user.press((await screen.findAllByTestId(/^parent-schedule-slot-.*-09:00$/))[0]);

  await user.type(screen.getByPlaceholderText(/title/i), 'Fractions practice');
  await user.press(screen.getByLabelText('Type: Challenge'));
  await user.press(screen.getByText('Add Event'));

  await waitFor(() => expect(postBody()).not.toBeNull());
  expect(postBody()).toMatchObject({
    title: 'Fractions practice', type: 'practice', tag: 'Challenge', studentId: 'child-1', createdBy: 'parent',
  });
});

test('a failed save keeps the form open with an error instead of silently closing', async () => {
  mockApi({ children: [CHILD], saveOk: false });
  const user = userEvent.setup();
  await render(<ParentScheduleScreen navigation={navigation} route={{}} />);
  await user.press((await screen.findAllByTestId(/^parent-schedule-slot-.*-09:00$/))[0]);

  await user.type(screen.getByPlaceholderText(/title/i), 'Reading');
  await user.press(screen.getByText('Add Event'));

  expect(await screen.findByTestId('schedule-save-error')).toBeTruthy();
  expect(screen.getByPlaceholderText(/title/i)).toBeTruthy();
});
