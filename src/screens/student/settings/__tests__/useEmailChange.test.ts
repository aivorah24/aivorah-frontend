import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEmailChange } from '../hooks/useEmailChange';
import AUTH_SERVER_URL from '../../../../config/authServerUrl';
import SERVER_URL from '../../../../config/serverUrl';

const mockSignInWithPopup = jest.fn();
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn(() => 'cred') },
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({ setCustomParameters: jest.fn() })),
  reauthenticateWithCredential: jest.fn(async () => {}),
  reauthenticateWithPopup: jest.fn(async () => {}),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
}));
jest.mock('../../../../config/firebase', () => ({ auth: { currentUser: { email: 'old@gmail.com' } } }));

const ok = (body: unknown = {}) => ({ ok: true, json: async () => body });
const notFound = () => ({ ok: false, json: async () => ({}) });

const closeModal = jest.fn();
const logout = jest.fn();
let h: () => ReturnType<typeof useEmailChange>;

async function setup(google: boolean) {
  const { result } = await renderHook(() => useEmailChange({ email: 'old@gmail.com', name: 'Asha' }, google, !google, closeModal, logout));
  h = () => result.current;
}

beforeEach(() => {
  jest.clearAllMocks();
});

const urls = () => (global.fetch as jest.Mock).mock.calls.map(([u]) => u as string);

test('Google account switch is sent to the auth service, then signs out', async () => {
  mockSignInWithPopup.mockResolvedValue({ user: { email: 'new@gmail.com', getIdToken: async () => 'id-tok' } });
  global.fetch = jest.fn().mockResolvedValue(ok({ newEmail: 'new@gmail.com' })) as any;
  await setup(true);

  await act(async () => { await h().handleSwitchGoogleAccount(); });

  expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/change-email-google`, expect.objectContaining({
    method: 'POST', body: JSON.stringify({ currentEmail: 'old@gmail.com', idToken: 'id-tok' }),
  }));
  expect(urls().some((u) => u.startsWith(`${SERVER_URL}/`))).toBe(false);
  expect(closeModal).toHaveBeenCalled();
  await waitFor(() => expect(logout).toHaveBeenCalled());
});

test('picking the same Google account is refused without calling the server', async () => {
  mockSignInWithPopup.mockResolvedValue({ user: { email: 'old@gmail.com', getIdToken: async () => 'id-tok' } });
  global.fetch = jest.fn() as any;
  await setup(true);

  await act(async () => { await h().handleSwitchGoogleAccount(); });

  expect(global.fetch).not.toHaveBeenCalled();
  expect(h().emailError).toMatch(/same Google account/);
  expect(logout).not.toHaveBeenCalled();
});

test('password account: code and email change both go to the auth service', async () => {
  global.fetch = jest.fn((url: string) => Promise.resolve(url.includes('/user/role') ? notFound() : ok())) as any;
  await setup(false);

  await act(async () => { h().setNewEmail('new@gmail.com'); h().setEmailPassword('pw'); });
  await act(async () => { await h().handleSendEmailOtp(); });
  await waitFor(() => expect(h().emailStep).toBe('otp'));
  await act(async () => { h().setEmailOtp('123456'); });
  await act(async () => { await h().handleVerifyEmailOtp(); });

  expect(urls()).toEqual([
    `${AUTH_SERVER_URL}/user/role?email=new%40gmail.com`,
    `${AUTH_SERVER_URL}/user/email-otp/send`,
    `${AUTH_SERVER_URL}/user/change-email`,
  ]);
  await waitFor(() => expect(logout).toHaveBeenCalled());
});
