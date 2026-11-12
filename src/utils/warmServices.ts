import { Platform } from 'react-native';

// The microservices run on Render, which puts a service to sleep after ~15
// minutes without requests; the first request after that waits 20-50 s while
// it boots. Pinging /health as soon as we know which services the user's role
// is about to use starts that boot in the background, in parallel, instead of
// one by one as the user opens each page. Each service is pinged at most once
// per WARM_INTERVAL_MS per tab, so this adds one tiny request per service, not
// one per screen.
const WARM_INTERVAL_MS = 8 * 60 * 1000;
// Under Render's 15-minute idle limit, and above WARM_INTERVAL_MS so each
// keep-warm round actually pings.
export const KEEP_WARM_EVERY_MS = 9 * 60 * 1000;
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

function pageVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

// Wakes the services now and keeps them awake while this tab is open and
// visible: re-pings every KEEP_WARM_EVERY_MS, and right away when the user
// comes back to the tab (a service may have slept meanwhile). A hidden tab
// stops pinging, so services still go to sleep when nobody is using the app.
// Returns a cleanup function.
export function keepServicesWarm(baseUrls: string[]): () => void {
  if (Platform.OS !== 'web') return () => {};
  warmServices(baseUrls);
  const timer = setInterval(() => { if (pageVisible()) warmServices(baseUrls); }, KEEP_WARM_EVERY_MS);
  const onVisible = () => { if (pageVisible()) warmServices(baseUrls); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(timer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
  };
}

// Test helper.
export function __resetWarmServices(): void {
  lastPing.clear();
}
