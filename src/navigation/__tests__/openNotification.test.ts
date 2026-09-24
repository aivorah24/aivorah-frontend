import { openNotification, resolveNotificationTarget } from '../openNotification';
import type { NotifItem } from '../../context/notifItem';
import { toNotifItem } from '../../context/notifItem';
import type { V2Notification } from '../../services/notificationsApi';

const v2 = (o: Partial<V2Notification> = {}): V2Notification => ({
  id: 'n1', type: 'challenge_assigned', entityType: 'challenge_assignment', entityId: 'ca-1',
  childId: null, title: 'New challenge: Motion', body: 'Science', actorRole: 'teacher',
  data: { challengeId: 'ch-motion', challengeAssignmentId: 'ca-1' },
  createdAt: '2026-09-25T10:00:00Z', readAt: null, ...o,
});

const legacy = (o: Partial<NotifItem>): NotifItem => ({
  id: 'x', type: 'message', title: 't', subtitle: '', senderName: '', createdAt: '2026-09-25T10:00:00Z', ...o,
});

describe('resolveNotificationTarget — V2', () => {
  test('student challenge → Challenges, exact challenge, assigned tab', () => {
    expect(resolveNotificationTarget(toNotifItem(v2()), 'student'))
      .toEqual({ screen: 'Challenges', params: { highlightId: 'ch-motion', tab: 'assigned' } });
  });

  test('parent challenge → ParentChallenges with the child and the exact challenge', () => {
    expect(resolveNotificationTarget(toNotifItem(v2({ childId: 'kid-2' })), 'parent'))
      .toEqual({ screen: 'ParentChallenges', params: { childId: 'kid-2', highlightId: 'ch-motion' } });
  });

  test('student assignment → Assignments, exact assignment', () => {
    const n = v2({ type: 'assignment_assigned', entityType: 'assignment', entityId: 'as-9', data: { assignmentId: 'as-9' } });
    expect(resolveNotificationTarget(toNotifItem(n), 'student'))
      .toEqual({ screen: 'Assignments', params: { highlightId: 'as-9' } });
  });

  test('parent assignment → ParentAssignments with the child and the exact assignment', () => {
    const n = v2({ type: 'assignment_assigned', entityType: 'assignment', entityId: 'as-9', childId: 'kid-1', data: { assignmentId: 'as-9' } });
    expect(resolveNotificationTarget(toNotifItem(n), 'parent'))
      .toEqual({ screen: 'ParentAssignments', params: { childId: 'kid-1', highlightId: 'as-9' } });
  });

  test('the row (child_id), not the signed-in role, decides parent vs student routing', () => {
    // e.g. a teacher account that is also a parent
    expect(resolveNotificationTarget(toNotifItem(v2({ childId: 'kid-1' })), 'teacher')?.screen).toBe('ParentChallenges');
  });

  test('falls back to entityId when data refs are missing', () => {
    expect(resolveNotificationTarget(toNotifItem(v2({ data: {} })), 'student')?.params?.highlightId).toBe('ca-1');
  });

  test('due types route like their assigned counterparts', () => {
    expect(resolveNotificationTarget(toNotifItem(v2({ type: 'challenge_due' })), 'student')?.screen).toBe('Challenges');
  });
});

describe('resolveNotificationTarget — legacy items keep their existing routes', () => {
  test.each([
    ['message', legacy({ type: 'message', senderEmail: 't@x.com' }), 'parent', { screen: 'ParentMessages', params: { openWith: 't@x.com' } }],
    ['event', legacy({ type: 'event', id: 'evt_42' }), 'student', { screen: 'Schedule', params: { highlightId: '42' } }],
    ['task', legacy({ type: 'task' }), 'student', { screen: 'DailyHabits' }],
    ['legacy challenge', legacy({ type: 'challenge', id: 'ch-1' }), 'teacher', { screen: 'TeacherChallenges', params: { highlightId: 'ch-1', tab: 'assigned' } }],
    ['legacy quiz', legacy({ type: 'quiz', id: 'q-1' }), 'parent', { screen: 'ParentAssignments', params: { highlightId: 'q-1' } }],
  ])('%s', (_l, item, role, expected) => {
    expect(resolveNotificationTarget(item, role)).toEqual(expected);
  });
});

describe('openNotification', () => {
  const actions = () => ({
    markNotificationRead: jest.fn(), clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(),
    clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn(),
  });

  test('V2: marks only that notification read and navigates', () => {
    const a = actions();
    const navigate = jest.fn();
    openNotification(toNotifItem(v2({ id: 'n-7' })), { role: 'student', navigate, actions: a });
    expect(a.markNotificationRead).toHaveBeenCalledWith('n-7');
    expect(a.clearUnreadChallenges).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('Challenges', { highlightId: 'ch-motion', tab: 'assigned' });
  });

  test('legacy: keeps the category clears it had before', () => {
    const a = actions();
    openNotification(legacy({ type: 'challenge', id: 'ch-1' }), { role: 'student', navigate: jest.fn(), actions: a });
    expect(a.clearUnreadChallenges).toHaveBeenCalled();
    expect(a.markNotificationRead).not.toHaveBeenCalled();
  });

  test('unknown type: marks read, does not navigate', () => {
    const a = actions();
    const navigate = jest.fn();
    const target = openNotification(legacy({ type: 'mystery' as any }), { role: 'student', navigate, actions: a });
    expect(target).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
