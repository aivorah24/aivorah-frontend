// Pure notification item model shared by the context, router and UI (no React/Firebase imports).
import type { V2Notification } from '../services/notificationsApi';

export interface NotifItem {
  id: string;
  type: 'assignment' | 'quiz' | 'challenge' | 'message' | 'event' | 'task' | 'portfolio' | 'account' | 'announcement';
  senderEmail?: string;
  // For 'event' items, the source schedule type ('challenge' | 'deadline' | 'study' …).
  // A challenge's due-date event has srcType 'challenge' so it can be gated under the
  // Challenge Updates toggle rather than Assignment Alerts.
  srcType?: string | null;
  // Legacy 'event' items: false = owned by V2 'event_scheduled' once the V2 feed is active;
  // true = due reminder auto-created with an assignment/challenge. Missing (older server) = keep.
  autoDue?: boolean;
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
  return n.type === 'assignment_assigned' || n.type === 'assignment_due' || n.type === 'assignment_feedback';
}

export function isEventType(n: V2Notification) {
  return n.type === 'event_scheduled';
}

// Platform-admin edits to the user's own account (role, school, grade…).
export function isAccountType(n: V2Notification) {
  return n.type === 'account_updated';
}

// Settings toggles: Assignment Alerts gates assignments + non-challenge events,
// Challenge Updates gates challenges + challenge events (same split as legacy).
export interface CategoryPrefs { assign: boolean; challenge: boolean }

export function isV2Allowed(n: V2Notification, p: CategoryPrefs) {
  if (isClassPostType(n) || isAnnouncementType(n) || isAccountType(n)) return true;
  if (isAssignmentType(n)) return p.assign;
  if (isEventType(n)) return n.data?.eventType === 'challenge' ? p.challenge : p.assign;
  return p.challenge;
}

export function isClassPostType(n: V2Notification) {
  return n.type === 'class_post';
}

export function isAnnouncementType(n: V2Notification) {
  return n.type === 'announcement';
}

// Legacy items that the V2 feed replaces when it is active.
export function isV2OwnedLegacy(i: NotifItem) {
  return i.type === 'assignment' || i.type === 'quiz' || i.type === 'challenge' || (i.type === 'event' && i.autoDue === false);
}

export function toNotifItem(n: V2Notification): NotifItem {
  // Class posts reuse the portfolio item shape (icon, deep link to the class feed).
  if (isClassPostType(n)) {
    return {
      id: n.id, type: 'portfolio', title: n.title, subtitle: n.body || '', senderName: '',
      createdAt: n.createdAt, readAt: n.readAt, v2: n,
      grade: n.data?.grade, section: n.data?.section, postId: n.data?.postId || n.entityId,
    };
  }
  if (isAnnouncementType(n)) {
    return { id: n.id, type: 'announcement', title: n.title, subtitle: n.body || '', senderName: '', createdAt: n.createdAt, readAt: n.readAt, v2: n };
  }
  const isAssignment = isAssignmentType(n);
  const type: NotifItem['type'] = isAccountType(n)
    ? 'account'
    : isEventType(n)
    ? 'event'
    : isAssignment ? (n.data?.assignmentType === 'quiz' ? 'quiz' : 'assignment') : 'challenge';
  return {
    id: n.id,
    type,
    title: n.title,
    subtitle: n.body || '',
    senderName: '',
    createdAt: n.createdAt,
    readAt: n.readAt,
    v2: n,
  };
}
