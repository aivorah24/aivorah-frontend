import { isAccountType, isV2OwnedLegacy, toNotifItem } from '../notifItem';
import type { V2Notification } from '../../services/notificationsApi';

const row = (o: Partial<V2Notification> = {}): V2Notification => ({
  id: 'n1', type: 'account_updated', entityType: 'user', entityId: 'u1', childId: null,
  title: 'Your role has been updated to Teacher', body: 'role: Teacher', actorRole: 'platform_admin',
  data: {}, createdAt: '2026-10-13T10:00:00Z', readAt: null, ...o,
});

describe('toNotifItem', () => {
  test("'account_updated' maps to an 'account' item with title/body/read state", () => {
    expect(toNotifItem(row())).toEqual(expect.objectContaining({
      id: 'n1', type: 'account', title: 'Your role has been updated to Teacher', subtitle: 'role: Teacher', readAt: null,
    }));
  });

  test('missing body becomes an empty subtitle', () => {
    expect(toNotifItem(row({ body: null })).subtitle).toBe('');
  });

  test('isAccountType only matches account_updated', () => {
    expect(isAccountType(row())).toBe(true);
    expect(isAccountType(row({ type: 'event_scheduled' }))).toBe(false);
  });

  test('account items are not treated as V2-owned legacy items', () => {
    expect(isV2OwnedLegacy(toNotifItem(row()))).toBe(false);
  });

  test('other V2 types keep their mapping', () => {
    expect(toNotifItem(row({ type: 'event_scheduled', entityType: 'schedule_event' })).type).toBe('event');
    expect(toNotifItem(row({ type: 'assignment_assigned', entityType: 'assignment', data: { assignmentType: 'quiz' } })).type).toBe('quiz');
    expect(toNotifItem(row({ type: 'challenge_assigned', entityType: 'challenge_assignment' })).type).toBe('challenge');
  });
});
