import { fetchWithRetry, attemptTimeoutMs } from '../fetchWithRetry';

// A fetch that never answers until aborted — like a Render service still booting.
function hangingFetch() {
  return jest.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  }));
}

afterEach(() => jest.useRealTimers());

test('each retry waits longer: 6 s, 15 s, 30 s', () => {
  expect([0, 1, 2, 5].map((i) => attemptTimeoutMs(i, 6000))).toEqual([6000, 15000, 30000, 30000]);
});

test('returns the first answer', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  global.fetch = fetchMock as any;
  await expect(fetchWithRetry('https://a.onrender.com/x')).resolves.toMatchObject({ ok: true });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('a service that wakes up after ~20 s is still reached (the 3rd attempt waits 30 s)', async () => {
  jest.useFakeTimers();
  const hanging = hangingFetch();
  let calls = 0;
  global.fetch = jest.fn((url: string, init: RequestInit) => {
    calls += 1;
    if (calls < 3) return hanging(url, init);
    // 3rd attempt: the service answers 8 s later (it booted meanwhile).
    return new Promise((resolve) => setTimeout(() => resolve({ ok: true, status: 200 }), 8000));
  }) as any;

  const result = fetchWithRetry('https://a.onrender.com/x');
  await jest.advanceTimersByTimeAsync(6000 + 400 + 15000 + 800 + 8000);
  await expect(result).resolves.toMatchObject({ ok: true });
  expect(calls).toBe(3);
});

test('gives up after the last attempt', async () => {
  jest.useFakeTimers();
  global.fetch = hangingFetch() as any;
  const result = fetchWithRetry('https://a.onrender.com/x').catch((e) => e);
  await jest.advanceTimersByTimeAsync(6000 + 400 + 15000 + 800 + 30000);
  expect(await result).toBeInstanceOf(Error);
  expect(global.fetch).toHaveBeenCalledTimes(3);
});
