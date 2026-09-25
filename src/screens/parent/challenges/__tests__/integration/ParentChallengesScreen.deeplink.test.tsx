import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ParentChallengesScreen from '../../ParentChallengesScreen';

jest.mock('@react-navigation/native', () => ({
  // Runs once per callback identity (like a real focus), not on every render.
  useFocusEffect: (cb: () => any) => require('react').useEffect(() => cb(), [cb]),
  useNavigation: () => ({ navigate: jest.fn(), openDrawer: jest.fn() }),
  useRoute: () => ({ name: 'ParentChallenges' }),
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
    textMain: '#000', textMuted: '#000', textDim: '#000', accentYellow: '#c90', accentGreen: '#0a0', accentRed: '#a00',
    accentOrange: '#f80', bgDark: '#111', cardDark: '#222', borderColor: '#333', background: '#fff', card: '#fff', border: '#ccc', text: '#000',
  } }),
}));

const ASHA = { id: 'kid-1', name: 'Asha', grade: 'Grade 3', curriculum: 'CBSE' };
const RAVI = { id: 'kid-2', name: 'Ravi', grade: 'Grade 5', curriculum: 'CBSE' };
const ch = (id: string, title: string, o: any = {}) => ({
  id, title, description: 'd', grade: 'Grade 5', curriculum: 'CBSE', subject: 'Science', chapterId: 1, topic: 't',
  difficulty: 'Easy', xpReward: 50, questionCount: 5, timeLimitMinutes: 10, type: 'quiz', category: 'Quiz', ...o,
});

function mockFetch() {
  (global as any).fetch = jest.fn((url: string) => {
    let body: any = {};
    if (url.includes('/parent/')) body = [ASHA, RAVI];
    else if (url.includes('/student/')) body = { xpPoints: 1 };
    else if (url.includes('/challenges?') && url.includes('studentId=kid-1')) body = [ch('ch-a', 'Asha Challenge', { grade: 'Grade 3' })];
    else if (url.includes('/challenges?') && url.includes('studentId=kid-2')) body = [ch('ch-motion', 'Motion Quiz', { status: 'assigned', assignmentId: 'ca-1' }), ch('ch-x', 'Other')];
    return Promise.resolve({ ok: true, json: async () => body });
  });
}

beforeEach(() => mockFetch());

test('notification deep link selects the right child and pins the exact challenge', async () => {
  const setParams = jest.fn();
  await render(<ParentChallengesScreen
    navigation={{ navigate: jest.fn(), openDrawer: jest.fn(), setParams }}
    route={{ params: { childId: 'kid-2', highlightId: 'ch-motion' } }}
  />);

  await waitFor(() => expect(screen.getByTestId('deeplink-challenge-ch-motion')).toBeTruthy());
  expect(screen.getByText('From your notification · Ravi')).toBeTruthy();
  expect(screen.getAllByText('Motion Quiz').length).toBeGreaterThanOrEqual(2); // pinned + in its group
  expect(screen.queryByText('Asha Challenge')).toBeNull(); // not the first child's list
  expect(setParams).toHaveBeenCalledWith({ childId: undefined, highlightId: undefined });
});

test('a challenge that is no longer in the child’s list shows a notice instead of silently doing nothing', async () => {
  await render(<ParentChallengesScreen
    navigation={{ navigate: jest.fn(), openDrawer: jest.fn(), setParams: jest.fn() }}
    route={{ params: { childId: 'kid-2', highlightId: 'ch-gone' } }}
  />);
  await waitFor(() => expect(screen.getByTestId('deeplink-missing-notice')).toBeTruthy());
  expect(screen.queryByTestId(/deeplink-challenge-/)).toBeNull();
});

test('a child that is not linked to this parent shows the notice and keeps the default child', async () => {
  await render(<ParentChallengesScreen
    navigation={{ navigate: jest.fn(), openDrawer: jest.fn(), setParams: jest.fn() }}
    route={{ params: { childId: 'someone-else', highlightId: 'ch-motion' } }}
  />);
  await waitFor(() => expect(screen.getByTestId('deeplink-missing-notice')).toBeTruthy());
  await waitFor(() => expect(screen.getByText('Asha Challenge')).toBeTruthy());
});

test('without deep-link params the screen behaves as before', async () => {
  await render(<ParentChallengesScreen navigation={{ navigate: jest.fn(), openDrawer: jest.fn() }} />);
  await waitFor(() => expect(screen.getByText('Asha Challenge')).toBeTruthy());
  expect(screen.queryByTestId(/deeplink-/)).toBeNull();
});
