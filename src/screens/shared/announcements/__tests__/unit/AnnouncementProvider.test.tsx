import React from 'react';
import { render, screen, waitFor, act, userEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { AnnouncementProvider, useAnnouncements } from '../../context/AnnouncementProvider';
import * as api from '../../services/announcementsApi';

jest.mock('../../services/announcementsApi', () => ({
  __esModule: true,
  fetchActiveAnnouncements: jest.fn(),
  dismissAnnouncement: jest.fn(),
}));

let mockUser: any = { email: 'a@x.com' };
let mockAuthed = true;
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: mockAuthed }),
}));

let mockToastItem: any = null;
jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({ toastItem: mockToastItem }),
}));

const mocked = api as jest.Mocked<typeof api>;

function Probe() {
  const { bannerAnnouncements, dismiss } = useAnnouncements();
  return (
    <>
      <Text>count:{bannerAnnouncements.length}</Text>
      {bannerAnnouncements.map((a) => (
        <TouchableOpacity key={a.id} onPress={() => dismiss(a.id)}>
          <Text>{a.title}</Text>
        </TouchableOpacity>
      ))}
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { email: 'a@x.com' };
  mockAuthed = true;
  mockToastItem = null;
});

describe('AnnouncementProvider', () => {
  it('refetches the banner as soon as an announcement notification arrives', async () => {
    mocked.fetchActiveAnnouncements.mockResolvedValue([]);
    const view = await render(<AnnouncementProvider><Probe /></AnnouncementProvider>);
    await waitFor(() => expect(mocked.fetchActiveAnnouncements).toHaveBeenCalledTimes(1));

    mocked.fetchActiveAnnouncements.mockResolvedValue([{ id: '9', title: 'Sports Day' } as any]);
    mockToastItem = { id: 'n1', type: 'announcement' };
    await view.rerender(<AnnouncementProvider><Probe /></AnnouncementProvider>);

    await waitFor(() => expect(screen.getByText('Sports Day')).toBeTruthy());
    expect(mocked.fetchActiveAnnouncements).toHaveBeenCalledTimes(2);
  });

  it('other notification types do not refetch', async () => {
    mocked.fetchActiveAnnouncements.mockResolvedValue([]);
    const view = await render(<AnnouncementProvider><Probe /></AnnouncementProvider>);
    await waitFor(() => expect(mocked.fetchActiveAnnouncements).toHaveBeenCalledTimes(1));
    mockToastItem = { id: 'n2', type: 'challenge' };
    await view.rerender(<AnnouncementProvider><Probe /></AnnouncementProvider>);
    expect(mocked.fetchActiveAnnouncements).toHaveBeenCalledTimes(1);
  });

  it('fetches banner announcements for an authenticated user', async () => {
    mocked.fetchActiveAnnouncements.mockResolvedValue([{ id: '1', title: 'Notice' } as any]);
    await render(<AnnouncementProvider><Probe /></AnnouncementProvider>);

    await waitFor(() => expect(screen.getByText('count:1')).toBeTruthy());
    expect(mocked.fetchActiveAnnouncements).toHaveBeenCalledWith('a@x.com', 'banner');
  });

  it('does not fetch and clears state when unauthenticated', async () => {
    mockAuthed = false;
    await render(<AnnouncementProvider><Probe /></AnnouncementProvider>);

    await waitFor(() => expect(screen.getByText('count:0')).toBeTruthy());
    expect(mocked.fetchActiveAnnouncements).not.toHaveBeenCalled();
  });

  it('keeps the last known list when a fetch fails', async () => {
    mocked.fetchActiveAnnouncements.mockRejectedValue(new Error('network'));
    await render(<AnnouncementProvider><Probe /></AnnouncementProvider>);

    await waitFor(() => expect(mocked.fetchActiveAnnouncements).toHaveBeenCalled());
    expect(screen.getByText('count:0')).toBeTruthy();
  });

  it('dismiss removes the item optimistically even if the request fails', async () => {
    mocked.fetchActiveAnnouncements.mockResolvedValue([{ id: '1', title: 'Notice' } as any]);
    mocked.dismissAnnouncement.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    await render(<AnnouncementProvider><Probe /></AnnouncementProvider>);

    await waitFor(() => expect(screen.getByText('Notice')).toBeTruthy());
    await user.press(screen.getByText('Notice'));

    await waitFor(() => expect(screen.getByText('count:0')).toBeTruthy());
    expect(mocked.dismissAnnouncement).toHaveBeenCalledWith('1', 'a@x.com');
  });
});
