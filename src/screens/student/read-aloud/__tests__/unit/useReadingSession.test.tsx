import { Platform } from 'react-native';
import { notify } from '../../utils/notify';
import { act, renderHook } from '@testing-library/react-native';
import { useReadingSession } from '../../hooks/useReadingSession';
import * as api from '../../services/readAloudApi';
import type { Passage } from '../../types';

jest.mock('../../../../../config/firebase', () => ({ auth: {} }));
jest.mock('../../services/readAloudApi');
jest.mock('../../utils/notify', () => ({ notify: jest.fn() }));
const mockApi = api as jest.Mocked<typeof api>;

const PASSAGE: Passage = { title: 'Sun', text: 'The sun heats the water', topic: 'How the World Works', level: 'easy', wordCount: 5 };

// ── Browser fakes ───────────────────────────────────────────────────
class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static isTypeSupported = (t: string) => t === 'audio/webm';
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((e: any) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() { FakeRecorder.instances.push(this); }
  start() { this.state = 'recording'; this.ondataavailable?.({ data: new Blob(['x'.repeat(2000)]) }); }
  pause() { this.state = 'paused'; }
  resume() { this.state = 'recording'; }
  stop() { this.state = 'inactive'; this.onstop?.(); }
}

class FakeRecognition {
  static last: FakeRecognition | null = null;
  onresult: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  started = 0;
  constructor() { FakeRecognition.last = this; }
  start() { this.started++; }
  stop() {}
  say(transcript: string) { this.onresult?.({ results: [[{ transcript }]] }); }
}

const track = { stop: jest.fn() };
const stream = { getTracks: () => [track] };
const g = global as any;
let restoreOS: () => void;

function setWeb() {
  const original = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  restoreOS = () => Object.defineProperty(Platform, 'OS', original);
}

const callbacks = () => ({ onCalibrated: jest.fn(), onLexileChanged: jest.fn(), addXP: jest.fn() });

async function renderSession(opts: Partial<Parameters<typeof useReadingSession>[0]> = {}) {
  const cb = callbacks();
  const hook = await renderHook(() => useReadingSession({ passage: PASSAGE, grade: 'Grade 4', isCalibration: false, ...cb, ...opts }));
  return { ...hook, cb };
}

async function flush() {
  await act(async () => { await Promise.resolve(); });
}

async function countdownToReading(result: any) {
  await act(async () => { result.current.startCountdown(); });
  expect(result.current.phase).toBe('countdown');
  await flush();
  await act(async () => { jest.advanceTimersByTime(2400); });
  await flush();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  FakeRecorder.instances = [];
  FakeRecognition.last = null;
  g.MediaRecorder = FakeRecorder;
  g.navigator.mediaDevices = { getUserMedia: jest.fn(async () => stream) };
  g.URL.createObjectURL = jest.fn(() => 'blob:rec');
  g.URL.revokeObjectURL = jest.fn();
  delete g.webkitSpeechRecognition;
  setWeb();
  mockApi.transcribeRecording.mockResolvedValue({ wordStatuses: ['correct', 'correct', 'misread', 'correct', 'correct'], matchedUpTo: 5 });
  mockApi.assessReading.mockResolvedValue({
    accuracy: 80, wcpm: 60, wpm: 75, totalWords: 5, correct: 4, misread: 1, skipped: 0, duration: 4,
    errors: [{ word: 'heats', position: 3, type: 'misread' }], feedback: 'Nice!', level: 'good', starsEarned: 50, lexile: 425, lexileChange: 25,
  });
  mockApi.saveLexile.mockResolvedValue({ lexile: 500 });
});

afterEach(() => {
  restoreOS();
  jest.useRealTimers();
});

test('countdown → reading → preview → submit → scored review', async () => {
  const { result, cb } = await renderSession();
  await countdownToReading(result);
  expect(result.current.phase).toBe('reading');
  expect(result.current.wordStatuses[0]).toBe('current');
  expect(result.current.activeEngine).toBe('whisper');
  expect(FakeRecorder.instances).toHaveLength(1);

  await act(async () => { await result.current.stopReading(); });
  expect(result.current.phase).toBe('preview');
  expect(result.current.hasRecording).toBe(true);
  expect(track.stop).toHaveBeenCalled();

  await act(async () => { await result.current.submitRecording(); });
  await flush();
  expect(mockApi.transcribeRecording).toHaveBeenCalledWith(expect.any(Blob), PASSAGE.text);
  expect(mockApi.assessReading).toHaveBeenCalledWith(expect.objectContaining({
    passage: PASSAGE.text, grade: 'Grade 4', topic: 'How the World Works', wordStatuses: ['correct', 'correct', 'misread', 'correct', 'correct'],
  }));
  expect(result.current.phase).toBe('reviewing');
  expect(result.current.result?.accuracy).toBe(80);
  expect(result.current.starsEarned).toBe(50);
  expect(cb.addXP).toHaveBeenCalledWith(50);
  expect(cb.onLexileChanged).toHaveBeenCalledWith(425);
});

test('the live highlight follows browser speech recognition', async () => {
  g.webkitSpeechRecognition = FakeRecognition;
  const { result } = await renderSession();
  await countdownToReading(result);
  expect(result.current.activeEngine).toBe('webspeech');
  await act(async () => { FakeRecognition.last!.say('the sun heats'); });
  await act(async () => { jest.advanceTimersByTime(200); });
  expect(result.current.wordStatuses).toEqual(['correct', 'correct', 'correct', 'current', 'pending']);
  expect(result.current.sourcePos).toBe(3);

  // Pausing stops recognition; Web Speech is not restarted while paused.
  await act(async () => { result.current.pauseRecording(); });
  expect(result.current.isPaused).toBe(true);
  const rec = FakeRecognition.last!;
  const starts = rec.started;
  await act(async () => { rec.onend?.(); });
  expect(rec.started).toBe(starts);
});

test('leaving during the countdown never starts a recording', async () => {
  const { result } = await renderSession();
  await act(async () => { result.current.startCountdown(); });
  await flush();
  await act(async () => { result.current.reset(); });
  await act(async () => { jest.advanceTimersByTime(5000); });
  await flush();
  expect(result.current.phase).toBe('idle');
  expect(FakeRecorder.instances).toHaveLength(0);
  expect(track.stop).toHaveBeenCalled();
});

test('unmounting during the countdown never starts a recording', async () => {
  const { result, unmount } = await renderSession();
  await act(async () => { result.current.startCountdown(); });
  await flush();
  await act(async () => { unmount(); });
  await act(async () => { jest.advanceTimersByTime(5000); });
  await flush();
  expect(FakeRecorder.instances).toHaveLength(0);
});

test('a blocked microphone explains and returns to the passage', async () => {
  g.navigator.mediaDevices.getUserMedia = jest.fn(async () => { throw new Error('denied'); });
  const { result } = await renderSession();
  await countdownToReading(result);
  expect(notify).toHaveBeenCalledWith('Microphone Access', expect.any(String));
  expect(result.current.phase).toBe('idle');
});

test('when scoring fails the reading is scored on the device', async () => {
  mockApi.assessReading.mockRejectedValueOnce(new Error('down'));
  mockApi.transcribeRecording.mockRejectedValueOnce(new Error('down'));
  const { result, cb } = await renderSession();
  await countdownToReading(result);
  await act(async () => { await result.current.stopReading(); });
  await act(async () => { await result.current.submitRecording(); });
  await flush();
  expect(result.current.phase).toBe('reviewing');
  expect(result.current.result).toEqual(expect.objectContaining({ totalWords: 5, correct: 0, skipped: 5, level: 'needs-practice' }));
  expect(cb.addXP).not.toHaveBeenCalled();
});

test('the calibration reading sets and saves the starting Lexile', async () => {
  mockApi.assessReading.mockResolvedValueOnce({
    accuracy: 96, wcpm: 90, wpm: 95, totalWords: 5, correct: 5, misread: 0, skipped: 0, duration: 4, errors: [], feedback: 'x', level: 'excellent', starsEarned: 50,
  });
  const { result, cb } = await renderSession({ isCalibration: true });
  await countdownToReading(result);
  await act(async () => { await result.current.stopReading(); });
  await act(async () => { await result.current.submitRecording(); });
  await flush();
  expect(mockApi.saveLexile).toHaveBeenCalledWith(600, 'calibration');
  expect(cb.onCalibrated).toHaveBeenCalledWith(600);
  expect(result.current.result).toEqual(expect.objectContaining({ isCalibration: true, calibrationLexile: 600 }));
  expect(result.current.result?.feedback).toMatch(/600L/);
  expect(cb.addXP).not.toHaveBeenCalled();
});

test('outside the browser, reading explains it is web-only', async () => {
  restoreOS();
  const { result } = await renderSession();
  await act(async () => { result.current.startCountdown(); });
  await act(async () => { jest.advanceTimersByTime(2400); });
  await flush();
  expect(notify).toHaveBeenCalledWith('Not Supported', expect.any(String));
  expect(result.current.phase).toBe('idle');
  setWeb();
});
