// The last data a screen showed, so opening it again renders instantly while
// fresh data loads in the background (stale-while-revalidate). On web it is
// kept in localStorage (synchronous, so the very first render already has it);
// elsewhere only in memory for this session. Keys must include who the data
// belongs to (studentId, grade, ...). Everything is cleared at sign-out
// (AuthContext.logout) so the next person on a shared device sees nothing.
const PREFIX = 'aivorah_screen_cache:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Entry<T> = { at: number; value: T };
const memory = new Map<string, Entry<unknown>>();

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null; // blocked storage (private mode, sandboxed frame)
  }
}

export function readScreenCache<T>(key: string, maxAgeMs = MAX_AGE_MS): T | null {
  let entry = memory.get(key) as Entry<T> | undefined;
  if (!entry) {
    try {
      const raw = storage()?.getItem(PREFIX + key);
      if (raw) entry = JSON.parse(raw) as Entry<T>;
    } catch { /* unreadable entry: ignore */ }
  }
  if (!entry || typeof entry.at !== 'number' || Date.now() - entry.at > maxAgeMs) return null;
  return entry.value;
}

export function writeScreenCache<T>(key: string, value: T): void {
  const entry: Entry<T> = { at: Date.now(), value };
  memory.set(key, entry);
  try {
    storage()?.setItem(PREFIX + key, JSON.stringify(entry));
  } catch { /* full or blocked storage: memory copy still works */ }
}

export function clearScreenCache(): void {
  memory.clear();
  const s = storage();
  if (!s) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => s.removeItem(k));
  } catch { /* ignore */ }
}
