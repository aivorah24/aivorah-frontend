import { Platform } from 'react-native';

// Chrome's online voices (e.g. "Google हिन्दी") silently drop a line spoken in the same instant as cancelling one
// that is still talking — measured live: changing the speed mid-line left 28s of silence and skipped the line.

class FakeUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  lang = '';
  voice: any = null;
  onstart?: () => void;
  onend?: () => void;
  onerror?: () => void;
  onboundary?: (e: any) => void;
  constructor(text: string) { this.text = text; }
}

function fakeSynth() {
  return { speaking: false, pending: false, speak: jest.fn(), cancel: jest.fn(), getVoices: () => [] };
}

let synth: ReturnType<typeof fakeSynth>;
let audio: typeof import('../audio');
const originalOS = Platform.OS;

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetModules();
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  synth = fakeSynth();
  (window as any).speechSynthesis = synth;
  (global as any).SpeechSynthesisUtterance = FakeUtterance;
  audio = require('../audio');
});

afterEach(() => {
  jest.useRealTimers();
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS });
  delete (window as any).speechSynthesis;
});

const spokenTexts = () => synth.speak.mock.calls.map((c) => c[0].text);

describe('speakWithBoundary — restarting while the voice is talking (speed change, replay, skip)', () => {
  test('the new line starts after a short gap, not in the same instant as the cancel', () => {
    synth.speaking = true;
    audio.speakWithBoundary('नई गति से पढ़ना', jest.fn(), jest.fn(), 0.6);

    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(spokenTexts()).toEqual(['नई गति से पढ़ना']);
  });

  test('when the voice is idle (normal next line) it still speaks immediately — no extra delay', () => {
    synth.speaking = false;
    audio.speakWithBoundary('अगली पंक्ति', jest.fn(), jest.fn());
    expect(spokenTexts()).toEqual(['अगली पंक्ति']);
  });

  test('pressing stop during the gap means nothing is spoken afterwards', () => {
    synth.speaking = true;
    audio.speakWithBoundary('should not play', jest.fn(), jest.fn());
    audio.stopSpeaking();
    jest.advanceTimersByTime(500);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  test('two quick changes in a row only speak the latest line, never both', () => {
    synth.speaking = true;
    audio.speakWithBoundary('first rate', jest.fn(), jest.fn(), 0.6);
    audio.speakWithBoundary('second rate', jest.fn(), jest.fn(), 1.25);
    jest.advanceTimersByTime(500);
    expect(spokenTexts()).toEqual(['second rate']);
  });

  test('replay / skip mid-line (stop first, then speak) also waits, so the new line is not dropped', () => {
    synth.speaking = true;
    audio.stopSpeaking();
    synth.speaking = false; // Chrome reports idle right after cancel
    audio.speakWithBoundary('फिर से', jest.fn(), jest.fn());

    expect(synth.speak).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(spokenTexts()).toEqual(['फिर से']);
  });
});
