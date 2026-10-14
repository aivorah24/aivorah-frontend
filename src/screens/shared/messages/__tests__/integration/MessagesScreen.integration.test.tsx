import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import MessagesScreen from '../../MessagesScreen';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Messages', name: 'Messages' }),
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Admin User', email: 'admin@school.test', role: 'school_admin' } }),
}));

jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({ refresh: jest.fn() }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      bgDark: '#0B0B0B', cardDark: '#141414', cardHover: '#1A1A1A', borderColor: 'rgba(245,243,238,0.14)',
      textMain: '#F5F3EE', textMuted: '#A9B0AC', textDim: '#6E736B', textHeading: '#F5F3EE',
      accentYellow: '#BAA467', accentGreen: '#4CAF50', accentRed: '#C98A8A',
    },
  }),
}));

jest.mock('../../../../../features/channels/api/channelsApi', () => ({
  fetchChannels: jest.fn(() => Promise.resolve([])),
  fmtChannelTime: () => '',
  markChannelRead: jest.fn(),
  sendChannelMessage: jest.fn(),
}));

jest.mock('../../../../../features/channels/components/CreateChannelModal', () => {
  const { View } = require('react-native');
  const CreateChannelModalStub = () => <View testID="create-channel-modal-stub" />;
  return CreateChannelModalStub;
});

jest.mock('../../services/messagesService', () => ({
  fetchConversations: jest.fn(),
  fetchContacts: jest.fn(),
  fetchThread: jest.fn(() => Promise.resolve({ json: async () => [] })),
  markThreadRead: jest.fn(),
  editMessage: jest.fn(),
  deleteMessageApi: jest.fn(),
  reactToMessage: jest.fn(),
  sendMessageApi: jest.fn(),
  triggerAivorahReply: jest.fn(),
  uploadAttachment: jest.fn(),
}));

const { fetchConversations, fetchContacts } = require('../../services/messagesService');
const { fetchChannels } = require('../../../../../features/channels/api/channelsApi');

const CONVO_A = { otherEmail: 'teacher.a@x.com', otherName: 'Teacher A', otherRole: 'teacher', lastMessage: 'Hi there', lastMessageAt: new Date().toISOString(), unreadCount: 2 };

function mockConvosResponse(data: any[] = []) {
  return Promise.resolve({ json: async () => data });
}

beforeEach(() => {
  jest.clearAllMocks();
  (fetchConversations as jest.Mock).mockReturnValue(mockConvosResponse([]));
  (fetchContacts as jest.Mock).mockReturnValue(mockConvosResponse([]));
  (fetchChannels as jest.Mock).mockResolvedValue([]);
});

describe('MessagesScreen — integration (school_admin)', () => {
  test('loads and shows the empty state when there are no conversations', async () => {
    await render(<MessagesScreen />);
    expect(await screen.findByText('No messages yet')).toBeTruthy();
    expect(fetchConversations).toHaveBeenCalledWith('admin@school.test', 'school_admin');
  });

  test('shows conversation rows once loaded', async () => {
    (fetchConversations as jest.Mock).mockReturnValue(mockConvosResponse([CONVO_A]));
    await render(<MessagesScreen />);
    expect(await screen.findByText('Teacher A')).toBeTruthy();
    expect(screen.getByText('Hi there')).toBeTruthy();
  });

  test('New opens the chooser menu (school_admin can create DM or channel)', async () => {
    const user = userEvent.setup();
    await render(<MessagesScreen />);
    await screen.findByText('No messages yet');

    await user.press(screen.getByTestId('messages-new-button'));

    expect(await screen.findByTestId('messages-new-dm-option')).toBeTruthy();
    expect(screen.getByTestId('messages-new-channel-option')).toBeTruthy();
  });

  test('New direct message opens the contacts modal and loads contacts', async () => {
    (fetchContacts as jest.Mock).mockReturnValue(mockConvosResponse([{ id: 'c1', email: 'parent.a@x.com', name: 'Parent A', role: 'parent' }]));
    const user = userEvent.setup();
    await render(<MessagesScreen />);
    await screen.findByText('No messages yet');

    await user.press(screen.getByTestId('messages-new-button'));
    await user.press(await screen.findByTestId('messages-new-dm-option'));

    expect(await screen.findByText('Parent A')).toBeTruthy();
    expect(fetchContacts).toHaveBeenCalledWith('admin@school.test', 'school_admin');
  });

  test('search filters the conversation list by name', async () => {
    const CONVO_B = { ...CONVO_A, otherEmail: 'teacher.b@x.com', otherName: 'Teacher B' };
    (fetchConversations as jest.Mock).mockReturnValue(mockConvosResponse([CONVO_A, CONVO_B]));
    const user = userEvent.setup();
    await render(<MessagesScreen />);
    await screen.findByText('Teacher A');

    await user.type(screen.getByTestId('messages-search-input'), 'Teacher B');

    await waitFor(() => {
      expect(screen.queryByText('Teacher A')).toBeNull();
      expect(screen.getByText('Teacher B')).toBeTruthy();
    });
  });
});
