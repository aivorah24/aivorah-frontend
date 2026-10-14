import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import Header from '../Header';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn(), openDrawer: jest.fn() }),
}));
jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', accentYellow: '#fa0', accentGreen: '#0a0', accentRed: '#f00', textMain: '#fff',
    textMuted: '#888', textDim: '#666', borderColor: '#333', cardDark: '#111', cardHover: '#222',
  }, themeMode: 'dark', setThemeMode: jest.fn(), isDark: true }),
}));
let mockRole = 'parent';
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'p@x.com', name: 'Parent', role: mockRole }, updateUser: jest.fn(), logout: jest.fn() }),
}));

const v2 = (id: string, o: any = {}) => ({
  id, type: 'challenge_assigned', entityType: 'challenge_assignment', entityId: `ca-${id}`, childId: 'kid-2',
  title: `New challenge for Ravi: ${id}`, body: 'Science', data: { challengeId: `ch-${id}` }, actorRole: 'teacher',
  createdAt: '2026-09-25T10:00:00Z', readAt: null, ...o,
});
const item = (n: any) => ({
  id: n.id, type: n.type === 'assignment_assigned' ? 'assignment' : 'challenge', title: n.title, subtitle: n.body || '',
  senderName: '', createdAt: n.createdAt, readAt: n.readAt, v2: n,
});

const ctx: any = {};
jest.mock('../../../context/NotificationContext', () => ({ useNotification: () => ctx }));

beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'parent';
  Object.assign(ctx, {
    unreadCount: 1, unreadAssignments: 0, unreadChallenges: 1, unreadEvents: 0, unreadJoinRequests: 0,
    latestNotif: null,
    notificationItems: [
      item(v2('c9')),
      { id: 'msg_m1', type: 'message', title: 'Message from Ms Rao', subtitle: 'hi', senderName: 'Ms Rao', senderEmail: 't@x.com', createdAt: '2026-09-25T09:30:00Z' },
      item(v2('a1', { type: 'assignment_assigned', entityType: 'assignment', entityId: 'as-1', childId: 'kid-1', data: { assignmentId: 'as-1' }, readAt: '2026-09-25T09:10:00Z', createdAt: '2026-09-25T09:00:00Z' })),
    ],
    notificationsV2Active: true, feedStatus: 'ready', hasMore: true, loadingMore: false,
    loadMore: jest.fn(), markNotificationRead: jest.fn(), markAllRead: jest.fn(),
    clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(), clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn(),
    triggerPoll: jest.fn(),
  });
});

const openBell = async () => {
  await render(<Header title="Home" />);
  await fireEvent.press(screen.getByTestId('header-bell-button'));
};

test('renders the feed in the given (newest-first) order with unread dots only on unread items', async () => {
  await openBell();
  const titles = screen.getAllByText(/New challenge for Ravi|Message from|New challenge for Ravi: a1/).map(n => n.props.children);
  expect(titles[0]).toBe('New challenge for Ravi: c9');
  expect(titles[1]).toBe('Message from Ms Rao');
  expect(within(screen.getByTestId('notif-item-c9')).queryByTestId('notif-unread-dot')).toBeTruthy();
  expect(within(screen.getByTestId('notif-item-a1')).queryByTestId('notif-unread-dot')).toBeNull();
});

test('tapping a parent challenge marks only that one read and opens the right child + challenge', async () => {
  await openBell();
  await fireEvent.press(screen.getByTestId('notif-item-c9'));
  expect(ctx.markNotificationRead).toHaveBeenCalledTimes(1);
  expect(ctx.markNotificationRead).toHaveBeenCalledWith('c9');
  expect(ctx.clearUnreadChallenges).not.toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('ParentChallenges', { childId: 'kid-2', highlightId: 'ch-c9' });
});

test('tapping a parent assignment opens that child’s exact assignment', async () => {
  await openBell();
  await fireEvent.press(screen.getByTestId('notif-item-a1'));
  expect(mockNavigate).toHaveBeenCalledWith('ParentAssignments', { childId: 'kid-1', highlightId: 'as-1' });
});

test('student notifications route to the student screens', async () => {
  mockRole = 'student';
  ctx.notificationItems = [item(v2('c1', { childId: null }))];
  await openBell();
  await fireEvent.press(screen.getByTestId('notif-item-c1'));
  expect(mockNavigate).toHaveBeenCalledWith('Challenges', { highlightId: 'ch-c1', tab: 'assigned' });
});

test('account updates open a full-text detail card that can be closed', async () => {
  mockRole = 'student';
  const long = 'As per your request, an Aivorah administrator has updated your account (name: Manoharan). Please contact aivorah24@gmail.com if anything looks incorrect.';
  ctx.notificationItems = [{ ...item(v2('acc1', { type: 'account_updated', entityType: 'user', childId: null, title: 'Your name has been updated', body: long })), type: 'account' }];
  await openBell();
  await fireEvent.press(screen.getByTestId('notif-item-acc1'));
  expect(ctx.markNotificationRead).toHaveBeenCalledWith('acc1');
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(within(screen.getByTestId('notif-detail')).getByText(long)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('notif-detail-close'));
  expect(screen.queryByTestId('notif-detail')).toBeNull();
});

test('legacy chat items still open the conversation and clear chat unread', async () => {
  await openBell();
  await fireEvent.press(screen.getByTestId('notif-item-msg_m1'));
  expect(ctx.clearUnread).toHaveBeenCalled();
  expect(mockNavigate).toHaveBeenCalledWith('ParentMessages', { openWith: 't@x.com' });
});

test('"Load older notifications" pages the feed', async () => {
  await openBell();
  await fireEvent.press(screen.getByTestId('notif-load-more'));
  expect(ctx.loadMore).toHaveBeenCalled();
});

test('Mark all read uses the V2-aware markAllRead', async () => {
  await openBell();
  await fireEvent.press(screen.getByText('Mark all read'));
  expect(ctx.markAllRead).toHaveBeenCalled();
});

test('badge shows the unread total', async () => {
  await render(<Header title="Home" />);
  expect(within(screen.getByTestId('header-bell-badge')).getByText('2')).toBeTruthy();
});

test('loading and error states', async () => {
  Object.assign(ctx, { feedStatus: 'loading', notificationItems: [], unreadCount: 0, unreadChallenges: 0, hasMore: false });
  await openBell();
  expect(screen.getByTestId('notif-loading')).toBeTruthy();
});

test('error state keeps the last items visible with a hint', async () => {
  ctx.feedStatus = 'error';
  await openBell();
  expect(screen.getByTestId('notif-feed-error')).toBeTruthy();
  expect(screen.getByTestId('notif-item-c9')).toBeTruthy();
});
