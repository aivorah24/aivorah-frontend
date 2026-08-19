// Integration test for HelpCenterScreen — the real screen, driven through a
// mocked global.fetch for the 24/7 chat + ticket submission, and a real
// Alert.alert spy for validation/result dialogs.

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, userEvent, waitFor, fireEvent } from '@testing-library/react-native';
import HelpCenterScreen from '../HelpCenterScreen';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => false }),
  useRoute: () => ({ key: 'HelpCenter', name: 'HelpCenter' }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', cardDark: '#111', borderColor: '#333', textMain: '#fff', textMuted: '#888',
    textDim: '#666', accentYellow: '#fa0',
  }, isDark: true }),
}));

let mockUser: any;
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function navProp() {
  return { navigate: jest.fn(), goBack: jest.fn(), openDrawer: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { name: 'A Student', email: 'a@a.com' };
  global.fetch = jest.fn().mockResolvedValue(jsonRes({})) as any;
});

describe('HelpCenterScreen — search', () => {
  test('filters real topics and FAQs by a real search term, and shows the real match count', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.type(screen.getByPlaceholderText('Search topics, questions...'), 'streak');

    await waitFor(() => expect(screen.getByText('XP & Streaks')).toBeTruthy());
    expect(screen.queryByText('Billing & Plans')).toBeNull();
    expect(screen.getByText(/topics? · \d+ FAQs?/)).toBeTruthy();
  });

  test('shows real "no match" empty states when the search matches nothing', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.type(screen.getByPlaceholderText('Search topics, questions...'), 'zzz-no-match-zzz');

    await waitFor(() => expect(screen.getByText('No topics match "zzz-no-match-zzz"')).toBeTruthy());
    expect(screen.getByText('No FAQs match "zzz-no-match-zzz"')).toBeTruthy();
  });

  test('clearing the real search text restores all topics', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    const input = screen.getByPlaceholderText('Search topics, questions...');
    await user.type(input, 'streak');
    await waitFor(() => expect(screen.queryByText('Billing & Plans')).toBeNull());

    await user.clear(input);

    await waitFor(() => expect(screen.getByText('Billing & Plans')).toBeTruthy());
  });
});

describe('HelpCenterScreen — FAQ accordion', () => {
  test('pressing a real FAQ question reveals its real answer, pressing again hides it', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    const question = 'How do I start a new learning path?';
    const answer = 'Go to "My Learning Paths" in the sidebar, then select a subject. Tap "Start" on any available level to begin.';
    expect(screen.queryByText(answer)).toBeNull();

    await user.press(screen.getByText(question));
    expect(screen.getByText(answer)).toBeTruthy();

    await user.press(screen.getByText(question));
    expect(screen.queryByText(answer)).toBeNull();
  });
});

describe('HelpCenterScreen — topic detail modal', () => {
  test('pressing a real topic opens its modal with its real articles', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Learning Paths'));

    expect(screen.getByText('Courses, levels, subjects')).toBeTruthy();
    expect(screen.getByText('Starting a new learning path')).toBeTruthy();
  });

  test('pressing a real article expands its real content', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Learning Paths'));
    await user.press(screen.getByText('Starting a new learning path'));

    expect(screen.getByText('Go to My Learning Paths and tap "Explore Topics". Choose a subject and grade level.')).toBeTruthy();
  });

  test('pressing "Go to X" navigates to the real target screen and closes the modal', async () => {
    const nav = navProp();
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={nav} />);

    await user.press(screen.getByText('Learning Paths'));
    await user.press(screen.getByText('Go to Learning Paths'));

    expect(nav.navigate).toHaveBeenCalledWith('LearningPaths');
    expect(screen.queryByText('Courses, levels, subjects')).toBeNull();
  });

  test('pressing the real "Close" button dismisses the modal without navigating', async () => {
    const nav = navProp();
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={nav} />);

    await user.press(screen.getByText('Learning Paths'));
    expect(screen.getByText('Courses, levels, subjects')).toBeTruthy();

    await user.press(screen.getByText('Close'));

    expect(screen.queryByText('Courses, levels, subjects')).toBeNull();
    expect(nav.navigate).not.toHaveBeenCalled();
  });
});

describe('HelpCenterScreen — 24/7 chat', () => {
  test('opens the real chat modal with its real welcome message', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Chat with Aivorah 24/7'));

    expect(screen.getByText("Hi! I'm your Aivorah 24/7\nSupport Assistant.")).toBeTruthy();
  });

  test('submitting the real chat input (via Enter/submitEditing) posts to /help/chat and shows the real AI reply', async () => {
    global.fetch = jest.fn((url: string) => {
      if (String(url).includes('/help/chat')) return jsonRes({ reply: 'XP is earned by completing lessons!' });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Chat with Aivorah 24/7'));
    const input = screen.getByPlaceholderText('Ask about XP, streaks, badges...');
    await user.type(input, 'How does XP work?');
    fireEvent(input, 'submitEditing');

    await waitFor(() => expect(screen.getByText('XP is earned by completing lessons!')).toBeTruthy());
    expect(screen.getByText('How does XP work?')).toBeTruthy(); // the user's own message renders too
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/help/chat'), expect.objectContaining({
      body: JSON.stringify({ message: 'How does XP work?', userName: 'A' }),
    }));
  });

  test('pressing a real suggestion chip sends that exact real text', async () => {
    global.fetch = jest.fn((url: string) => {
      if (String(url).includes('/help/chat')) return jsonRes({ reply: 'Badges are earned at milestones!' });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Chat with Aivorah 24/7'));
    await user.press(screen.getByText('About badges'));

    await waitFor(() => expect(screen.getByText('Badges are earned at milestones!')).toBeTruthy());
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/help/chat'), expect.objectContaining({
      body: JSON.stringify({ message: 'About badges', userName: 'A' }),
    }));
  });

  test('a real chat network failure shows the real friendly fallback message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Chat with Aivorah 24/7'));
    await user.press(screen.getByText('About XP'));

    await waitFor(() => expect(screen.getByText('Could not reach support. Please try again.')).toBeTruthy());
  });

});

describe('HelpCenterScreen — support ticket', () => {
  test('submitting with no subject shows a real validation alert, no network call', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Submit a Ticket'));
    await user.press(screen.getByText('Submit Ticket'));

    expect(Alert.alert).toHaveBeenCalledWith('Required', 'Please enter a subject.');
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/help/ticket'), expect.anything());
  });

  test('submitting with a subject but no message shows a real validation alert', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Submit a Ticket'));
    await user.type(screen.getByPlaceholderText('Brief summary of your issue'), 'Cannot log in');
    await user.press(screen.getByText('Submit Ticket'));

    expect(Alert.alert).toHaveBeenCalledWith('Required', 'Please describe your issue.');
  });

  test('a real successful submission posts to /help/ticket and shows the real success alert', async () => {
    global.fetch = jest.fn((url: string) => {
      if (String(url).includes('/help/ticket')) return jsonRes({ success: true, message: 'Support ticket submitted successfully.' });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Submit a Ticket'));
    await user.type(screen.getByPlaceholderText('Brief summary of your issue'), 'Cannot log in');
    await user.type(screen.getByPlaceholderText('Please provide as much detail as possible...'), 'App crashes on login.');
    await user.press(screen.getByText('Submit Ticket'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/help/ticket'),
      expect.objectContaining({ body: JSON.stringify({ email: 'a@a.com', subject: 'Cannot log in', message: 'App crashes on login.' }) }),
    ));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Ticket Submitted', "We'll respond to a@a.com within 24 hours.", [{ text: 'OK' }]));
  });

  test('a real server-side failure shows the real failure alert with its message', async () => {
    global.fetch = jest.fn((url: string) => {
      if (String(url).includes('/help/ticket')) return jsonRes({ success: false, error: 'Failed to submit support ticket. Please try again.' }, false);
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Submit a Ticket'));
    await user.type(screen.getByPlaceholderText('Brief summary of your issue'), 'S');
    await user.type(screen.getByPlaceholderText('Please provide as much detail as possible...'), 'M');
    await user.press(screen.getByText('Submit Ticket'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Submission Failed', 'Failed to submit support ticket. Please try again.'));
  });

  test('cancelling the real ticket modal closes it without submitting', async () => {
    const user = userEvent.setup();
    await render(<HelpCenterScreen navigation={navProp()} />);

    await user.press(screen.getByText('Submit a Ticket'));
    await user.press(screen.getByText('Cancel'));

    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/help/ticket'), expect.anything());
  });
});
