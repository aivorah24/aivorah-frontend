import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const MOCK_USER = { email: 'parent@test.ai', role: 'parent' };
const mockApplyAccountUpdate = jest.fn().mockResolvedValue(undefined);
jest.mock('../AuthContext', () => ({ useAuth: () => ({ user: MOCK_USER, applyAccountUpdate: mockApplyAccountUpdate }) }));
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
      <Text testID="counts">{`a:${n.unreadAssignments} c:${n.unreadChallenges} m:${n.unreadCount} e:${n.unreadEvents}`}</Text>
      <Text testID="mode">{`${n.notificationsV2Active ? 'v2' : 'legacy'}|${n.feedStatus}|more:${n.hasMore}`}</Text>
      <Text testID="toast">{n.toastVisible ? n.toastItem?.id ?? 'none' : 'hidden'}</Text>
      <Pressable testID="read-c1" onPress={() => n.markNotificationRead('c1')} />
      <Pressable testID="read-e1" onPress={() => n.markNotificationRead('e1')} />
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
    if (opts.cursor === 'cur-1') return { items: [v2('old1', '2026-09-20T10:00:00Z')], nextCursor: null };
    if (opts.limit === 50) return { items: unread, nextCursor: null };
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

test('the bell only asks the server for unread rows (active tray)', async () => {
  await mount();
  const listCalls = mockApi.fetchNotifications.mock.calls.map(c => c[0]);
  expect(listCalls.every((o: any) => o.unreadOnly === true)).toBe(true);
});

test('opening one notification removes only that one from the tray and calls the API with its id', async () => {
  await mount();
  await fireEvent.press(screen.getByTestId('read-c1'));
  await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('msg_m1,a1'));
  expect(screen.getByTestId('counts')).toHaveTextContent(/a:1\ c:0/);
  expect(mockApi.markNotificationRead).toHaveBeenCalledTimes(1);
  expect(mockApi.markNotificationRead).toHaveBeenCalledWith('c1');
});

test('a poll that raced the read does not resurrect it as unread', async () => {
  await mount();
  await fireEvent.press(screen.getByTestId('read-c1'));
  await poll(); // server still reports c1 unread
  expect(screen.getByTestId('order')).toHaveTextContent('msg_m1,a1');
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
  await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('c1,msg_m1,a1,old1'));
  expect(screen.getByTestId('mode')).toHaveTextContent(/more:false/);
  expect(mockApi.fetchNotifications).toHaveBeenCalledWith(expect.objectContaining({ cursor: 'cur-1', unreadOnly: true }));
});

test('mark all read empties the V2 tray and calls read-all', async () => {
  await mount();
  await fireEvent.press(screen.getByTestId('read-all'));
  // Also clears chat unread, so the tray is empty.
  await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent(''));
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

test('a notification cleared by the server (e.g. task completed) disappears on the next poll', async () => {
  await mount();
  page = [A1];
  unread = [A1];
  await poll();
  await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('msg_m1,a1'));
  expect(screen.getByTestId('counts')).toHaveTextContent(/a:1 c:0/);
});

describe('scheduled calendar events (V2 event_scheduled)', () => {
  const E1 = v2('e1', '2026-09-25T09:45:00Z', {
    type: 'event_scheduled', entityType: 'schedule_event', entityId: 'ev_1',
    title: 'New event for Asha: Math class', data: { eventId: 'ev_1', eventType: 'lesson' },
  });
  const legacyUserEvent = { id: 'evt_ev_1', type: 'event', srcType: 'lesson', autoDue: false, title: 'Math class', subtitle: '', senderName: 'Your teacher', createdAt: '2026-09-25T09:30:00Z' };
  const legacyDueEvent = { id: 'evt_due', type: 'event', srcType: 'deadline', autoDue: true, title: 'HW — Assignment due', subtitle: '', senderName: 'Your teacher', createdAt: '2026-09-25T08:00:00Z' };

  beforeEach(() => {
    page = [C1, E1, A1];
    unread = [C1, E1, A1];
    legacySummary.events = 2;
    legacySummary.notificationItems = [...legacySummary.notificationItems, legacyUserEvent, legacyDueEvent];
  });

  test('V2 event row replaces the legacy copy of the same event; auto due reminders stay', async () => {
    await mount();
    expect(screen.getByTestId('order')).toHaveTextContent('c1,e1,msg_m1,a1,evt_due');
    expect(screen.getByTestId('order')).not.toHaveTextContent('evt_ev_1');
  });

  test('V2 event rows count as events, not challenges', async () => {
    await mount();
    expect(screen.getByTestId('counts')).toHaveTextContent(/a:1 c:1 m:1 e:2/);
  });

  test('opening an event notification lowers the event count only', async () => {
    await mount();
    await fireEvent.press(screen.getByTestId('read-e1'));
    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent(/a:1 c:1 m:1 e:1/));
    expect(mockApi.markNotificationRead).toHaveBeenCalledWith('e1');
  });

  test('a newly arrived event notification toasts', async () => {
    await mount();
    const E2 = v2('e2', '2026-09-25T11:00:00Z', { type: 'event_scheduled', entityType: 'schedule_event', data: { eventId: 'ev_2' } });
    page = [E2, C1, E1, A1];
    unread = [E2, C1, E1, A1];
    await poll();
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('e2'));
  });

  test('an older server without autoDue: legacy events stay visible and counted (nothing lost)', async () => {
    legacySummary.notificationItems = legacySummary.notificationItems.map((i: any) => { const { autoDue, ...rest } = i; return rest; });
    await mount();
    expect(screen.getByTestId('order')).toHaveTextContent(/evt_ev_1.*evt_due/);
    expect(screen.getByTestId('counts')).toHaveTextContent(/e:3/);
  });

  test('with V2 on, a newly arrived legacy due reminder still toasts', async () => {
    await mount();
    legacySummary.notificationItems = [...legacySummary.notificationItems,
      { ...legacyDueEvent, id: 'evt_due2', createdAt: '2026-09-25T12:00:00Z' }];
    await poll();
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('evt_due2'));
  });

  test('mark all read clears the event count', async () => {
    await mount();
    await fireEvent.press(screen.getByTestId('read-all'));
    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent(/e:0/));
  });

  test('V2 unavailable → legacy event items are shown as before', async () => {
    mockApi.fetchNotifications.mockRejectedValue(new NotificationsUnavailableError('401'));
    mockApi.fetchUnreadCount.mockRejectedValue(new NotificationsUnavailableError('401'));
    await render(<NotificationProvider><Harness /></NotificationProvider>);
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent(/legacy\|ready/));
    expect(screen.getByTestId('order')).toHaveTextContent(/evt_ev_1.*evt_due/);
  });
});

describe('platform-admin account updates (V2 account_updated)', () => {
  const ACC = v2('acc1', '2026-09-25T12:00:00Z', {
    type: 'account_updated', entityType: 'user', entityId: 'u-parent', childId: null,
    title: 'Your name has been updated', data: {}, actorRole: 'platform_admin',
  });

  test('a new account_updated row (parent, no child) is listed, toasts and applies the update once', async () => {
    await mount();
    expect(mockApplyAccountUpdate).not.toHaveBeenCalled();
    page = [ACC, C1, A1];
    unread = [ACC, C1, A1];
    await poll();
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('acc1'));
    expect(screen.getByTestId('order')).toHaveTextContent(/^acc1,/);
    expect(mockApplyAccountUpdate).toHaveBeenCalledTimes(1);
    await poll(); // already seen → not applied again
    expect(mockApplyAccountUpdate).toHaveBeenCalledTimes(1);
  });

  test('other arrivals and account rows already present at mount do not trigger it', async () => {
    page = [ACC, C1, A1];
    unread = [ACC, C1, A1];
    await mount();
    const C2 = v2('c2', '2026-09-25T13:00:00Z');
    page = [C2, ACC, C1, A1];
    unread = [C2, ACC, C1, A1];
    await poll();
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('c2'));
    expect(mockApplyAccountUpdate).not.toHaveBeenCalled();
  });
});

describe('category toggles gate V2 rows (student + parent)', () => {
  const AsyncStorage = jest.requireMock('@react-native-async-storage/async-storage');
  const E1 = v2('e1', '2026-09-25T09:45:00Z', {
    type: 'event_scheduled', entityType: 'schedule_event', data: { eventId: 'ev_1', eventType: 'lesson' },
  });
  const setPrefs = (prefs: any) => AsyncStorage.getItem.mockImplementation(async (k: string) =>
    (k.startsWith('notifPrefs_') ? JSON.stringify(prefs) : null));
  afterEach(() => AsyncStorage.getItem.mockImplementation(async () => null));

  test('Assignment Alerts OFF hides V2 assignment + event rows from the bell and badge', async () => {
    page = [C1, E1, A1];
    unread = [C1, E1, A1];
    setPrefs({ assignmentAlerts: false });
    await mount();
    expect(screen.getByTestId('order')).toHaveTextContent('c1,msg_m1');
    expect(screen.getByTestId('counts')).toHaveTextContent(/a:0 c:1 m:1 e:0/);
  });

  test('Challenge Updates OFF hides V2 challenge rows from the bell and badge', async () => {
    setPrefs({ challengeUpdates: false });
    await mount();
    expect(screen.getByTestId('order')).toHaveTextContent('msg_m1,a1');
    expect(screen.getByTestId('counts')).toHaveTextContent(/a:1 c:0/);
  });

  test('a newly arrived row in a muted category does not toast', async () => {
    setPrefs({ challengeUpdates: false });
    await mount();
    const C2 = v2('c2', '2026-09-25T11:00:00Z');
    page = [C2, C1, A1];
    unread = [C2, C1, A1];
    await poll();
    expect(screen.getByTestId('toast')).toHaveTextContent('hidden');
    expect(screen.getByTestId('order')).not.toHaveTextContent('c2');
  });

  test('muteCategory hides V2 rows immediately, before the next poll', async () => {
    let mute: (k: 'assignmentAlerts' | 'challengeUpdates') => void = () => {};
    function Grab() { const { muteCategory } = useNotification(); React.useEffect(() => { mute = muteCategory; }); return null; }
    await render(<NotificationProvider><Harness /><Grab /></NotificationProvider>);
    await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('c1,msg_m1,a1'));
    await act(async () => { mute('assignmentAlerts'); });
    expect(screen.getByTestId('order')).toHaveTextContent('c1,msg_m1');
  });

  test('account updates are never muted by Challenge Updates OFF', async () => {
    setPrefs({ challengeUpdates: false });
    await mount();
    const ACC = v2('acc2', '2026-09-25T12:00:00Z', {
      type: 'account_updated', entityType: 'user', entityId: 'u-parent', childId: null, title: 'Your grade has been updated', data: {},
    });
    page = [ACC, C1, A1];
    unread = [ACC, C1, A1];
    await poll();
    await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent(/^acc2,/));
    expect(mockApplyAccountUpdate).toHaveBeenCalledTimes(1);
  });

  test('turning the toggle back ON shows the category again', async () => {
    setPrefs({ challengeUpdates: false });
    await mount();
    expect(screen.getByTestId('order')).not.toHaveTextContent('c1');
    setPrefs({ challengeUpdates: true });
    await poll();
    await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('c1,msg_m1,a1'));
  });
});

describe('V2 class posts', () => {
  const P1 = v2('p1', '2026-09-25T11:00:00Z', {
    type: 'class_post', entityType: 'class_post', entityId: 'post-1', title: 'New class post for Asha: Grade 5-A',
    data: { postId: 'post-1', grade: 'Grade 5', section: 'A' },
  });

  test('a newly published class post shows in the bell and toasts', async () => {
    await mount();
    page = [P1, C1, A1];
    unread = [P1, C1, A1];
    await poll();
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('p1'));
    expect(screen.getByTestId('order')).toHaveTextContent(/^p1,c1/);
  });

  test('class posts never inflate the challenge badge', async () => {
    page = [P1, C1, A1];
    unread = [P1, C1, A1];
    await mount();
    expect(screen.getByTestId('counts')).toHaveTextContent(/a:1 c:1 m:1/);
  });
});

describe('V2 announcements', () => {
  const N1 = v2('n1', '2026-09-25T11:00:00Z', {
    type: 'announcement', entityType: 'announcement', entityId: 'ann-1', title: 'New announcement: Sports Day',
    data: { announcementId: 'ann-1', severity: 'info', displayType: 'both' },
  });

  test('a newly published announcement shows in the bell and toasts', async () => {
    await mount();
    page = [N1, C1, A1];
    unread = [N1, C1, A1];
    await poll();
    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('n1'));
    expect(screen.getByTestId('order')).toHaveTextContent(/^n1,c1/);
  });

  test('announcements never inflate the challenge badge', async () => {
    page = [N1, C1, A1];
    unread = [N1, C1, A1];
    await mount();
    expect(screen.getByTestId('counts')).toHaveTextContent(/a:1 c:1 m:1/);
  });
});
