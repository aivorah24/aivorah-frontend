import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MessagesScreen from '../../MessagesScreen';

// Regression (2026-09-19): tapping a "message from X" notification navigated
// to the Messages screen's default view (conversation list / New), never the
// actual conversation with X. Header.tsx now passes `openWith` as a route
// param; this pins the screen actually opening that conversation on mount.

let mockRouteParams: any = undefined;
const mockSetParams = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setParams: mockSetParams }),
  useRoute: () => ({ key: 'Messages', name: 'Messages', params: mockRouteParams }),
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
  function CreateChannelModalStub() { return <View testID="create-channel-modal-stub" />; }
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

const { fetchConversations } = require('../../services/messagesService');
const { fetchChannels } = require('../../../../../features/channels/api/channelsApi');

const CONVO_A = { otherEmail: 'teacher.a@x.com', otherName: 'Teacher A', otherRole: 'teacher', lastMessage: 'Hi there', lastMessageAt: new Date().toISOString(), unreadCount: 2 };

function mockConvosResponse(data: any[] = []) {
  return Promise.resolve({ json: async () => data });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = undefined;
  (fetchConversations as jest.Mock).mockReturnValue(mockConvosResponse([]));
  (fetchChannels as jest.Mock).mockResolvedValue([]);
});

describe('MessagesScreen — openWith route param', () => {
  test('an openWith param (from a notification tap) opens that conversation directly', async () => {
    mockRouteParams = { openWith: 'teacher.a@x.com' };
    (fetchConversations as jest.Mock).mockReturnValue(mockConvosResponse([CONVO_A]));

    await render(<MessagesScreen />);

    expect(await screen.findByPlaceholderText('Message Teacher A...')).toBeTruthy();
    // Regression (bug 4): the param must be consumed so a page refresh (which
    // on web keeps it in the URL) doesn't keep re-forcing this conversation open.
    expect(mockSetParams).toHaveBeenCalledWith({ openWith: undefined });
  });

  test('no openWith param -> screen stays on its default view', async () => {
    (fetchConversations as jest.Mock).mockReturnValue(mockConvosResponse([CONVO_A]));

    await render(<MessagesScreen />);

    expect(await screen.findByText('Teacher A')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Message Teacher A...')).toBeNull();
  });
});
