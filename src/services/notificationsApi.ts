// Client for messages-service Notification V2 (/notifications). Identity comes
// from the Firebase ID token, never from an email parameter.
import MESSAGES_SERVER_URL from '../config/messagesServerUrl';

export type V2NotificationType = 'challenge_assigned' | 'assignment_assigned' | 'challenge_due' | 'assignment_due' | 'event_scheduled' | 'class_post' | 'announcement' | 'account_updated' | 'assignment_feedback';

export interface V2Notification {
  id: string;
  type: V2NotificationType;
  entityType: 'challenge_assignment' | 'assignment' | 'schedule_event' | 'class_post' | 'announcement' | 'user';
  entityId: string;
  childId: string | null;
  title: string;
  body: string | null;
  data: {
    challengeId?: string;
    challengeAssignmentId?: string;
    assignmentId?: string;
    assignmentType?: string;
    subject?: string | null;
    dueDate?: string | null;
    childId?: string;
    eventId?: string;
    date?: string;
    startTime?: string | null;
    eventType?: string | null;
    creatorRole?: string;
    // class_post
    postId?: string;
    grade?: string;
    section?: string;
    // announcement
    announcementId?: string;
    severity?: 'info' | 'warning' | 'critical';
    displayType?: 'banner' | 'inbox' | 'both';
  };
  actorRole: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface V2Page {
  items: V2Notification[];
  nextCursor: string | null;
}

// Auth/deployment problems (no token, 401/403/404/503): V2 can't serve this
// user, so the caller should fall back to the legacy feed for the session.
export class NotificationsUnavailableError extends Error {
  constructor(public status: number | null, message: string) {
    super(message);
    this.name = 'NotificationsUnavailableError';
  }
}

const UNAVAILABLE_STATUSES = [401, 403, 404, 503];

// Firebase is loaded lazily so screens/tests that never reach V2 don't pull it in.
// Waits for Firebase to finish restoring the session: on web the app shows the
// cached profile first, and currentUser is still null for a moment after load.
async function currentFirebaseUser(): Promise<{ getIdToken: () => Promise<string> } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose (see above)
    const auth = require('../config/firebase').auth;
    await auth?.authStateReady?.();
    return auth?.currentUser ?? null;
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await (await currentFirebaseUser())?.getIdToken().catch(() => null);
  if (!token) throw new NotificationsUnavailableError(null, 'No signed-in Firebase user');
  return { Authorization: `Bearer ${token}` };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(await authHeaders()), ...(init.body ? { 'Content-Type': 'application/json' } : {}) };
  const res = await fetch(`${MESSAGES_SERVER_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers as any) } });
  if (UNAVAILABLE_STATUSES.includes(res.status)) {
    throw new NotificationsUnavailableError(res.status, `Notifications API returned ${res.status}`);
  }
  if (!res.ok) throw new Error(`Notifications API returned ${res.status}`);
  return res.json();
}

export function fetchNotifications(opts: { cursor?: string | null; limit?: number; unreadOnly?: boolean } = {}): Promise<V2Page> {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.unreadOnly) params.set('unreadOnly', 'true');
  const qs = params.toString();
  return call<V2Page>(`/notifications${qs ? `?${qs}` : ''}`);
}

export async function fetchUnreadCount(): Promise<number> {
  const { count } = await call<{ count: number }>('/notifications/unread-count');
  return Number.isFinite(count) ? count : 0;
}

export function markNotificationRead(id: string): Promise<V2Notification> {
  return call<V2Notification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
}

export function markAllNotificationsRead(type?: V2NotificationType): Promise<{ marked: number }> {
  return call<{ marked: number }>('/notifications/read-all', { method: 'POST', body: JSON.stringify(type ? { type } : {}) });
}
