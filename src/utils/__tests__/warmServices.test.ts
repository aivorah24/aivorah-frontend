import { Platform } from 'react-native';
import { warmServices, keepServicesWarm, KEEP_WARM_EVERY_MS, __resetWarmServices } from '../warmServices';

describe('warmServices', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
    __resetWarmServices();
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as any;
  });
  afterEach(() => { global.fetch = realFetch; jest.useRealTimers(); });

  test('pings /health once per service, without CORS', () => {
    warmServices(['https://a.onrender.com', 'https://b.onrender.com', 'https://a.onrender.com']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('https://a.onrender.com/health', expect.objectContaining({ mode: 'no-cors' }));
    expect(fetchMock).toHaveBeenCalledWith('https://b.onrender.com/health', expect.anything());
  });

  test('does not ping the same service again within 8 minutes', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-07T10:00:00Z'));
    warmServices(['https://a.onrender.com']);
    jest.setSystemTime(new Date('2026-11-07T10:05:00Z'));
    warmServices(['https://a.onrender.com']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    jest.setSystemTime(new Date('2026-11-07T10:11:00Z'));
    warmServices(['https://a.onrender.com']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('skips local dev services and native', () => {
    warmServices(['http://localhost:4003']);
    expect(fetchMock).not.toHaveBeenCalled();
    jest.replaceProperty(Platform, 'OS', 'android');
    warmServices(['https://a.onrender.com']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('a failed ping is swallowed', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(() => warmServices(['https://a.onrender.com'])).not.toThrow();
    await Promise.resolve();
  });
});

describe('keepServicesWarm', () => {
  const realFetch = global.fetch;
  let fetchMock: jest.Mock;
  let visibility: DocumentVisibilityState = 'visible';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-12T08:00:00Z'));
    jest.replaceProperty(Platform, 'OS', 'web');
    __resetWarmServices();
    fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as any;
    visibility = 'visible';
    // React Native test environment has no DOM: a minimal document with
    // visibilityState and visibilitychange events.
    const fakeDocument = new EventTarget();
    Object.defineProperty(fakeDocument, 'visibilityState', { configurable: true, get: () => visibility });
    (globalThis as any).document = fakeDocument;
  });
  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
    delete (globalThis as any).document;
  });

  test('pings now, then again before Render\'s 15-minute sleep while the tab is open', () => {
    const stop = keepServicesWarm(['https://a.onrender.com', 'https://b.onrender.com']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(KEEP_WARM_EVERY_MS);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(KEEP_WARM_EVERY_MS).toBeLessThan(15 * 60 * 1000);
    stop();
    jest.advanceTimersByTime(KEEP_WARM_EVERY_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test('a hidden tab stops pinging, and coming back wakes everything again', () => {
    const stop = keepServicesWarm(['https://a.onrender.com']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    visibility = 'hidden';
    jest.advanceTimersByTime(KEEP_WARM_EVERY_MS * 4);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    stop();
  });
});
