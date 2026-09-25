import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const MOCK_USER = { email: 'parent@test.ai', role: 'parent' };
jest.mock('../AuthContext', () => ({ useAuth: () => ({ user: MOCK_USER }) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockApi = {
  fetchNotifications: jest.fn(),
  fetchUnreadCount: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
};
jest.mock('../../services/notificationsApi', () => {
  class NotificationsUnavailableError extends Error {}
  return {
    NotificationsUnavailableError,
    fetchNotifications: (...a: any[]) => mockApi.fetchNotifications(...a),
    fetchUnreadCount: (...a: any[]) => mockApi.fetchUnreadCount(...a),
    markNotificationRead: (...a: any[]) => mockApi.markNotificationRead(...a),
    markAllNotificationsRead: (...a: any[]) => mockApi.markAllNotificationsRead(...a),
  };
});
const { NotificationsUnavailableError } = jest.requireMock('../../services/notificationsApi');

import { NotificationProvider, useNotification } from '../NotificationContext';

function Harness() {
  const n = useNotification();
  return (
    <View>
      <Text testID="order">{n.notificationItems.map(i => `${i.id}${i.readAt ? '(r)' : ''}`).join(',')}</Text>
      <Text testID="counts">{`a:${n.unreadAssignments} c:${n.unreadChallenges} m:${n.unreadCount}`}</Text>
      <Text testID="mode">{`${n.notificationsV2Active ? 'v2' : 'legacy'}|${n.feedStatus}|more:${n.hasMore}`}</Text>
      <Text testID="toast">{n.toastVisible ? n.toastItem?.id ?? 'none' : 'hidden'}</Text>
      <Pressable testID="read-c1" onPress={() => n.markNotificationRead('c1')} />
      <Pressable testID="more" onPress={() => n.loadMore()} />
      <Pressable testID="read-all" onPress={() => n.markAllRead()} />
    </View>
  );
}

const v2 = (id: string, createdAt: string, o: any = {}) => ({
  id, type: 'challenge_assigned', entityType: 'challenge_assignment', entityId: `ca-${id}`, childId: 'kid-1',
  title: `New challenge for Asha: ${id}`, body: null, data: { challengeId: `ch-${id}` }, actorRole: 'teacher',
  createdAt, readAt: null, ...o,
});
const C1 = v2('c1', '2026-09-25T10:00:00Z');
const A1 = v2('a1', '2026-09-25T09:00:00Z', { type: 'assignment_assigned', entityType: 'assignment', data: { assignmentId: 'a1' } });

let legacySummary: any;
let page: any[];
let unread: any[];

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  page = [C1, A1];
  unread = [C1, A1];
  legacySummary = {
    messages: 1, assignments: 3, challenges: 2, events: 0,
    latest: { id: 'm1', senderName: 'Ms Rao', senderEmail: 't@x.com', preview: 'hi', createdAt: '2026-09-25T09:30:00Z' },
    // Legacy (fake-message) challenge/assignment alerts — V2 must hide these.
    notificationItems: [
      { id: 'legacy-ch', type: 'challenge', title: 'Old', subtitle: '', senderName: 'Aivorah', createdAt: '2026-09-25T10:00:01Z' },
      { id: 'legacy-as', type: 'assignment', title: 'Old', subtitle: '', senderName: 'Aivorah', createdAt: '2026-09-25T09:00:01Z' },
    ],
  };
  global.fetch = jest.fn(async (url: string) => ({
    ok: true, json: async () => (String(url).includes('notifications-summary') ? legacySummary : {}),
  })) as any;
  mockApi.fetchNotifications.mockImplementation(async (opts: any = {}) => {
    if (opts.unreadOnly) return { items: unread, nextCursor: null };
    if (opts.cursor === 'cur-1') return { items: [v2('old1', '2026-09-20T10:00:00Z', { readAt: '2026-09-21T00:00:00Z' })], nextCursor: null };
    return { items: page, nextCursor: 'cur-1' };
  });
  mockApi.fetchUnreadCount.mockImplementation(async () => unread.length);
  mockApi.markNotificationRead.mockResolvedValue({});
  mockApi.markAllNotificationsRead.mockResolvedValue({ marked: 2 });
});
afterEach(() => jest.useRealTimers());

const mount = async () => {
  await render(<NotificationProvider><Harness /></NotificationProvider>);
  await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('v2|ready|more:true'));
};
const poll = async () => { await act(async () => { jest.advanceTimersByTime(8000); }); };

test('V2 rows replace legacy challenge/assignment alerts; chat stays; newest first', async () => {
  await mount();
  expect(screen.getByTestId('order')).toHaveTextContent('c1,msg_m1,a1');
  expect(screen.getByTestId('order')).not.toHaveTextContent(/legacy-/);
});

test('badge counts come from V2 unread rows (not the legacy counts)', async () => {
  await mount();
  expect(screen.getByTestId('counts')).toHaveTextContent(/a:1\ c:1\ m:1/);
});

test('opening one notification marks only that one read (optimistically) and calls the API with its id', async () => {
  await mount();
  await fireEvent.press(screen.getByTestId('read-c1'));
  await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('c1(r),msg_m1,a1'));
  expect(screen.getByTestId('counts')).toHaveTextContent(/a:1\ c:0/);
  expect(mockApi.markNotificationRead).toHaveBeenCalledTimes(1);
  expect(mockApi.markNotificationRead).toHaveBeenCalledWith('c1');
});

test('a poll that raced the read does not resurrect it as unread', async () => {
  await mount();
  await fireEvent.press(screen.getByTestId('read-c1'));
  await poll(); // server still reports c1 unread
  expect(screen.getByTestId('order')).toHaveTextContent(/c1\(r\)/);
  expect(screen.getByTestId('counts')).toHaveTextContent(/c:0/);
});

test('a newly arrived V2 notification toasts (existing ones at mount do not)', async () => {
  await mount();
  expect(screen.getByTestId('toast')).toHaveTextContent('hidden');
  const C2 = v2('c2', '2026-09-25T11:00:00Z');
  page = [C2, C1, A1];
  unread = [C2, C1, A1];
  await poll();
  await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('c2'));
  expect(screen.getByTestId('order')).toHaveTextContent('c2,c1,msg_m1,a1');
});

test('load more appends older pages after the first page', async () => {
  await mount();
  await fireEvent.press(screen.getByTestId('more'));
  await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('c1,msg_m1,a1,old1(r)'));
  expect(screen.getByTestId('mode')).toHaveTextContent(/more:false/);
  expect(mockApi.fetchNotifications).toHaveBeenCalledWith(expect.objectContaining({ cursor: 'cur-1' }));
});

test('mark all read marks every V2 row and calls read-all', async () => {
  await mount();
  await fireEvent.press(screen.getByTestId('read-all'));
  await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('c1(r),msg_m1,a1(r)'));
  expect(mockApi.markAllNotificationsRead).toHaveBeenCalled();
});

test('transient V2 error keeps the last V2 feed and reports error status (no flip to legacy)', async () => {
  await mount();
  mockApi.fetchNotifications.mockRejectedValue(new Error('500'));
  await poll();
  await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent(/v2\|error/));
  expect(screen.getByTestId('order')).toHaveTextContent('c1,msg_m1,a1');
});

test('V2 unavailable (e.g. 401 / no Firebase user) → full legacy feed, unchanged behaviour', async () => {
  mockApi.fetchNotifications.mockRejectedValue(new NotificationsUnavailableError('401'));
  mockApi.fetchUnreadCount.mockRejectedValue(new NotificationsUnavailableError('401'));
  await render(<NotificationProvider><Harness /></NotificationProvider>);
  await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent(/legacy\|ready/));
  expect(screen.getByTestId('order')).toHaveTextContent('legacy-ch,msg_m1,legacy-as');
  expect(screen.getByTestId('counts')).toHaveTextContent(/a:3\ c:2/);
  // Once unavailable, V2 isn't retried every poll.
  const calls = mockApi.fetchNotifications.mock.calls.length;
  await poll();
  expect(mockApi.fetchNotifications.mock.calls.length).toBe(calls);
});
