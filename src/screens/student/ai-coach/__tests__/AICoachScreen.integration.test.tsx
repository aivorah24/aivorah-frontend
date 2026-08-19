// Integration tests for AICoachScreen — the real screen, real subcomponents
// (WelcomeSection, MessageList, FeedbackStrip, InputBar, ImageZoomModal), with
// useAICoachChat/useSuggestions/useTextToSpeech/useVoiceInput mocked at the
// module boundary (each already has its own dedicated hook tests).

import React from 'react';
import { Animated } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import AICoachScreen from '../AICoachScreen';
import type { Message } from '../types';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'AICoach', name: 'AICoach' }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', accentYellow: '#fa0', textMain: '#fff', textMuted: '#888', textDim: '#666',
    borderColor: '#333', cardDark: '#111', accentRed: '#f00',
  } }),
}));
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'A Student', email: 'a@a.com', grade: 'Grade 4', curriculum: 'IB PYP', role: 'student' } }),
}));
jest.mock('../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ exploreTopic: jest.fn() }),
}));

const mockSendMessage = jest.fn();
const mockSubmitFeedback = jest.fn();
const mockDismissFeedback = jest.fn();
const mockClearChat = jest.fn();
const mockSetInput = jest.fn();

let chatState: any;

function baseChatState(overrides: any = {}) {
  return {
    messages: [{ id: 1, role: 'ai', text: "Hi A! I'm your Aivorah AI Coach for IB PYP." }] as Message[],
    input: '',
    setInput: mockSetInput,
    isTyping: false,
    streamingMsgId: null,
    showFeedback: false,
    feedbackAnim: new Animated.Value(1),
    sendMessage: mockSendMessage,
    submitFeedback: mockSubmitFeedback,
    dismissFeedback: mockDismissFeedback,
    clearChat: mockClearChat,
    ...overrides,
  };
}

jest.mock('../hooks/useAICoachChat', () => ({
  useAICoachChat: (...args: any[]) => (global as any).__mockUseAICoachChat(...args),
}));
jest.mock('../hooks/useSuggestions', () => ({
  useSuggestions: () => ['What are fractions?', 'How does the water cycle work?'],
}));
jest.mock('../hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({ speakingId: null, speakMessage: jest.fn(), stopSpeaking: jest.fn() }),
}));
jest.mock('../hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({ isListening: false, toggleVoice: jest.fn() }),
}));

function navProp() {
  return { navigate: jest.fn(), openDrawer: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  chatState = baseChatState();
  (global as any).__mockUseAICoachChat = () => chatState;
  // ScreenLayout (real, not mocked) gates ALL children behind its own
  // screen-time-status fetch for student users — must resolve for anything
  // in this screen to render at all.
  global.fetch = jest.fn().mockResolvedValue({ json: async () => ({}) });
});

describe('AICoachScreen — welcome state', () => {
  test('shows the real welcome section and suggestions when only the initial AI message exists', async () => {
    await render(<AICoachScreen navigation={navProp()} />);
    expect(await screen.findByText('Aivorah AI Coach')).toBeTruthy();
    expect(screen.getByText('What are fractions?')).toBeTruthy();
  });

  test('pressing a suggestion calls sendMessage with its real text', async () => {
    const user = userEvent.setup();
    await render(<AICoachScreen navigation={navProp()} />);
    await user.press(await screen.findByText('What are fractions?'));
    expect(mockSendMessage).toHaveBeenCalledWith('What are fractions?');
  });
});

describe('AICoachScreen — conversation state', () => {
  test('once more than one message exists, the welcome section is hidden and real messages render', async () => {
    chatState = baseChatState({
      messages: [
        { id: 1, role: 'ai', text: 'Welcome!' },
        { id: 2, role: 'user', text: 'What is a fraction?' },
        { id: 3, role: 'ai', text: 'A fraction is a part of a whole.' },
      ],
    });
    await render(<AICoachScreen navigation={navProp()} />);
    expect(screen.queryByText('Aivorah AI Coach')).toBeNull();
    expect(await screen.findByText('What is a fraction?')).toBeTruthy();
    expect(screen.getByText('A fraction is a part of a whole.')).toBeTruthy();
  });

  test('typing in the input bar and pressing send calls sendMessage', async () => {
    chatState = baseChatState({ input: 'What is a fraction?' });
    const user = userEvent.setup();
    await render(<AICoachScreen navigation={navProp()} />);

    await user.press(screen.getByLabelText('Send message'));

    expect(mockSendMessage).toHaveBeenCalled();
  });

  test('the clear-chat button shows once the conversation has more than one message and calls clearChat', async () => {
    chatState = baseChatState({ messages: [{ id: 1, role: 'ai', text: 'Welcome!' }, { id: 2, role: 'user', text: 'Hi' }] });
    const user = userEvent.setup();
    await render(<AICoachScreen navigation={navProp()} />);

    await user.press(screen.getByLabelText('Clear chat'));

    expect(mockClearChat).toHaveBeenCalled();
  });
});

describe('AICoachScreen — feedback strip', () => {
  test('shows the real feedback strip when showFeedback is true, and wires submit/dismiss', async () => {
    chatState = baseChatState({ showFeedback: true });
    const user = userEvent.setup();
    await render(<AICoachScreen navigation={navProp()} />);

    await user.press(screen.getByText('👍'));
    expect(mockSubmitFeedback).toHaveBeenCalledWith(3);

    await user.press(screen.getByTestId('feedbackDismiss'));
    expect(mockDismissFeedback).toHaveBeenCalled();
  });

  test('the feedback strip is absent when showFeedback is false', async () => {
    await render(<AICoachScreen navigation={navProp()} />);
    expect(screen.queryByText('How is Aivorah doing?')).toBeNull();
  });
});

describe('AICoachScreen — image zoom', () => {
  test('pressing an AI message image opens the real zoom modal with its caption', async () => {
    chatState = baseChatState({
      messages: [
        { id: 1, role: 'ai', text: 'Here is a diagram.', images: [{ url: 'x.png', caption: 'Water cycle diagram', subject: '', grade: '', topic: '' }] },
      ],
    });
    const user = userEvent.setup();
    await render(<AICoachScreen navigation={navProp()} />);

    await user.press(await screen.findByText('Water cycle diagram'));

    // ImageZoomModal renders the same caption text again inside the modal.
    const captions = screen.getAllByText('Water cycle diagram');
    expect(captions.length).toBeGreaterThanOrEqual(2);
  });
});
