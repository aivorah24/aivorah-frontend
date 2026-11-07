// The spoken last practice question and its report card, with the browser's
// speech recognition faked (same pattern as ai-coach/useVoiceInput.test).
import React from 'react';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import SpokenQuestion from '../components/SpokenQuestion';
import SpokenReport from '../components/SpokenReport';
import { darkColors } from '../../../../../theme';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default ?? obj.ios },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default ?? obj.ios,
}));

class FakeRecognition {
  lang = ''; continuous = false; interimResults = false; maxAlternatives = 1;
  onresult: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  starts = 0;
  start() { this.starts += 1; }
  stop() { this.onend?.(); }
  abort() {}
  // what the browser does while the student speaks
  say(text: string, isFinal: boolean) {
    this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] });
  }
}
let rec: FakeRecognition;

function Harness({ status = 'idle' as any, error = '', onSubmit = jest.fn() }) {
  const [text, setText] = React.useState('');
  return (
    <SpokenQuestion hint="Talk about the main ideas." text={text} setText={setText} status={status} error={error}
      onSubmit={onSubmit} colors={darkColors} isDark />
  );
}

beforeEach(() => {
  (global as any).SpeechRecognition = jest.fn(() => { rec = new FakeRecognition(); return rec; });
});
afterEach(() => { delete (global as any).SpeechRecognition; });

describe('SpokenQuestion', () => {
  test('mic -> words appear while speaking -> Stop keeps the full text -> Submit', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onSubmit={onSubmit} />);
    expect(screen.getByTestId('spoken-submit').props.accessibilityState?.disabled).toBe(true);

    await user.press(screen.getByTestId('spoken-start'));
    expect(screen.getByText('Listening… speak now')).toBeTruthy();
    expect(rec.continuous).toBe(true);

    await act(async () => { rec.say('Tenali Rama was', false); });
    expect(screen.getByText('Tenali Rama was')).toBeTruthy();
    await act(async () => { rec.say('Tenali Rama was a clever poet in the court', true); });

    await user.press(screen.getByTestId('spoken-stop'));
    expect(screen.getByText('Tenali Rama was a clever poet in the court')).toBeTruthy();
    expect(screen.getByTestId('spoken-rerecord')).toBeTruthy();

    await user.press(screen.getByTestId('spoken-submit'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('a pause does not end the recording: the browser session is restarted and text is kept', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('spoken-start'));
    await act(async () => { rec.say('First part of my answer', true); });
    await act(async () => { rec.onend?.(); }); // browser stops after silence
    expect(rec.starts).toBe(2);
    expect(screen.getByText('Listening… speak now')).toBeTruthy();
    await act(async () => { rec.say('second part', true); });
    expect(screen.getByText('First part of my answer second part')).toBeTruthy();
  });

  test('Record again clears the old answer and listens afresh', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('spoken-start'));
    await act(async () => { rec.say('my first try at this', true); });
    await user.press(screen.getByTestId('spoken-stop'));

    await user.press(screen.getByTestId('spoken-rerecord'));
    expect(screen.queryByText('my first try at this')).toBeNull();
    expect(screen.getByText('Listening… speak now')).toBeTruthy();
  });

  test('blocked microphone -> a clear message', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('spoken-start'));
    await act(async () => { rec.onerror?.({ error: 'not-allowed' }); rec.onend?.(); });
    expect(screen.getByText(/Microphone access is blocked/)).toBeTruthy();
  });

  test('no speech recognition in this browser -> type instead', async () => {
    delete (global as any).SpeechRecognition;
    const user = userEvent.setup();
    await render(<Harness />);
    expect(screen.getByText(/type your explanation instead/)).toBeTruthy();
    await user.type(screen.getByTestId('spoken-typed'), 'He used his wit');
    expect(screen.getByTestId('spoken-submit').props.accessibilityState?.disabled).toBe(false);
  });

  test('while grading: a waiting message; a failure message is shown', async () => {
    await render(<Harness status="checking" />);
    expect(screen.getByText('Aivorah is checking your answer…')).toBeTruthy();
    await render(<Harness status="error" error="Could not check your explanation. Please try again." />);
    expect(screen.getByText('Could not check your explanation. Please try again.')).toBeTruthy();
  });
});

describe('SpokenReport', () => {
  test('shows what was said, the score, covered / missing ideas and feedback', async () => {
    await render(
      <SpokenReport
        question='Explain "The Wit that Won Hearts" in your own words.'
        said="Tenali Rama used his wit"
        evaluation={{ score: 7, outOf: 10, passed: true, verdict: 'good', covered: ['Tenali Rama used wit'], missing: ['the Vijayanagara Empire'], mistakes: ['The king was Krishnadeva Raya, not Ashoka'], feedback: 'Nice work!' }}
        colors={darkColors}
      />,
    );
    expect(screen.getByText('7/10')).toBeTruthy();
    expect(screen.getByText('Good explanation')).toBeTruthy();
    expect(screen.getByText('“Tenali Rama used his wit”')).toBeTruthy();
    expect(screen.getByText('Tenali Rama used wit')).toBeTruthy();
    expect(screen.getByText('the Vijayanagara Empire')).toBeTruthy();
    expect(screen.getByText('The king was Krishnadeva Raya, not Ashoka')).toBeTruthy();
    expect(screen.getByText(/Nice work!/)).toBeTruthy();
  });
});
