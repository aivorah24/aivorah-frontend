const mockGetIdToken = jest.fn();
let mockCurrentUser: any = { getIdToken: mockGetIdToken };
jest.mock('../../config/firebase', () => ({ get auth() { return { currentUser: mockCurrentUser }; } }));

import {
  fetchNotifications, fetchUnreadCount, markNotificationRead, markAllNotificationsRead, NotificationsUnavailableError,
} from '../notificationsApi';
import MESSAGES_SERVER_URL from '../../config/messagesServerUrl';

const respond = (status: number, body: any = {}) =>
  (global.fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }) as any);

beforeEach(() => {
  mockCurrentUser = { getIdToken: mockGetIdToken };
  mockGetIdToken.mockResolvedValue('tok-123');
});

test('sends the Firebase ID token and never an email parameter', async () => {
  respond(200, { items: [], nextCursor: null });
  await fetchNotifications({ limit: 20, cursor: 'abc', unreadOnly: true });
  const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe(`${MESSAGES_SERVER_URL}/notifications?limit=20&cursor=abc&unreadOnly=true`);
  expect(url).not.toMatch(/email/i);
  expect(init.headers.Authorization).toBe('Bearer tok-123');
});

test('no signed-in Firebase user → NotificationsUnavailableError without a request', async () => {
  mockCurrentUser = null;
  global.fetch = jest.fn() as any;
  await expect(fetchUnreadCount()).rejects.toBeInstanceOf(NotificationsUnavailableError);
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each([401, 403, 404, 503])('%i → NotificationsUnavailableError (use legacy feed)', async (status) => {
  respond(status);
  await expect(fetchNotifications()).rejects.toBeInstanceOf(NotificationsUnavailableError);
});

test('500 → plain error (transient, keep V2)', async () => {
  respond(500);
  const err = await fetchNotifications().catch(e => e);
  expect(err).toBeInstanceOf(Error);
  expect(err).not.toBeInstanceOf(NotificationsUnavailableError);
});

test('mark read posts to that id only; read-all can be scoped by type', async () => {
  respond(200, { id: 'n1' });
  await markNotificationRead('n1');
  expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(`${MESSAGES_SERVER_URL}/notifications/n1/read`);
  respond(200, { marked: 2 });
  await markAllNotificationsRead('challenge_assigned');
  const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe(`${MESSAGES_SERVER_URL}/notifications/read-all`);
  expect(JSON.parse(init.body)).toEqual({ type: 'challenge_assigned' });
});

test('unread count returns the number', async () => {
  respond(200, { count: 7 });
  await expect(fetchUnreadCount()).resolves.toBe(7);
});
