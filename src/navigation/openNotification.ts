// The single place that decides where a notification goes and what it marks
// read. Bell, toast and (later) push taps all call openNotification().
import type { NotifItem } from '../context/notifItem';

export type Role = 'student' | 'parent' | 'teacher' | string;

export interface NotificationTarget {
  screen: string;
  params?: Record<string, any>;
}

export interface OpenNotificationActions {
  markNotificationRead: (id: string) => void | Promise<void>;
  clearUnread: () => void | Promise<void>;
  clearUnreadAssignments: () => void | Promise<void>;
  clearUnreadChallenges: () => void | Promise<void>;
  clearUnreadEvents: () => void | Promise<void>;
}

export function screensForRole(role: Role) {
  return {
    assignments: role === 'teacher' ? 'TeacherAssignments' : role === 'parent' ? 'ParentAssignments' : 'Assignments',
    messages:    role === 'teacher' ? 'TeacherMessages'    : role === 'parent' ? 'ParentMessages'    : 'Messages',
    challenges:  role === 'teacher' ? 'TeacherChallenges'  : role === 'parent' ? 'ParentChallenges'  : 'Challenges',
    schedule:    role === 'teacher' ? 'TeacherSchedule'    : role === 'parent' ? 'ParentSchedule'    : 'Schedule',
    announcements: role === 'teacher' ? 'TeacherAnnouncements' : role === 'parent' ? 'ParentAnnouncements'
      : role === 'school_admin' ? 'SchoolAdminAnnouncements' : 'Announcements',
  };
}

// V2 rows carry child_id only for parent recipients, so the row itself (not the
// signed-in role) decides student vs parent routing.
function v2Target(item: NotifItem, role: Role): NotificationTarget | null {
  const n = item.v2!;
  const isParent = !!n.childId;
  const isChallenge = n.type === 'challenge_assigned' || n.type === 'challenge_due';
  const isAssignment = n.type === 'assignment_assigned' || n.type === 'assignment_due' || n.type === 'assignment_feedback';
  if (isChallenge) {
    const highlightId = n.data?.challengeId || n.entityId;
    return isParent
      ? { screen: 'ParentChallenges', params: { childId: n.childId, highlightId } }
      : { screen: 'Challenges', params: { highlightId, tab: 'assigned' } };
  }
  if (isAssignment) {
    const highlightId = n.data?.assignmentId || n.entityId;
    return isParent
      ? { screen: 'ParentAssignments', params: { childId: n.childId, highlightId } }
      : { screen: 'Assignments', params: { highlightId } };
  }
  if (n.type === 'account_updated') return null; // informational; opening just marks it read
  if (n.type === 'class_post') {
    const grade = n.data?.grade;
    return {
      screen: 'ClassDetail',
      params: { grade, section: n.data?.section ?? '', postId: n.data?.postId || n.entityId, label: `${grade || 'Class'} Portfolio` },
    };
  }
  if (n.type === 'announcement') {
    return { screen: screensForRole(role).announcements, params: { openId: n.data?.announcementId || n.entityId } };
  }
  if (n.type === 'event_scheduled') {
    const highlightId = n.data?.eventId || n.entityId;
    return isParent
      ? { screen: 'ParentSchedule', params: { childId: n.childId, highlightId } }
      : { screen: 'Schedule', params: { highlightId } };
  }
  return null;
}

function legacyTarget(item: NotifItem, role: Role): NotificationTarget | null {
  const s = screensForRole(role);
  switch (item.type) {
    case 'message':
      return { screen: s.messages, params: item.senderEmail ? { openWith: item.senderEmail } : undefined };
    case 'challenge':
      return { screen: s.challenges, params: { highlightId: item.id, tab: 'assigned' } };
    case 'event':
      return { screen: s.schedule, params: { highlightId: String(item.id).replace(/^evt_/, '') } };
    case 'portfolio':
      return {
        screen: 'ClassDetail',
        params: { grade: item.grade, section: item.section, postId: item.postId, label: `${item.grade || 'Class'} Portfolio` },
      };
    case 'task':
      return { screen: 'DailyHabits' };
    case 'assignment':
    case 'quiz':
      return { screen: s.assignments, params: { highlightId: item.id } };
    default:
      return null;
  }
}

export function resolveNotificationTarget(item: NotifItem, role: Role): NotificationTarget | null {
  return item.v2 ? v2Target(item, role) : legacyTarget(item, role);
}

function markOpened(item: NotifItem, actions: OpenNotificationActions) {
  if (item.v2) return actions.markNotificationRead(item.id);
  switch (item.type) {
    case 'message': return actions.clearUnread();
    case 'challenge': return actions.clearUnreadChallenges();
    case 'assignment':
    case 'quiz': return actions.clearUnreadAssignments();
    default: return actions.clearUnreadEvents(); // event, task, portfolio
  }
}

export function openNotification(
  item: NotifItem,
  { role, navigate, actions }: { role: Role; navigate: (screen: string, params?: Record<string, any>) => void; actions: OpenNotificationActions },
): NotificationTarget | null {
  void markOpened(item, actions);
  const target = resolveNotificationTarget(item, role);
  if (target) navigate(target.screen, target.params);
  return target;
}
