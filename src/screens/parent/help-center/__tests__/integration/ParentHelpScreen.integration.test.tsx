// Integration test for the real, refactored ParentHelpScreen: renders the
// full screen tree (hooks + components wired together), searches FAQs,
// opens the chat, and submits a ticket, mocking only the network boundary
// (helpCenterService) and app-wide context/navigation chrome.

import React from 'react';
import { Platform } from 'react-native';
import { render, screen, userEvent, waitFor, fireEvent } from '@testing-library/react-native';
import ParentHelpScreen from '../../ParentHelpScreen';
import * as helpCenterService from '../../services/helpCenterService';

Platform.OS = 'web';

jest.mock('../../services/helpCenterService');

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@example.com', name: 'Jane Doe' } }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accentYellow: '#fa0', accentYellowGlow: '#fa08', accentPurple: '#a0f', accentGreen: '#0fa', accentRed: '#f55',
      bgDark: '#000', cardDark: '#111', sidebarDark: '#050505', borderColor: '#333',
      textMain: '#fff', textMuted: '#888', textDim: '#666',
    },
  }),
}));

jest.mock('../../../../../components/common/Header', () => {
  const { View: RNView } = require('react-native');
  return { __esModule: true, default: () => <RNView testID="header-stub" /> };
});
jest.mock('../../../../../components/common/ScreenLayout', () => {
  const { View: RNView } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <RNView>{children}</RNView> };
});

const navigation = { openDrawer: jest.fn() };

describe('ParentHelpScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the FAQ list and hero search', async () => {
    await render(<ParentHelpScreen navigation={navigation} />);
    expect(screen.getByPlaceholderText('Search questions...')).toBeTruthy();
    expect(screen.getByText('How do I contact Aivorah support?')).toBeTruthy();
  }, 15000);

  test('searching filters the FAQ list down to matching results', async () => {
    const user = userEvent.setup();
    await render(<ParentHelpScreen navigation={navigation} />);

    await user.type(screen.getByPlaceholderText('Search questions...'), 'teacher');

    expect(screen.getByText('How do I message my child\'s teacher?')).toBeTruthy();
    expect(screen.queryByText('What do XP and badges mean?')).toBeNull();
  });

  test('opening the chat and sending a message shows the reply from the service', async () => {
    (helpCenterService.sendChatMessage as jest.Mock).mockResolvedValueOnce('Here is how you check progress.');
    const user = userEvent.setup();
    await render(<ParentHelpScreen navigation={navigation} />);

    await user.press(screen.getByText('Aivorah 24/7'));
    const input = screen.getByPlaceholderText("Ask about your child's learning...");
    await user.type(input, 'How do I check progress?');
    fireEvent(input, 'submitEditing');

    await waitFor(() => expect(screen.getByText('Here is how you check progress.')).toBeTruthy());
    expect(helpCenterService.sendChatMessage).toHaveBeenCalledWith('How do I check progress?', 'Jane');
  }, 15000);

  test('submitting a support ticket shows the inline success confirmation, not a native alert', async () => {
    (helpCenterService.submitTicket as jest.Mock).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<ParentHelpScreen navigation={navigation} />);

    await user.press(screen.getByText('Submit Ticket'));
    await user.type(screen.getByPlaceholderText('Brief summary of your issue'), 'Cannot log in');
    await user.type(screen.getByPlaceholderText('Please provide as much detail as possible...'), 'It just spins.');
    await user.press(screen.getAllByText('Submit Ticket')[1]);

    await waitFor(() => expect(screen.getByText('Ticket Submitted!')).toBeTruthy());
    expect(helpCenterService.submitTicket).toHaveBeenCalledWith('parent@example.com', 'Cannot log in', 'It just spins.');
  });

  test('a failed ticket submission shows the inline error instead of hanging or crashing', async () => {
    (helpCenterService.submitTicket as jest.Mock).mockRejectedValueOnce(new Error('Email service not configured.'));
    const user = userEvent.setup();
    await render(<ParentHelpScreen navigation={navigation} />);

    await user.press(screen.getByText('Submit Ticket'));
    await user.type(screen.getByPlaceholderText('Brief summary of your issue'), 'Cannot log in');
    await user.type(screen.getByPlaceholderText('Please provide as much detail as possible...'), 'It just spins.');
    await user.press(screen.getAllByText('Submit Ticket')[1]);

    await waitFor(() => expect(screen.getByText('Email service not configured.')).toBeTruthy());
  });
});
