import React from 'react';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useVoiceInput } from '../useVoiceInput';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default ?? obj.ios },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default ?? obj.ios,
}));

class MockRecognition {
  lang = ''; interimResults = false; continuous = false; maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  started = false; stopped = false;
  start() { this.started = true; this.onstart?.(); }
  stop() { this.stopped = true; this.onend?.(); }
}

function Harness({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { isListening, toggleVoice } = useVoiceInput(onTranscript);
  return (
    <>
      <Text testID="isListening">{String(isListening)}</Text>
      <TouchableOpacity testID="toggle" onPress={toggleVoice}><Text>toggle</Text></TouchableOpacity>
    </>
  );
}

let lastRecognitionInstance: MockRecognition;

beforeEach(() => {
  (global as any).SpeechRecognition = jest.fn().mockImplementation(() => {
    lastRecognitionInstance = new MockRecognition();
    return lastRecognitionInstance;
  });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  delete (global as any).SpeechRecognition;
  delete (global as any).webkitSpeechRecognition;
  jest.restoreAllMocks();
});

describe('useVoiceInput', () => {
  test('toggling on starts real recognition and sets isListening true', async () => {
    const user = userEvent.setup();
    await render(<Harness onTranscript={() => {}} />);
    await user.press(screen.getByTestId('toggle'));

    expect(lastRecognitionInstance.started).toBe(true);
    expect(await screen.findByText('true')).toBeTruthy();
  });

  test('toggling off while listening stops recognition', async () => {
    const user = userEvent.setup();
    await render(<Harness onTranscript={() => {}} />);
    await user.press(screen.getByTestId('toggle'));
    await screen.findByText('true');
    await user.press(screen.getByTestId('toggle'));

    expect(lastRecognitionInstance.stopped).toBe(true);
    expect(screen.getByTestId('isListening').props.children).toBe('false');
  });

  test('a final transcript result is passed to onTranscript', async () => {
    const onTranscript = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onTranscript={onTranscript} />);
    await user.press(screen.getByTestId('toggle'));

    lastRecognitionInstance.onresult?.({
      resultIndex: 0,
      results: [[{ transcript: 'what is a fraction' }]].map((r, i) => Object.assign(r, { isFinal: true, 0: r[0] })),
    });

    expect(onTranscript).toHaveBeenCalledWith('what is a fraction');
  });

  test('no SpeechRecognition support -> shows an alert, never starts listening', async () => {
    delete (global as any).SpeechRecognition;
    const user = userEvent.setup();
    await render(<Harness onTranscript={() => {}} />);
    await user.press(screen.getByTestId('toggle'));

    expect(Alert.alert).toHaveBeenCalledWith('Not Supported', expect.stringContaining('not supported'));
    expect(screen.getByTestId('isListening').props.children).toBe('false');
  });

  test('a "not-allowed" recognition error shows a microphone-permission alert', async () => {
    const user = userEvent.setup();
    await render(<Harness onTranscript={() => {}} />);
    await user.press(screen.getByTestId('toggle'));

    lastRecognitionInstance.onerror?.({ error: 'not-allowed' });

    expect(Alert.alert).toHaveBeenCalledWith('Microphone Access', expect.stringContaining('microphone access'));
    await waitFor(() => expect(screen.getByTestId('isListening').props.children).toBe('false'));
  });

  test('recognition ending naturally with a short (<=2 char) transcript does not fire onTranscript again', async () => {
    const onTranscript = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onTranscript={onTranscript} />);
    await user.press(screen.getByTestId('toggle'));

    lastRecognitionInstance.onend?.();

    expect(onTranscript).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('isListening').props.children).toBe('false'));
  });
});
