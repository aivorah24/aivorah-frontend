// Adds the signed-in user's Firebase ID token to every request to our own services.
// Never blocks a request: no user, a slow Firebase restore or a token error just sends it unchanged.

const OWN_SERVICE = /^(https:\/\/aivorah-[a-z0-9-]+\.onrender\.com|http:\/\/localhost:\d+)(\/|$)/i;
const RESTORE_WAIT_MS = 3000;

type TokenSource = { currentUser: { getIdToken(): Promise<string> } | null; authStateReady?: () => Promise<void> };

export function isOwnServiceUrl(url: string): boolean {
  return OWN_SERVICE.test(url);
}

async function currentToken(auth: TokenSource): Promise<string | null> {
  try {
    if (auth.authStateReady) {
      await Promise.race([auth.authStateReady(), new Promise((r) => setTimeout(r, RESTORE_WAIT_MS))]);
    }
    return (await auth.currentUser?.getIdToken()) ?? null;
  } catch {
    return null;
  }
}

export function withAuthToken(baseFetch: typeof fetch, getAuth: () => TokenSource): typeof fetch {
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    if (!isOwnServiceUrl(url)) return baseFetch(input, init);

    const headers = new Headers(typeof input === 'object' && 'headers' in input ? (input as Request).headers : undefined);
    new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
    if (headers.has('authorization')) return baseFetch(input, init);

    const token = await currentToken(getAuth());
    if (!token) return baseFetch(input, init);
    headers.set('Authorization', `Bearer ${token}`);
    return baseFetch(input, { ...init, headers });
  };
  return wrapped as typeof fetch;
}

let installed = false;
export function installAuthFetch(): void {
  if (installed || typeof globalThis.fetch !== 'function') return;
  installed = true;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so Firebase loads after app start
  const getAuth = () => require('../config/firebase').auth as TokenSource;
  globalThis.fetch = withAuthToken(globalThis.fetch.bind(globalThis), getAuth);
}
