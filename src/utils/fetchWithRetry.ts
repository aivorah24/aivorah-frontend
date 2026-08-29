// Shared network-resilience helper. Bounds each attempt with an
// AbortController timeout and retries with a short backoff before the
// caller gives up for real.
//
// Exists because a single flaky hop used to mean a `fetch()` that never
// resolves (no built-in timeout) plus a single failed attempt permanently
// showing stale/wrong data, on this real dev machine's intermittent
// (confirmed ~1-in-6, 2026-08-28) network path to Supabase's edge — verified
// with a plain curl straight at Supabase, outside any app code. First built
// for StudentDataContext's stats fetch (Progress page showing all-zero
// despite real DB data), then reused for useSuggestions (AI Coach chips
// stuck on the generic Grade 3 fallback for any grade whose one fetch
// attempt happened to land on that blip) — same root cause, same fix,
// shared here instead of duplicated per call site.
export async function fetchWithRetry(url: string, options: RequestInit = {}, attempts = 3, timeoutMs = 6000): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}
