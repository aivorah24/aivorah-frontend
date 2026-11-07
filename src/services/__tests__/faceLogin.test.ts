// Face login (passkeys) in the app: the device prompt, the auth-service calls
// and the Firebase sign-in, with the browser and network faked.
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (o: any) => o.web ?? o.default },
  OS: 'web',
  select: (o: any) => o.web ?? o.default,
}));
jest.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: jest.fn(() => true),
  platformAuthenticatorIsAvailable: jest.fn(async () => true),
  startAuthentication: jest.fn(async () => ({ id: 'cred-1', type: 'public-key' })),
  startRegistration: jest.fn(async () => ({ id: 'new-cred', type: 'public-key' })),
}));
jest.mock('firebase/auth', () => ({ signInWithCustomToken: jest.fn(async () => ({ user: { uid: 'u1' } })) }));
jest.mock('../../config/firebase', () => ({ auth: { name: 'test-auth' } }));
jest.mock('../authHeader', () => ({ authHeader: jest.fn(async () => ({ Authorization: 'Bearer id-token' })) }));

import * as webauthn from '@simplewebauthn/browser';
import { signInWithCustomToken } from 'firebase/auth';
import AUTH_SERVER_URL from '../../config/authServerUrl';
import {
  faceLoginAvailable, signInWithFace, addFaceLogin, listFaceLogins, removeFaceLogin, faceLoginErrorMessage, deviceLabel,
} from '../faceLogin';

const json = (data: any, ok = true) => Promise.resolve({ ok, json: async () => data });
const calls = () => (global.fetch as jest.Mock).mock.calls.map(([url, init]) => ({ url, init, body: init?.body ? JSON.parse(init.body) : undefined }));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn((url: string) => {
    if (url.endsWith('/login/options')) return json({ options: { challenge: 'c1' }, challengeToken: 'tok-1' });
    if (url.endsWith('/login')) return json({ token: 'custom-token' });
    if (url.endsWith('/register/options')) return json({ options: { challenge: 'c2' }, challengeToken: 'tok-2' });
    if (url.endsWith('/register')) return json({ ok: true });
    return json({ passkeys: [{ id: 'p1', deviceLabel: 'Windows · Chrome', createdAt: '2026-11-07', lastUsedAt: null }] });
  }) as any;
});

test('available only where the device has a face / fingerprint unlock', async () => {
  expect(await faceLoginAvailable()).toBe(true);
  (webauthn.platformAuthenticatorIsAvailable as jest.Mock).mockResolvedValueOnce(false);
  expect(await faceLoginAvailable()).toBe(false);
});

test('signing in: device check, then the server\'s token signs in to Firebase', async () => {
  await signInWithFace();
  expect(webauthn.startAuthentication).toHaveBeenCalledWith({ optionsJSON: { challenge: 'c1' } });
  const login = calls().find((c) => c.url === `${AUTH_SERVER_URL}/user/passkeys/login`)!;
  expect(login.body).toEqual({ response: { id: 'cred-1', type: 'public-key' }, challengeToken: 'tok-1' });
  expect(login.init.headers.Authorization).toBeUndefined(); // nobody is signed in yet
  expect(signInWithCustomToken).toHaveBeenCalledWith({ name: 'test-auth' }, 'custom-token');
});

test('a refused face login shows the server\'s message and signs nobody in', async () => {
  (global.fetch as jest.Mock).mockImplementation((url: string) => (url.endsWith('/login/options')
    ? json({ options: {}, challengeToken: 't' })
    : json({ error: 'Face login did not match an Aivorah account on this device.' }, false)));
  await expect(signInWithFace()).rejects.toThrow('Face login did not match an Aivorah account on this device.');
  expect(signInWithCustomToken).not.toHaveBeenCalled();
});

test('adding face login is a signed-in request and names the device', async () => {
  await addFaceLogin();
  expect(webauthn.startRegistration).toHaveBeenCalledWith({ optionsJSON: { challenge: 'c2' } });
  const reg = calls().find((c) => c.url === `${AUTH_SERVER_URL}/user/passkeys/register`)!;
  expect(reg.init.headers.Authorization).toBe('Bearer id-token');
  expect(reg.body).toMatchObject({ response: { id: 'new-cred', type: 'public-key' }, challengeToken: 'tok-2' });
  expect(typeof reg.body.deviceLabel).toBe('string');
});

test('list and remove are signed-in requests', async () => {
  expect(await listFaceLogins()).toEqual([{ id: 'p1', deviceLabel: 'Windows · Chrome', createdAt: '2026-11-07', lastUsedAt: null }]);
  await removeFaceLogin('p1');
  const del = calls().find((c) => c.init?.method === 'DELETE')!;
  expect(del.url).toBe(`${AUTH_SERVER_URL}/user/passkeys/p1`);
  expect(del.init.headers.Authorization).toBe('Bearer id-token');
});

test('friendly messages and device names', () => {
  expect(faceLoginErrorMessage({ name: 'NotAllowedError' })).toMatch(/cancelled or timed out/);
  expect(faceLoginErrorMessage({ name: 'InvalidStateError' })).toMatch(/already set up on this device/);
  expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36')).toBe('Windows · Chrome');
  expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe('iPhone · Safari');
  expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('Windows · Edge');
});
