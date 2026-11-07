import { Platform } from 'react-native';

// How good the user's connection is, from the browser's Network Information
// API (Chrome/Edge/Android; Safari and Firefox don't expose it).
//  - 'slow': Data Saver is on, or the browser rates the link 2G/3G or below
//    ~1.5 Mbps. Download only what the current screen needs.
//  - 'fast': 4G/5G/Wi-Fi (browsers report 5G as '4g'). Safe to prefetch.
//  - 'unknown': no API (iOS Safari, Firefox, native). Treated like 'fast'
//    by callers, but only prefetches once the page is idle.
export type NetworkQuality = 'fast' | 'slow' | 'unknown';

type ConnectionInfo = {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
  addEventListener?: (type: 'change', cb: () => void) => void;
  removeEventListener?: (type: 'change', cb: () => void) => void;
};

function getConnection(): ConnectionInfo | undefined {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return undefined;
  return (navigator as any).connection as ConnectionInfo | undefined;
}

export function getNetworkQuality(): NetworkQuality {
  const c = getConnection();
  if (!c) return 'unknown';
  if (c.saveData) return 'slow';
  const type = c.effectiveType;
  if (type === 'slow-2g' || type === '2g' || type === '3g') return 'slow';
  if (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 1.5) return 'slow';
  if (type === '4g') return 'fast';
  return 'unknown';
}

export function isSlowNetwork(): boolean {
  return getNetworkQuality() === 'slow';
}

// Calls `cb` when the connection type changes (e.g. walking out of Wi-Fi).
// Returns an unsubscribe function; a no-op where the API is missing.
export function onNetworkQualityChange(cb: (q: NetworkQuality) => void): () => void {
  const c = getConnection();
  if (!c?.addEventListener) return () => {};
  const handler = () => cb(getNetworkQuality());
  c.addEventListener('change', handler);
  return () => c.removeEventListener?.('change', handler);
}
