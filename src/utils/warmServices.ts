import { Platform } from 'react-native';

// The microservices run on Render, which puts an idle service to sleep; the
// first request after that waits ~20s while it boots. Pinging /health as soon
// as we know which services the user's role is about to use starts that boot
// in the background, in parallel, instead of one by one as the user opens
// each page. Each service is pinged at most once per WARM_INTERVAL_MS per tab,
// so this adds one tiny request per service, not one per screen.
const WARM_INTERVAL_MS = 10 * 60 * 1000;
const lastPing = new Map<string, number>();

export function warmServices(baseUrls: string[]): void {
  if (Platform.OS !== 'web' || typeof fetch !== 'function') return;
  const now = Date.now();
  for (const base of new Set(baseUrls)) {
    if (!/^https:\/\//.test(base)) continue; // local dev services never sleep
    const last = lastPing.get(base);
    if (last && now - last < WARM_INTERVAL_MS) continue;
    lastPing.set(base, now);
    // no-cors: we never read the reply, so no CORS preflight either.
    fetch(`${base}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
  }
}

// Test helper.
export function __resetWarmServices(): void {
  lastPing.clear();
}
