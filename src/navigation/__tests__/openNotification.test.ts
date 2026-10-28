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

  test('teacher feedback → Assignments (student) / ParentAssignments (parent), exact assignment', () => {
    const n = v2({ type: 'assignment_feedback', entityType: 'assignment', entityId: 'as-9', data: { assignmentId: 'as-9' } });
    expect(resolveNotificationTarget(toNotifItem(n), 'student'))
      .toEqual({ screen: 'Assignments', params: { highlightId: 'as-9' } });
    expect(resolveNotificationTarget(toNotifItem({ ...n, childId: 'kid-1' }), 'parent'))
      .toEqual({ screen: 'ParentAssignments', params: { childId: 'kid-1', highlightId: 'as-9' } });
    expect(toNotifItem(n).type).toBe('assignment');
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

  const eventRow = (o: Partial<V2Notification> = {}) => v2({
    type: 'event_scheduled', entityType: 'schedule_event', entityId: 'ev_1',
    data: { eventId: 'ev_1', eventType: 'lesson' }, ...o,
  });

  test('student event → Schedule, exact event; shown as an event item', () => {
    const item = toNotifItem(eventRow());
    expect(item).toEqual(expect.objectContaining({ type: 'event' }));
    expect(resolveNotificationTarget(item, 'student')).toEqual({ screen: 'Schedule', params: { highlightId: 'ev_1' } });
  });

  test('parent event → ParentSchedule for that child', () => {
    expect(resolveNotificationTarget(toNotifItem(eventRow({ childId: 'kid-1' })), 'parent'))
      .toEqual({ screen: 'ParentSchedule', params: { childId: 'kid-1', highlightId: 'ev_1' } });
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

  test('account_updated: maps to an account item, marks read, returns null, no navigation', () => {
    const a = actions();
    const navigate = jest.fn();
    const item = toNotifItem(v2({ id: 'n-acc', type: 'account_updated', entityType: 'user', entityId: 'u1', data: {} }));
    expect(item.type).toBe('account');
    expect(openNotification(item, { role: 'teacher', navigate, actions: a })).toBeNull();
    expect(a.markNotificationRead).toHaveBeenCalledWith('n-acc');
    expect(navigate).not.toHaveBeenCalled();
  });

  test('unknown type: marks read, does not navigate', () => {
    const a = actions();
    const navigate = jest.fn();
    const target = openNotification(legacy({ type: 'mystery' as any }), { role: 'student', navigate, actions: a });
    expect(target).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('class_post notifications', () => {
  const post = (o: Partial<V2Notification> = {}) => v2({
    type: 'class_post', entityType: 'class_post', entityId: 'post-7', title: 'New class post: Grade 5-A', body: 'Science fair!',
    data: { postId: 'post-7', grade: 'Grade 5', section: 'A' }, ...o,
  });

  test('maps to a portfolio item carrying the class + post', () => {
    expect(toNotifItem(post())).toMatchObject({ type: 'portfolio', grade: 'Grade 5', section: 'A', postId: 'post-7', subtitle: 'Science fair!' });
  });

  test.each([['student', null], ['parent', 'kid-1']])('%s tap opens that class\'s post', (role, childId) => {
    expect(resolveNotificationTarget(toNotifItem(post({ childId })), role))
      .toEqual({ screen: 'ClassDetail', params: { grade: 'Grade 5', section: 'A', postId: 'post-7', label: 'Grade 5 Portfolio' } });
  });

  test('opening marks only that V2 row read', () => {
    const actions = { markNotificationRead: jest.fn(), clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(), clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn() };
    const navigate = jest.fn();
    openNotification(toNotifItem(post()), { role: 'student', navigate, actions });
    expect(actions.markNotificationRead).toHaveBeenCalledWith('n1');
    expect(actions.clearUnreadEvents).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('ClassDetail', expect.objectContaining({ postId: 'post-7' }));
  });
});

describe('announcement notifications', () => {
  const ann = (o: Partial<V2Notification> = {}) => v2({
    type: 'announcement', entityType: 'announcement', entityId: 'ann-3', title: 'New announcement: Sports Day', body: 'Wear whites',
    data: { announcementId: 'ann-3', severity: 'info', displayType: 'both' }, ...o,
  });

  test('maps to an announcement item', () => {
    expect(toNotifItem(ann())).toMatchObject({ type: 'announcement', title: 'New announcement: Sports Day', subtitle: 'Wear whites' });
  });

  test.each([
    ['student', 'Announcements'], ['parent', 'ParentAnnouncements'],
    ['teacher', 'TeacherAnnouncements'], ['school_admin', 'SchoolAdminAnnouncements'],
  ])('%s tap opens that announcement in their inbox', (role, screen) => {
    expect(resolveNotificationTarget(toNotifItem(ann()), role)).toEqual({ screen, params: { openId: 'ann-3' } });
  });

  test('opening marks only that V2 row read', () => {
    const actions = { markNotificationRead: jest.fn(), clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(), clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn() };
    const navigate = jest.fn();
    openNotification(toNotifItem(ann()), { role: 'parent', navigate, actions });
    expect(actions.markNotificationRead).toHaveBeenCalledWith('n1');
    expect(navigate).toHaveBeenCalledWith('ParentAnnouncements', { openId: 'ann-3' });
  });
});
