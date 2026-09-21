// Integration test for the real, refactored HelpSupportScreen: renders the
// full screen tree (hooks + components wired together) for both the
// Teacher and School Admin personas that share this screen, mocking only
// the network boundary (helpSupportService) and app-wide context/nav chrome.

import React from 'react';
import { Platform } from 'react-native';
import { render, screen, userEvent, waitFor, fireEvent } from '@testing-library/react-native';
import HelpSupportScreen from '../../HelpSupportScreen';
import * as helpSupportService from '../../services/helpSupportService';

Platform.OS = 'web';

jest.mock('../../services/helpSupportService');

let mockUser = { email: 'teacher@example.com', name: 'Jane Doe', role: 'teacher' };
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accentYellow: '#fa0', accentGreen: '#0fa',
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

describe('HelpSupportScreen — teacher persona', () => {
  beforeEach(() => {
    mockUser = { email: 'teacher@example.com', name: 'Jane Doe', role: 'teacher' };
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the teacher FAQ list and hero search', async () => {
    await render(<HelpSupportScreen navigation={navigation} />);
    expect(screen.getByPlaceholderText('Search questions...')).toBeTruthy();
    expect(screen.getByText('How do I create an assignment for all students?')).toBeTruthy();
  }, 15000);

  test('searching filters the FAQ list down to matching results', async () => {
    const user = userEvent.setup();
    await render(<HelpSupportScreen navigation={navigation} />);

    await user.type(screen.getByPlaceholderText('Search questions...'), 'parents');

    expect(screen.getByText('Can I message parents directly?')).toBeTruthy();
    expect(screen.queryByText('How is student progress calculated?')).toBeNull();
  });

  test('opening the chat and sending a message shows the reply from the service', async () => {
    (helpSupportService.sendChatMessage as jest.Mock).mockResolvedValueOnce('Here is how grading works.');
    const user = userEvent.setup();
    await render(<HelpSupportScreen navigation={navigation} />);

    await user.press(screen.getByText('Aivorah 24/7'));
    const input = screen.getByPlaceholderText('Ask about assignments, grading, students...');
    await user.type(input, 'How does grading work?');
    fireEvent(input, 'submitEditing');

    await waitFor(() => expect(screen.getByText('Here is how grading works.')).toBeTruthy());
    expect(helpSupportService.sendChatMessage).toHaveBeenCalledWith('How does grading work?', 'Jane');
  }, 15000);

  test('submitting a support ticket shows the inline success confirmation, not a native alert', async () => {
    (helpSupportService.submitTicket as jest.Mock).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<HelpSupportScreen navigation={navigation} />);

    await user.press(screen.getByText('Submit Ticket'));
    await user.type(screen.getByPlaceholderText('Brief summary of your issue'), 'Cannot log in');
    await user.type(screen.getByPlaceholderText('Please provide as much detail as possible...'), 'It just spins.');
    await user.press(screen.getAllByText('Submit Ticket')[1]);

    await waitFor(() => expect(screen.getByText('Ticket Submitted!')).toBeTruthy());
    expect(helpSupportService.submitTicket).toHaveBeenCalledWith('teacher@example.com', 'Cannot log in', 'It just spins.');
  });

  test('a failed ticket submission shows the inline error instead of hanging or crashing', async () => {
    (helpSupportService.submitTicket as jest.Mock).mockRejectedValueOnce(new Error('Email service not configured.'));
    const user = userEvent.setup();
    await render(<HelpSupportScreen navigation={navigation} />);

    await user.press(screen.getByText('Submit Ticket'));
    await user.type(screen.getByPlaceholderText('Brief summary of your issue'), 'Cannot log in');
    await user.type(screen.getByPlaceholderText('Please provide as much detail as possible...'), 'It just spins.');
    await user.press(screen.getAllByText('Submit Ticket')[1]);

    await waitFor(() => expect(screen.getByText('Email service not configured.')).toBeTruthy());
  });
});

describe('HelpSupportScreen — school_admin persona', () => {
  beforeEach(() => {
    mockUser = { email: 'admin@example.com', name: 'Admin User', role: 'school_admin' };
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the school-admin FAQ list instead of the teacher one', async () => {
    await render(<HelpSupportScreen navigation={navigation} />);
    expect(screen.getByText('How do I add a student?')).toBeTruthy();
    expect(screen.queryByText('How do I create an assignment for all students?')).toBeNull();
  }, 15000);

  test('chat uses the school-admin placeholder and greeting', async () => {
    const user = userEvent.setup();
    await render(<HelpSupportScreen navigation={navigation} />);

    await user.press(screen.getByText('Aivorah 24/7'));
    expect(screen.getByPlaceholderText('Ask about students, teachers, imports...')).toBeTruthy();
  });
});
