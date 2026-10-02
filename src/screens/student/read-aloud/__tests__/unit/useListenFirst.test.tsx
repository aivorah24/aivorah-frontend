import { Platform } from 'react-native';
import { notify } from '../../utils/notify';
import { act, renderHook } from '@testing-library/react-native';
import { useListenFirst } from '../../hooks/useListenFirst';
import * as api from '../../services/readAloudApi';
import type { Passage } from '../../types';

jest.mock('../../../../../config/firebase', () => ({ auth: {} }));
jest.mock('../../services/readAloudApi');
jest.mock('../../utils/notify', () => ({ notify: jest.fn() }));
const mockApi = api as jest.Mocked<typeof api>;

const PASSAGE: Passage = { title: 'Sun', text: 'The sun heats water', topic: 'T', level: 'easy', wordCount: 4 };
const g = global as any;

class FakeAudio {
  static last: FakeAudio;
  listeners: Record<string, () => void> = {};
  paused = true;
  ended = false;
  currentTime = 0;
  duration = 4;
  crossOrigin = '';
  preload = '';
  constructor(public src: string) { FakeAudio.last = this; }
  addEventListener(name: string, fn: () => void) { this.listeners[name] = fn; }
  load() {}
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  fire(name: string) { this.listeners[name]?.(); }
}

const speech = { cancel: jest.fn(), speak: jest.fn(), pause: jest.fn(), resume: jest.fn(), paused: false, speaking: false };
let restoreOS: () => void;

beforeEach(() => {
  jest.clearAllMocks();
  const original = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  restoreOS = () => Object.defineProperty(Platform, 'OS', original);
  g.Audio = FakeAudio;
  g.speechSynthesis = speech;
  g.SpeechSynthesisUtterance = function (this: any, text: string) { this.text = text; };
  g.requestAnimationFrame = jest.fn(() => 1);
  g.cancelAnimationFrame = jest.fn();
  speech.paused = false;
  speech.speaking = false;
});

afterEach(() => restoreOS());

test('plays the narration, then pauses, resumes and stops', async () => {
  mockApi.fetchSpeech.mockResolvedValue({ audioUrl: 'https://cdn/a.mp3', wordTimings: null });
  const { result } = await renderHook(() => useListenFirst(PASSAGE));
  await act(async () => { await result.current.toggle(); });
  expect(mockApi.fetchSpeech).toHaveBeenCalledWith(PASSAGE.text);
  expect(result.current.isLoading).toBe(true);
  await act(async () => { FakeAudio.last.fire('loadeddata'); });
  expect(result.current.isLoading).toBe(false);
  expect(result.current.isPlaying).toBe(true);
  expect(FakeAudio.last.src).toBe('https://cdn/a.mp3');

  await act(async () => { result.current.toggle(); });
  expect(result.current.isPaused).toBe(true);
  // Pausing before the first word has played must still resume (currentTime is 0).
  await act(async () => { result.current.toggle(); });
  expect(result.current.isPlaying).toBe(true);

  await act(async () => { result.current.stop(); });
  expect(result.current.isPlaying).toBe(false);
  expect(result.current.highlightIdx).toBe(-1);
});

test('falls back to the browser voice when narration is unavailable', async () => {
  mockApi.fetchSpeech.mockRejectedValue(new Error('Narration unavailable'));
  const { result } = await renderHook(() => useListenFirst(PASSAGE));
  await act(async () => { await result.current.toggle(); });
  expect(speech.speak).toHaveBeenCalledWith(expect.objectContaining({ text: PASSAGE.text }));
  expect(result.current.isPlaying).toBe(true);
  expect(result.current.highlightIdx).toBe(0);
});

test('a broken audio file also falls back to the browser voice', async () => {
  mockApi.fetchSpeech.mockResolvedValue({ audioUrl: 'https://cdn/broken.mp3' });
  const { result } = await renderHook(() => useListenFirst(PASSAGE));
  await act(async () => { await result.current.toggle(); });
  await act(async () => { FakeAudio.last.fire('error'); });
  expect(speech.speak).toHaveBeenCalled();
});

test('leaving the screen silences the narration', async () => {
  mockApi.fetchSpeech.mockResolvedValue({ audioUrl: 'https://cdn/a.mp3' });
  const { result, unmount } = await renderHook(() => useListenFirst(PASSAGE));
  await act(async () => { await result.current.toggle(); });
  await act(async () => { FakeAudio.last.fire('loadeddata'); });
  const audio = FakeAudio.last;
  await act(async () => { unmount(); });
  expect(audio.paused).toBe(true);
  expect(speech.cancel).toHaveBeenCalled();
});

test('without speech support it tells the student', async () => {
  delete g.speechSynthesis;
  mockApi.fetchSpeech.mockResolvedValue({});
  const { result } = await renderHook(() => useListenFirst(PASSAGE));
  await act(async () => { await result.current.toggle(); });
  expect(notify).toHaveBeenCalledWith('Audio Unavailable', expect.any(String));
  expect(result.current.isPlaying).toBe(false);
});
