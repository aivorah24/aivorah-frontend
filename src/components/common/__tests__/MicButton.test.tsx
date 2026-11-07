// The chat mic: speech fills the chat box (after anything already typed);
// hidden where the browser has no speech recognition.
import React from 'react';
import { TextInput } from 'react-native';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import MicButton from '../MicButton';
import { darkColors } from '../../../theme';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default ?? obj.ios },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default ?? obj.ios,
}));

class FakeRecognition {
  onresult: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  start() {}
  stop() { this.onend?.(); }
  abort() {}
  say(text: string) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] }); }
}
let rec: FakeRecognition;

function Chat({ initial = '' }) {
  const [text, setText] = React.useState(initial);
  return (
    <>
      <TextInput testID="input" value={text} onChangeText={setText} />
      <MicButton value={text} onChangeText={setText} colors={darkColors} />
    </>
  );
}

beforeEach(() => { (global as any).SpeechRecognition = jest.fn(() => { rec = new FakeRecognition(); return rec; }); });
afterEach(() => { delete (global as any).SpeechRecognition; });

test('speaking fills the chat box; tap again to stop', async () => {
  const user = userEvent.setup();
  await render(<Chat />);
  await user.press(screen.getByTestId('chat-mic'));
  expect(screen.getByLabelText('Stop voice input')).toBeTruthy();
  await act(async () => { rec.say('how do I reset my password'); });
  expect(screen.getByTestId('input').props.value).toBe('how do I reset my password');
  await user.press(screen.getByTestId('chat-mic'));
  expect(screen.getByLabelText('Speak your message')).toBeTruthy();
});

test('spoken words are added after what was already typed', async () => {
  const user = userEvent.setup();
  await render(<Chat initial="Hi," />);
  await user.press(screen.getByTestId('chat-mic'));
  await act(async () => { rec.say('I need help with homework'); });
  expect(screen.getByTestId('input').props.value).toBe('Hi, I need help with homework');
});

test('no speech recognition -> no mic button', async () => {
  delete (global as any).SpeechRecognition;
  await render(<Chat />);
  expect(screen.queryByTestId('chat-mic')).toBeNull();
});
