import { renderHook, act } from '@testing-library/react-native';
import { useReplyReader } from '../useReplyReader';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (o: any) => o.web ?? o.default },
  OS: 'web',
  select: (o: any) => o.web ?? o.default,
}));

class MockUtterance {
  text: string; lang = ''; rate = 1; pitch = 1; volume = 1; voice: any = null;
  onstart: any = null; onend: any = null; onerror: any = null; onboundary: any = null;
  constructor(t: string) { this.text = t; }
}

let spoken: MockUtterance[];
beforeEach(() => {
  jest.useFakeTimers();
  spoken = [];
  (global as any).speechSynthesis = { speak: (u: MockUtterance) => spoken.push(u), cancel: jest.fn(), getVoices: () => [] };
  (global as any).SpeechSynthesisUtterance = MockUtterance;
});
afterEach(() => {
  jest.useRealTimers();
  delete (global as any).speechSynthesis;
  delete (global as any).SpeechSynthesisUtterance;
});

describe('useReplyReader', () => {
  test('no word is lit until the voice starts', async () => {
    const { result } = await renderHook(() => useReplyReader<number>());
    await act(async () => result.current.toggle(1, 'One two three four'));
    expect(result.current.position).toEqual({ block: 0, row: undefined, word: -1 });
  });

  test('a voice with no word boundaries still moves the highlight along', async () => {
    const { result } = await renderHook(() => useReplyReader<number>());
    await act(async () => result.current.toggle(1, 'Plants make food from sunlight water and air every day'));
    await act(async () => spoken[0].onstart());
    expect(result.current.position?.word).toBe(0);
    await act(async () => { jest.advanceTimersByTime(2500); });
    expect(result.current.position?.word).toBeGreaterThan(2);
  });

  test('real word boundaries take over from the estimate', async () => {
    const { result } = await renderHook(() => useReplyReader<number>());
    await act(async () => result.current.toggle(1, 'Half of **ten** is five'));
    await act(async () => spoken[0].onstart());
    await act(async () => spoken[0].onboundary({ name: 'word', charIndex: 'Half of '.length }));
    expect(result.current.position?.word).toBe(2);
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(result.current.position?.word).toBe(2);
  });

  test('lines are read one after another to the end', async () => {
    const { result } = await renderHook(() => useReplyReader<number>());
    await act(async () => result.current.toggle(1, 'First line\n---\nSecond line'));
    expect(spoken.map((u) => u.text)).toEqual(['First line']);
    await act(async () => spoken[0].onend());
    expect(spoken.map((u) => u.text)).toEqual(['First line', 'Second line']);
    expect(result.current.position?.block).toBe(2);
    await act(async () => spoken[1].onend());
    expect(result.current.speakingKey).toBeNull();
  });
});
