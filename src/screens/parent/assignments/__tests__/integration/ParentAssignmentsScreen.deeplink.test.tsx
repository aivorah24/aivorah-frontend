import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ParentAssignmentsScreen from '../../ParentAssignmentsScreen';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('@react-navigation/native', () => ({
  // Runs once per callback identity (like a real focus), not on every render.
  useFocusEffect: (cb: () => any) => require('react').useEffect(() => cb(), [cb]),
  useNavigation: () => ({ navigate: jest.fn(), openDrawer: jest.fn() }),
  useRoute: () => ({ name: 'ParentAssignments' }),
}));
jest.mock('../../../../../hooks/useResponsive', () => ({ useResponsive: () => ({ showPermanentSidebar: false }) }));
const MOCK_AUTH = { user: { email: 'parent@example.com' } };
jest.mock('../../../../../context/AuthContext', () => ({ useAuth: () => MOCK_AUTH }));
jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 0, unreadAssignments: 0, unreadChallenges: 0, unreadEvents: 0, unreadJoinRequests: 0,
    latestNotif: null, notificationItems: [], clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(),
    clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn(),
  }),
}));
jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    textMain: '#000', textMuted: '#000', textDim: '#000', accentYellow: '#000', accentRed: '#000', accentGreen: '#000',
    background: '#fff', card: '#fff', border: '#ccc', text: '#000', cardDark: '#111', borderColor: '#333', bgDark: '#000',
  } }),
}));

const ASHA = { id: 'kid-1', name: 'Asha', grade: 'Grade 3', curriculum: 'IB PYP' };
const RAVI = { id: 'kid-2', name: 'Ravi', grade: 'Grade 5', curriculum: 'IB PYP' };
const asg = (id: string, title: string, o: any = {}) => ({
  id, title, subject: 'Mathematics', dueDate: '2026-09-30', type: 'assignment', status: 'pending',
  score: null, note: '', createdBy: 'teacher', questions: [], ...o,
});

beforeEach(() => {
  (global as any).fetch = jest.fn((url: string) => {
    let body: any = {};
    if (url.includes('/parent/')) body = [ASHA, RAVI];
    else if (url.includes('/assignments?studentId=kid-1')) body = [asg('as-a', 'Asha Homework')];
    else if (url.includes('/assignments?studentId=kid-2')) body = [asg('as-7', 'Fractions Worksheet'), asg('as-8', 'Spelling')];
    else if (url.includes('/curriculum/subjects')) body = { subjects: [] };
    else if (url.includes('/curriculum')) body = { topics: [] };
    return Promise.resolve({ ok: true, json: async () => body });
  });
});

test('deep link selects the right child and opens that exact assignment’s details', async () => {
  const setParams = jest.fn();
  await render(<ParentAssignmentsScreen
    navigation={{ navigate: jest.fn(), openDrawer: jest.fn(), setParams }}
    route={{ params: { childId: 'kid-2', highlightId: 'as-7' } }}
  />);
  // Title shows in the list row and in the opened detail modal.
  await waitFor(() => expect(screen.getAllByText('Fractions Worksheet').length).toBe(2));
  expect(screen.getAllByText('Ravi · Grade 5').length).toBeGreaterThan(0);
  expect(screen.queryByText('Asha Homework')).toBeNull();
  expect(screen.getAllByText('Spelling').length).toBe(1); // only the linked one opened
  expect(setParams).toHaveBeenCalledWith({ childId: undefined, highlightId: undefined });
});

test('an assignment that no longer exists shows a notice', async () => {
  await render(<ParentAssignmentsScreen
    navigation={{ navigate: jest.fn(), openDrawer: jest.fn(), setParams: jest.fn() }}
    route={{ params: { childId: 'kid-2', highlightId: 'as-deleted' } }}
  />);
  await waitFor(() => expect(screen.getByTestId('deeplink-missing-notice')).toBeTruthy());
  expect(screen.getAllByText('Fractions Worksheet').length).toBe(1);
});
