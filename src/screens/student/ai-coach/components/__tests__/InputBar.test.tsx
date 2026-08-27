import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import InputBar from '../InputBar';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default ?? obj.ios },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default ?? obj.ios,
}));

const colors = { accentYellow: '#fa0', textDim: '#666', textMuted: '#888' } as any;
const styles = {
  inputBar: {}, inputContainer: {}, input: {}, inputActions: {}, inputActionBtn: {}, micActive: {}, sendBtn: {}, sendBtnDisabled: {},
};

function baseProps(overrides: Partial<React.ComponentProps<typeof InputBar>> = {}) {
  return {
    inputRef: { current: null },
    input: '',
    setInput: jest.fn(),
    isListening: false,
    isTyping: false,
    showClear: false,
    onSend: jest.fn(),
    onClear: jest.fn(),
    onToggleVoice: jest.fn(),
    styles,
    colors,
    ...overrides,
  } as React.ComponentProps<typeof InputBar>;
}

describe('InputBar', () => {
  test('typing updates via setInput', async () => {
    const setInput = jest.fn();
    const user = userEvent.setup();
    await render(<InputBar {...baseProps({ setInput })} />);

    await user.type(screen.getByPlaceholderText('Message Aivorah...'), 'Hi');

    expect(setInput).toHaveBeenCalled();
  });

  test('the send button is disabled when the input is empty', async () => {
    await render(<InputBar {...baseProps({ input: '' })} />);
    expect(screen.getByLabelText('Send message').props.accessibilityState?.disabled).toBe(true);
  });

  test('pressing send with real text calls onSend', async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();
    await render(<InputBar {...baseProps({ input: 'What is a fraction?', onSend })} />);

    await user.press(screen.getByLabelText('Send message'));

    expect(onSend).toHaveBeenCalled();
  });

  test('the send button is disabled while typing (AI is responding)', async () => {
    await render(<InputBar {...baseProps({ input: 'x', isTyping: true })} />);
    expect(screen.getByLabelText('Send message').props.accessibilityState?.disabled).toBe(true);
  });

  test('the clear button only shows when showClear is true', async () => {
    await render(<InputBar {...baseProps({ showClear: false })} />);
    expect(screen.queryByLabelText('Clear chat')).toBeNull();
  });

  test('pressing the clear button calls onClear', async () => {
    const onClear = jest.fn();
    const user = userEvent.setup();
    await render(<InputBar {...baseProps({ showClear: true, onClear })} />);

    await user.press(screen.getByLabelText('Clear chat'));

    expect(onClear).toHaveBeenCalled();
  });

  test('pressing the mic button calls onToggleVoice', async () => {
    const onToggleVoice = jest.fn();
    const user = userEvent.setup();
    await render(<InputBar {...baseProps({ onToggleVoice })} />);

    await user.press(screen.getByLabelText('Start voice input'));

    expect(onToggleVoice).toHaveBeenCalled();
  });

  test('while listening, the mic button label reflects "stop"', async () => {
    await render(<InputBar {...baseProps({ isListening: true })} />);
    expect(screen.getByLabelText('Stop voice input')).toBeTruthy();
  });

  test('the placeholder reflects listening state', async () => {
    await render(<InputBar {...baseProps({ isListening: true })} />);
    expect(screen.getByPlaceholderText('Listening...')).toBeTruthy();
  });
});
