import { withAuthToken, isOwnServiceUrl } from '../authFetch';

function setup(user: { getIdToken: () => Promise<string> } | null) {
  const base = jest.fn(async () => new Response('{}')) as unknown as jest.Mock & typeof fetch;
  const f = withAuthToken(base, () => ({ currentUser: user, authStateReady: async () => {} }));
  const sentHeaders = () => new Headers((base.mock.calls[0][1] as RequestInit | undefined)?.headers);
  return { base, f, sentHeaders };
}
const user = { getIdToken: async () => 'tok123' };

test('matches only our own service hosts', () => {
  expect(isOwnServiceUrl('https://aivorah-auth-service.onrender.com/user/sync')).toBe(true);
  expect(isOwnServiceUrl('https://aivorah-school-admin-w0xk.onrender.com/x')).toBe(true);
  expect(isOwnServiceUrl('http://localhost:4001/user/sync')).toBe(true);
  expect(isOwnServiceUrl('https://api.cloudinary.com/v1/upload')).toBe(false);
  expect(isOwnServiceUrl('https://evil.com/?u=https://aivorah-auth-service.onrender.com')).toBe(false);
  expect(isOwnServiceUrl('https://aivorah-auth-service.onrender.com.evil.com/x')).toBe(false);
});

test('adds the bearer token to own-service calls and keeps existing headers', async () => {
  const { f, sentHeaders } = setup(user);
  await f('https://aivorah-auth-service.onrender.com/user/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  expect(sentHeaders().get('authorization')).toBe('Bearer tok123');
  expect(sentHeaders().get('content-type')).toBe('application/json');
});

test('never sends the token to third-party URLs', async () => {
  const { f, base } = setup(user);
  await f('https://api.cloudinary.com/v1/upload', { method: 'POST' });
  expect(base).toHaveBeenCalledWith('https://api.cloudinary.com/v1/upload', { method: 'POST' });
});

test('keeps an Authorization header the caller already set', async () => {
  const { f, base } = setup(user);
  const init = { headers: { Authorization: 'Bearer explicit' } };
  await f('https://aivorah-platform-admin-service.onrender.com/overview', init);
  expect(base).toHaveBeenCalledWith('https://aivorah-platform-admin-service.onrender.com/overview', init);
});

test('signed out: request goes through unchanged', async () => {
  const { f, base } = setup(null);
  await f('https://aivorah-auth-service.onrender.com/user/role?email=a');
  expect(base).toHaveBeenCalledWith('https://aivorah-auth-service.onrender.com/user/role?email=a', undefined);
});

test('token error: request still goes through unchanged', async () => {
  const { f, base } = setup({ getIdToken: async () => { throw new Error('offline'); } });
  await f('https://aivorah-auth-service.onrender.com/user/sync', { method: 'POST' });
  expect(base).toHaveBeenCalledWith('https://aivorah-auth-service.onrender.com/user/sync', { method: 'POST' });
});
