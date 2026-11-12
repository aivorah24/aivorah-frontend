import { readScreenCache, writeScreenCache, clearScreenCache } from '../screenCache';

// Minimal localStorage (the React Native test environment has none).
function fakeLocalStorage() {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => { data.set(k, String(v)); },
    removeItem: (k: string) => { data.delete(k); },
    clear: () => data.clear(),
  };
}

beforeEach(() => {
  (globalThis as any).localStorage = fakeLocalStorage();
  clearScreenCache();
});
afterEach(() => {
  jest.useRealTimers();
  delete (globalThis as any).localStorage;
});

test('returns what was written', () => {
  writeScreenCache('challenges:s1', [{ id: 'c1' }]);
  expect(readScreenCache('challenges:s1')).toEqual([{ id: 'c1' }]);
  expect(readScreenCache('challenges:s2')).toBeNull();
});

test('survives a page reload (read back from localStorage)', () => {
  localStorage.setItem('aivorah_screen_cache:attendance:s1', JSON.stringify({ at: Date.now(), value: { present: 12 } }));
  expect(readScreenCache('attendance:s1')).toEqual({ present: 12 });
});

test('entries older than a week are ignored', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-01T08:00:00Z'));
  writeScreenCache('timetable:x', { days: [] });
  jest.setSystemTime(new Date('2026-11-09T08:00:00Z'));
  expect(readScreenCache('timetable:x')).toBeNull();
});

test('sign-out clears every screen entry and nothing else', () => {
  localStorage.setItem('aivorah_theme', 'dark');
  writeScreenCache('challenges:s1', [1]);
  writeScreenCache('attendance:s1', { a: 1 });
  clearScreenCache();
  expect(readScreenCache('challenges:s1')).toBeNull();
  expect(readScreenCache('attendance:s1')).toBeNull();
  expect(localStorage.getItem('aivorah_theme')).toBe('dark');
  expect(localStorage.length).toBe(1);
});

test('a broken or blocked storage never throws', () => {
  (globalThis as any).localStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('full'); },
    get length() { return 0; },
    key: () => null,
    removeItem: () => {},
  };
  expect(() => writeScreenCache('k', 1)).not.toThrow();
  expect(readScreenCache('k')).toBe(1); // still served from memory
  expect(() => clearScreenCache()).not.toThrow();
});
