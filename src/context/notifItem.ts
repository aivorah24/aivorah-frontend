// Pure notification item model shared by the context, router and UI (no React/Firebase imports).
import type { V2Notification } from '../services/notificationsApi';

export interface NotifItem {
  id: string;
  type: 'assignment' | 'quiz' | 'challenge' | 'message' | 'event' | 'task' | 'portfolio';
  senderEmail?: string;
  // For 'event' items, the source schedule type ('challenge' | 'deadline' | 'study' …).
  // A challenge's due-date event has srcType 'challenge' so it can be gated under the
  // Challenge Updates toggle rather than Assignment Alerts.
  srcType?: string | null;
  title: string;
  subtitle: string;
  senderName: string;
  createdAt: string;
  // V2 (persisted) notifications carry their own read state; legacy items are always unread.
  readAt?: string | null;
  v2?: V2Notification;
  // Portfolio deep-link fields
  grade?: string;
  section?: string;
  postId?: string;
}

export function isAssignmentType(n: V2Notification) {
  return n.type === 'assignment_assigned' || n.type === 'assignment_due';
}

export function toNotifItem(n: V2Notification): NotifItem {
  const isAssignment = isAssignmentType(n);
  return {
    id: n.id,
    type: isAssignment ? (n.data?.assignmentType === 'quiz' ? 'quiz' : 'assignment') : 'challenge',
    title: n.title,
    subtitle: n.body || '',
    senderName: '',
    createdAt: n.createdAt,
    readAt: n.readAt,
    v2: n,
  };
}
