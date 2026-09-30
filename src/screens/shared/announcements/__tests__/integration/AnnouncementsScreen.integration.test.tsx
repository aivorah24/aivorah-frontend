import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import AnnouncementsScreen from '../../AnnouncementsScreen';
import * as api from '../../services/announcementsApi';

jest.mock('../../services/announcementsApi', () => ({
  __esModule: true,
  fetchInbox: jest.fn(),
  markSeen: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Announcements', name: 'Announcements' }),
  useFocusEffect: (cb: any) => { require('react').useEffect(() => { cb(); }, []); },
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@x.com' } }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#0B0B0B', cardDark: '#141414', cardHover: '#1A1A1A', borderColor: 'rgba(245,243,238,0.14)',
      textMain: '#F5F3EE', textMuted: '#A9B0AC', textDim: '#6E736B', textHeading: '#F5F3EE',
      accentYellow: '#BAA467', accentRed: '#C98A8A', primary: '#BAA467',
    },
  }),
}));

const mocked = api as jest.Mocked<typeof api>;
const ITEM_A = { id: '1', title: 'School closed Friday', body: 'Due to weather.', severity: 'warning', displayType: 'inbox', status: 'published', isSeen: false, createdByName: 'Admin', createdAt: '2026-01-01T00:00:00Z', attachments: [] };
const ITEM_B = { id: '2', title: 'Fee reminder', body: 'Due next week.', severity: 'info', displayType: 'inbox', status: 'published', isSeen: true, createdByName: 'Admin', createdAt: '2026-01-02T00:00:00Z', attachments: [] };

beforeEach(() => {
  jest.clearAllMocks();
  mocked.fetchInbox.mockResolvedValue({ items: [ITEM_A, ITEM_B], total: 2, page: 1, limit: 50 } as any);
});

describe('AnnouncementsScreen — integration', () => {
  it('loads and lists announcements with an unread count', async () => {
    await render(<AnnouncementsScreen navigation={{}} route={{}} />);

    await waitFor(() => expect(screen.getByText('School closed Friday')).toBeTruthy());
    expect(screen.getByText('Fee reminder')).toBeTruthy();
    expect(screen.getByText('Mark all read')).toBeTruthy();
  });

  it('search filters the list by title', async () => {
    const user = userEvent.setup();
    await render(<AnnouncementsScreen navigation={{}} route={{}} />);
    await waitFor(() => expect(screen.getByText('School closed Friday')).toBeTruthy());

    await user.type(screen.getByPlaceholderText('Search announcements'), 'fee');

    expect(screen.getByText('Fee reminder')).toBeTruthy();
    expect(screen.queryByText('School closed Friday')).toBeNull();
  });

  it('opening an unread item marks it seen', async () => {
    const user = userEvent.setup();
    await render(<AnnouncementsScreen navigation={{}} route={{}} />);
    await waitFor(() => expect(screen.getByText('School closed Friday')).toBeTruthy());

    await user.press(screen.getByText('School closed Friday'));

    await waitFor(() => expect(mocked.markSeen).toHaveBeenCalledWith('1', 'parent@x.com'));
  });

  it('mark all read calls markSeen for every unread item', async () => {
    const user = userEvent.setup();
    await render(<AnnouncementsScreen navigation={{}} route={{}} />);
    await waitFor(() => expect(screen.getByText('Mark all read')).toBeTruthy());

    await user.press(screen.getByText('Mark all read'));

    await waitFor(() => expect(mocked.markSeen).toHaveBeenCalledWith('1', 'parent@x.com'));
    expect(mocked.markSeen).toHaveBeenCalledTimes(1); // ITEM_B was already seen
  });
});
