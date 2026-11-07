// AuthContext's /user/sync (run on every page load) already returns the user's
// id. StudentDataContext used to call /user/sync again right after it, only to
// read that same id — one more full round trip before the dashboard's stats
// could even be requested. AuthContext now primes the id here and
// resolveStudentId() reuses it if it's fresh (from this same page load).
const FRESH_MS = 60 * 1000;
const primed = new Map<string, { id: string; at: number }>();

const key = (email: string) => email.trim().toLowerCase();

export function primeStudentId(email: string, id: string): void {
  if (email && id) primed.set(key(email), { id, at: Date.now() });
}

export function getPrimedStudentId(email: string): string | null {
  const hit = primed.get(key(email));
  return hit && Date.now() - hit.at < FRESH_MS ? hit.id : null;
}

export function clearPrimedStudentIds(): void {
  primed.clear();
}
