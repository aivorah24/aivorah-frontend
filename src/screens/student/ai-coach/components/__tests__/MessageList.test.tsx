import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import MessageList from '../MessageList';
import type { Message } from '../../types';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default ?? obj.ios },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default ?? obj.ios,
}));

// ThinkingIndicator's own dedicated test covers its real Animated.loop
// behavior. Here, MessageList only needs to know the indicator rendered —
// the real loop uses real (600ms) timers that outlive this test's render/
// unmount cycle, leaking into whichever suite runs next and crashing it
// ("Cannot access .container on unmounted test renderer"). Stub it to a
// static, timer-free component.
jest.mock('../ThinkingIndicator', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => <Text>Aivorah is thinking...</Text>,
  };
});

const colors = {
  accentRed: '#f00', cardDark: '#111', borderColor: '#333',
  textDim: '#666', textMuted: '#888', textMain: '#fff',
} as any;

const styles = {
  messageRow: {}, messageRowUser: {}, messageRowAI: {}, aiHeader: {}, aiAvatar: {}, aiName: {},
  userBubble: {}, userBubbleStyle: {}, userText: {}, aiBody: {}, errorText: {}, streamCursor: {},
  actionRow: {}, actionBtn: {}, actionBtnActive: {}, imageGrid: {}, imageCard: {}, imageThumb: {}, imageCaption: {},
};

function baseProps(overrides: Partial<React.ComponentProps<typeof MessageList>> = {}) {
  return {
    messages: [] as Message[],
    streamingMsgId: null,
    isTyping: false,
    speakingId: null,
    onSpeak: jest.fn(),
    failedImages: new Set<string>(),
    onImageFail: jest.fn(),
    onZoomImage: jest.fn(),
    styles,
    colors,
    ...overrides,
  };
}

describe('MessageList', () => {
  test('renders a user message as plain text', async () => {
    const messages: Message[] = [{ id: 1, role: 'user', text: 'What is a fraction?' }];
    await render(<MessageList {...baseProps({ messages })} />);
    expect(screen.getByText('What is a fraction?')).toBeTruthy();
  });

  test('renders an AI message through the real FormattedAIText, sanitized of markdown headers', async () => {
    const messages: Message[] = [{ id: 1, role: 'ai', text: '## Fractions\nParts of a whole.' }];
    await render(<MessageList {...baseProps({ messages })} />);
    expect(screen.getByText('Fractions')).toBeTruthy();
  });

  test('an error message renders in the error style, not through FormattedAIText', async () => {
    const messages: Message[] = [{ id: 1, role: 'ai', text: 'Could not connect.', isError: true }];
    await render(<MessageList {...baseProps({ messages })} />);
    expect(screen.getByText('Could not connect.')).toBeTruthy();
  });

  test('a streaming AI message with no text yet shows the real thinking indicator', async () => {
    const messages: Message[] = [{ id: 1, role: 'ai', text: '' }];
    await render(<MessageList {...baseProps({ messages, streamingMsgId: 1 })} />);
    expect(screen.getByText('Aivorah is thinking...')).toBeTruthy();
  });

  test('isTyping with no streaming placeholder yet shows the thinking indicator as a trailing row', async () => {
    await render(<MessageList {...baseProps({ isTyping: true, streamingMsgId: null })} />);
    expect(screen.getByText('Aivorah is thinking...')).toBeTruthy();
  });

  test('pressing the speak button calls onSpeak with the message id and sanitized text', async () => {
    const onSpeak = jest.fn();
    const messages: Message[] = [{ id: 1, role: 'ai', text: 'Fractions are fun.' }];
    const user = userEvent.setup();
    await render(<MessageList {...baseProps({ messages, onSpeak })} />);

    await user.press(screen.getByLabelText('Read reply aloud'));

    expect(onSpeak).toHaveBeenCalledWith(1, 'Fractions are fun.');
  });

  test('images not in failedImages render, with a working caption tap that opens the zoom modal', async () => {
    const onZoomImage = jest.fn();
    const messages: Message[] = [{ id: 1, role: 'ai', text: 'See this diagram.', images: [{ url: 'x.png', caption: 'A **diagram**', subject: '', grade: '', topic: '' }] }];
    const user = userEvent.setup();
    await render(<MessageList {...baseProps({ messages, onZoomImage })} />);

    await user.press(screen.getByText('A diagram')); // markdown ** stripped from caption

    expect(onZoomImage).toHaveBeenCalledWith({ url: 'x.png', caption: 'A diagram' });
  });

  test('a failed image is hidden from the image grid', async () => {
    const messages: Message[] = [{ id: 1, role: 'ai', text: 'See this.', images: [{ url: 'broken.png', caption: 'broken image', subject: '', grade: '', topic: '' }] }];
    await render(<MessageList {...baseProps({ messages, failedImages: new Set(['broken.png']) })} />);
    expect(screen.queryByText('broken image')).toBeNull();
  });
});
