import { Platform } from 'react-native';
import { warmServices, __resetWarmServices } from '../warmServices';

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

  test('does not ping the same service again within 10 minutes', () => {
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
