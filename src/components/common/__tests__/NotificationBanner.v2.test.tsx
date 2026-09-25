import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import NotificationBanner from '../NotificationBanner';

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { cardDark: '#111', accentYellow: '#fa0', textMain: '#fff', textMuted: '#888', textDim: '#666' } }),
}));
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { email: 'p@x.com', role: 'parent' } }) }));

const ctx: any = {};
jest.mock('../../../context/NotificationContext', () => ({ useNotification: () => ctx }));

const toast = {
  id: 'n-5', type: 'assignment', title: 'New assignment for Asha: Fractions', subtitle: 'Mathematics · Due 30 Sept',
  senderName: '', createdAt: '2026-09-25T10:00:00Z', readAt: null,
  v2: {
    id: 'n-5', type: 'assignment_assigned', entityType: 'assignment', entityId: 'as-7', childId: 'kid-1',
    title: 'New assignment for Asha: Fractions', body: 'Mathematics · Due 30 Sept', data: { assignmentId: 'as-7' },
    actorRole: 'teacher', createdAt: '2026-09-25T10:00:00Z', readAt: null,
  },
};

beforeEach(() => {
  Object.assign(ctx, {
    toastVisible: true, toastItem: toast, latestNotif: null, unreadAssignments: 1, unreadChallenges: 0,
    notificationItems: [toast], dismissToast: jest.fn(),
    markNotificationRead: jest.fn(), clearUnread: jest.fn(), clearUnreadAssignments: jest.fn(),
    clearUnreadChallenges: jest.fn(), clearUnreadEvents: jest.fn(),
  });
});

test('shows the V2 title as-is (no double "New assignment:" prefix)', async () => {
  await render(<NotificationBanner onNavigate={jest.fn()} />);
  expect(await screen.findByText('New assignment for Asha: Fractions')).toBeTruthy();
});

test('tapping the toast uses the shared router: right child, exact assignment, only that item read', async () => {
  const onNavigate = jest.fn();
  await render(<NotificationBanner onNavigate={onNavigate} />);
  await fireEvent.press(await screen.findByTestId('notification-toast'));
  expect(ctx.dismissToast).toHaveBeenCalled();
  expect(ctx.markNotificationRead).toHaveBeenCalledWith('n-5');
  expect(ctx.clearUnreadAssignments).not.toHaveBeenCalled();
  expect(onNavigate).toHaveBeenCalledWith('ParentAssignments', { childId: 'kid-1', highlightId: 'as-7' });
});
