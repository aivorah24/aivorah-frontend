import React from 'react';
import { Text, View } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { NotificationProvider, useNotification } from '../NotificationContext';

const MOCK_USER = { email: 'student@test.ai', role: 'student' };
jest.mock('../AuthContext', () => ({ useAuth: () => ({ user: MOCK_USER }) }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

function Harness() {
  const { notificationItems, toastItem, toastVisible } = useNotification();
  return (
    <View>
      <Text testID="order">{notificationItems.map(i => i.id).join(',')}</Text>
      <Text testID="toast">{toastVisible ? toastItem?.id ?? 'none' : 'hidden'}</Text>
    </View>
  );
}

const assignment = { id: 'a1', type: 'assignment', title: 'Ch6', subtitle: '', senderName: 'T', createdAt: '2026-09-19T09:00:00Z' };
let summary: any;

beforeEach(() => {
  jest.useFakeTimers();
  summary = { messages: 0, assignments: 1, challenges: 0, events: 0, latest: null, notificationItems: [assignment] };
  global.fetch = jest.fn(async (url: string) => ({
    ok: true,
    json: async () => (String(url).includes('notifications-summary') ? summary : {}),
  })) as any;
});

afterEach(() => jest.useRealTimers());

describe('NotificationContext — unified feed', () => {
  test('a new challenge toasts as the challenge even while assignments are unread', async () => {
    await render(<NotificationProvider><Harness /></NotificationProvider>);
    await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('a1'));

    summary = {
      ...summary, challenges: 1,
      notificationItems: [{ id: 'c1', type: 'challenge', title: 'Motion', subtitle: '', senderName: 'T', createdAt: '2026-09-20T10:00:00Z' }, assignment],
    };
    await act(async () => { jest.advanceTimersByTime(8000); });

    await waitFor(() => expect(screen.getByTestId('toast')).toHaveTextContent('c1'));
  });

  test('a newer chat message sits above older items, not at the bottom', async () => {
    summary = {
      ...summary, messages: 1,
      latest: { id: 'm1', senderName: 'Sandy S', senderEmail: 's@x.com', preview: 'hi', createdAt: '2026-09-20T12:00:00Z' },
    };
    await render(<NotificationProvider><Harness /></NotificationProvider>);
    await waitFor(() => expect(screen.getByTestId('order')).toHaveTextContent('msg_m1,a1'));
  });
});
