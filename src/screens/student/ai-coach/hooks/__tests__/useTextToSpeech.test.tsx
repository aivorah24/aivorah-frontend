import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useTextToSpeech } from '../useTextToSpeech';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default ?? obj.ios },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default ?? obj.ios,
}));

class MockUtterance {
  text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice: any = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) { this.text = text; }
}

function Harness() {
  const { speakingId, speakMessage, stopSpeaking } = useTextToSpeech();
  return (
    <>
      <Text testID="speakingId">{String(speakingId)}</Text>
      <TouchableOpacity testID="speak1" onPress={() => speakMessage(1, 'Hello world')}><Text>speak1</Text></TouchableOpacity>
      <TouchableOpacity testID="speak2" onPress={() => speakMessage(2, 'Second message')}><Text>speak2</Text></TouchableOpacity>
      <TouchableOpacity testID="stop" onPress={() => stopSpeaking()}><Text>stop</Text></TouchableOpacity>
      <TouchableOpacity testID="speakHindi" onPress={() => speakMessage(3, 'पानी क्या है?')}><Text>hi</Text></TouchableOpacity>
      <TouchableOpacity testID="speakMixed" onPress={() => speakMessage(4, 'Water in Hindi is पानी.')}><Text>mix</Text></TouchableOpacity>
    </>
  );
}

let mockSpeak: jest.Mock;
let mockCancel: jest.Mock;
let mockGetVoices: jest.Mock;

beforeEach(() => {
  mockSpeak = jest.fn();
  mockCancel = jest.fn();
  mockGetVoices = jest.fn().mockReturnValue([]);
  (global as any).speechSynthesis = { speak: mockSpeak, cancel: mockCancel, getVoices: mockGetVoices };
  (global as any).SpeechSynthesisUtterance = MockUtterance;
});

afterEach(() => {
  delete (global as any).speechSynthesis;
  delete (global as any).SpeechSynthesisUtterance;
});

describe('useTextToSpeech', () => {
  test('speakMessage sets speakingId and calls speechSynthesis.speak with a real utterance', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('speak1'));

    expect(screen.getByTestId('speakingId').props.children).toBe('1');
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('Hello world');
    expect(utterance.lang).toBe('en-IN');
  });

  test('pressing speak on the SAME message again toggles it off (stops speaking)', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('speak1'));
    await user.press(screen.getByTestId('speak1'));

    expect(screen.getByTestId('speakingId').props.children).toBe('null');
    expect(mockCancel).toHaveBeenCalled();
  });

  test('speaking a DIFFERENT message cancels the first and starts the new one', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('speak1'));
    await user.press(screen.getByTestId('speak2'));

    expect(screen.getByTestId('speakingId').props.children).toBe('2');
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalledTimes(2);
  });

  test('stopSpeaking cancels synthesis and clears speakingId', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('speak1'));
    await user.press(screen.getByTestId('stop'));

    expect(screen.getByTestId('speakingId').props.children).toBe('null');
    expect(mockCancel).toHaveBeenCalled();
  });

  test('no speechSynthesis available on window -> speakingId resets to null, no crash', async () => {
    delete (global as any).speechSynthesis;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('speak1'));

    expect(screen.getByTestId('speakingId').props.children).toBe('null');
  });

  test('prefers a female-sounding English voice when one is available', async () => {
    const femaleVoice = { lang: 'en-US', name: 'Microsoft Zira' };
    const maleVoice = { lang: 'en-US', name: 'Microsoft David' };
    mockGetVoices.mockReturnValue([maleVoice, femaleVoice]);
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('speak1'));

    const utterance = mockSpeak.mock.calls[0][0];
    expect(utterance.voice).toBe(femaleVoice);
  });

  test('a Hindi answer is read by a Hindi voice, not the English one', async () => {
    const hindiVoice = { lang: 'hi-IN', name: 'Google हिन्दी' };
    mockGetVoices.mockReturnValue([{ lang: 'en-US', name: 'Microsoft Zira' }, hindiVoice]);
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('speakHindi'));

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const u = mockSpeak.mock.calls[0][0];
    expect(u.text).toBe('पानी क्या है?');
    expect(u.lang).toBe('hi-IN');
    expect(u.voice).toBe(hindiVoice);
  });

  test('a mixed English + Hindi answer reads each part in its own language', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('speakMixed'));

    const parts = mockSpeak.mock.calls.map((c) => [c[0].text, c[0].lang]);
    expect(parts).toEqual([['Water in Hindi is', 'en-IN'], ['पानी.', 'hi-IN']]);
  });
});
