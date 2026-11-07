import { Platform } from 'react-native';
import { getNetworkQuality, isSlowNetwork, onNetworkQualityChange } from '../networkQuality';

function setConnection(conn: any) {
  Object.defineProperty(globalThis.navigator, 'connection', { value: conn, configurable: true });
}

describe('networkQuality', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'web'));
  afterEach(() => setConnection(undefined));

  test.each([
    [{ effectiveType: '4g', downlink: 10 }, 'fast'],
    [{ effectiveType: '4g' }, 'fast'],
    [{ effectiveType: '3g', downlink: 1.2 }, 'slow'],
    [{ effectiveType: '2g' }, 'slow'],
    [{ effectiveType: 'slow-2g' }, 'slow'],
    [{ effectiveType: '4g', saveData: true }, 'slow'],
    [{ effectiveType: '4g', downlink: 0.8 }, 'slow'],
    [{}, 'unknown'],
  ])('%j -> %s', (conn, expected) => {
    setConnection(conn);
    expect(getNetworkQuality()).toBe(expected);
    expect(isSlowNetwork()).toBe(expected === 'slow');
  });

  test('no Network Information API (Safari) -> unknown', () => {
    setConnection(undefined);
    expect(getNetworkQuality()).toBe('unknown');
  });

  test('not web -> unknown', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    setConnection({ effectiveType: '2g' });
    expect(getNetworkQuality()).toBe('unknown');
  });

  test('onNetworkQualityChange reports the new quality and unsubscribes', () => {
    const listeners: (() => void)[] = [];
    const conn: any = {
      effectiveType: '3g',
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.splice(listeners.indexOf(cb), 1),
    };
    setConnection(conn);
    const cb = jest.fn();
    const off = onNetworkQualityChange(cb);
    conn.effectiveType = '4g';
    listeners.forEach((l) => l());
    expect(cb).toHaveBeenCalledWith('fast');
    off();
    expect(listeners).toHaveLength(0);
  });
});
