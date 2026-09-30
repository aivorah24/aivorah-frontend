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
});

describe('AnnouncementProvider', () => {
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
