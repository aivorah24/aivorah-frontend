import { renderHook, act } from '@testing-library/react-native';
import { useEmailChange } from '../../hooks/useEmailChange';
import AUTH_SERVER_URL from '../../../../../config/authServerUrl';
import SERVER_URL from '../../../../../config/serverUrl';

const mockPick = jest.fn();
const mockMainSignIn = jest.fn();
const mockReauth = jest.fn(async (..._a: unknown[]) => {});
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn(() => 'cred') },
  reauthenticateWithCredential: (...a: unknown[]) => mockReauth(...a),
  signInWithPopup: (...a: unknown[]) => mockMainSignIn(...a),
}));
jest.mock('../../services/googlePicker', () => ({ pickGoogleAccount: (...a: unknown[]) => mockPick(...a) }));
jest.mock('../../../../../config/firebase', () => ({ auth: { currentUser: { email: 'old@gmail.com' } } }));

const ok = (body: unknown = {}) => ({ ok: true, json: async () => body });
const fail = (error?: string) => ({ ok: false, json: async () => (error ? { error } : {}) });
const urls = () => (global.fetch as jest.Mock).mock.calls.map(([u]) => u as string);

let h: () => ReturnType<typeof useEmailChange>;
async function setup(isGoogleUser = false) {
  const { result } = await renderHook(() => useEmailChange({ email: 'old@gmail.com', name: 'Asha', isGoogleUser }));
  h = () => result.current;
}
const fill = async (email: string, password = 'pw') => act(async () => { h().setNewEmail(email); h().setPassword(password); });
// /user/role is 404 when the email is free.
const freeEmailFetch = (overrides: Record<string, any> = {}) =>
  jest.fn((url: string) => Promise.resolve(
    Object.entries(overrides).find(([k]) => url.includes(k))?.[1] ?? (url.includes('/user/role') ? fail() : ok()),
  )) as any;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = freeEmailFetch();
});

describe('send code', () => {
  test.each([
    ['', 'pw', 'Please enter your new email.'],
    ['not-an-email', 'pw', 'Please enter a valid email address.'],
    ['OLD@gmail.com', 'pw', 'That is already your current email.'],
    ['new@gmail.com', '', 'Please enter your current password.'],
  ])('"%s" / "%s" -> %s (no request)', async (email, pw, msg) => {
    await setup();
    await fill(email, pw);
    await act(async () => { await h().sendOtp(); });
    expect(h().error).toBe(msg);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a Google account is pointed to "Switch Google Account"', async () => {
    await setup(true);
    await fill('new@gmail.com');
    await act(async () => { await h().sendOtp(); });
    expect(h().error).toMatch(/Switch Google Account/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('an email already in use is refused before asking for the password check', async () => {
    global.fetch = freeEmailFetch({ '/user/role': ok({ role: 'student' }) });
    await setup();
    await fill('taken@gmail.com');
    await act(async () => { await h().sendOtp(); });
    expect(h().error).toBe('That email is already registered to another Aivorah account.');
    expect(mockReauth).not.toHaveBeenCalled();
  });

  test('success re-checks the password, sends the code and moves to the code step', async () => {
    await setup();
    await fill('New@Gmail.com ');
    await act(async () => { await h().sendOtp(); });
    expect(mockReauth).toHaveBeenCalled();
    expect(h().step).toBe('otp');
    expect(global.fetch).toHaveBeenLastCalledWith(`${AUTH_SERVER_URL}/user/email-otp/send`, expect.objectContaining({
      body: JSON.stringify({ email: 'new@gmail.com', name: 'Asha' }),
    }));
  });

  test('a wrong password shows a friendly message', async () => {
    mockReauth.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/wrong-password' }));
    await setup();
    await fill('new@gmail.com');
    await act(async () => { await h().sendOtp(); });
    expect(h().error).toBe('Incorrect password. Please try again.');
    expect(h().step).toBe('form');
  });

  test('a server error is shown as is', async () => {
    global.fetch = freeEmailFetch({ '/email-otp/send': fail('Too many codes, try later') });
    await setup();
    await fill('new@gmail.com');
    await act(async () => { await h().sendOtp(); });
    expect(h().error).toBe('Too many codes, try later');
  });
});

describe('verify code', () => {
  async function atOtpStep() {
    await setup();
    await fill('new@gmail.com');
    await act(async () => { await h().sendOtp(); });
  }

  test('an empty code is refused', async () => {
    await atOtpStep();
    await act(async () => { await h().verifyOtp(); });
    expect(h().error).toBe('Please enter the code.');
  });

  test('success ends on the done step with a sign-in-again message', async () => {
    await atOtpStep();
    await act(async () => { h().setOtp('123456'); });
    await act(async () => { await h().verifyOtp(); });
    expect(global.fetch).toHaveBeenLastCalledWith(`${AUTH_SERVER_URL}/user/change-email`, expect.objectContaining({
      body: JSON.stringify({ currentEmail: 'old@gmail.com', newEmail: 'new@gmail.com', otp: '123456' }),
    }));
    expect(h().step).toBe('done');
    expect(h().doneMessage).toMatch(/changed to new@gmail\.com.*sign in again/);
  });

  test('a server error keeps the code step', async () => {
    await atOtpStep();
    global.fetch = freeEmailFetch({ '/user/change-email': fail('Invalid or expired code') });
    await act(async () => { h().setOtp('000000'); });
    await act(async () => { await h().verifyOtp(); });
    expect(h().error).toBe('Invalid or expired code');
    expect(h().step).toBe('otp');
  });

  test('resend shows a confirmation; back returns to the form', async () => {
    await atOtpStep();
    await act(async () => { await h().resendOtp(); });
    expect(h().info).toBe('A new code was sent to new@gmail.com.');
    await act(async () => { h().backToForm(); });
    expect(h().step).toBe('form');
  });
});

describe('switch Google account', () => {
  const picked = (email: string) => ({ email, idToken: 'id-tok' });

  test('success moves the account and ends on the done step', async () => {
    mockPick.mockResolvedValue(picked('new@gmail.com'));
    global.fetch = freeEmailFetch({ '/change-email-google': ok({ newEmail: 'new@gmail.com' }) });
    await setup(true);
    await act(async () => { await h().switchGoogleAccount(); });
    expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/change-email-google`, expect.objectContaining({
      body: JSON.stringify({ currentEmail: 'old@gmail.com', idToken: 'id-tok' }),
    }));
    expect(h().step).toBe('done');
    expect(h().doneMessage).toMatch(/linked to new@gmail\.com/);
    expect(mockMainSignIn).not.toHaveBeenCalled();
  });

  test('a Google account that already has an Aivorah account (e.g. a parent) is refused and nothing moves', async () => {
    mockPick.mockResolvedValue(picked('parent@gmail.com'));
    global.fetch = freeEmailFetch({ '/user/role': ok({ role: 'parent' }) });
    await setup(true);
    await act(async () => { await h().switchGoogleAccount(); });
    expect(h().error).toBe("parent@gmail.com is already registered with another Aivorah account. Pick a Google account that isn't used on Aivorah.");
    expect(h().step).toBe('form');
    expect(urls().some((u) => u.includes('/change-email-google'))).toBe(false);
    expect(mockMainSignIn).not.toHaveBeenCalled();
  });

  test('picking the same Google account is refused without a request', async () => {
    mockPick.mockResolvedValue(picked('old@gmail.com'));
    await setup(true);
    await act(async () => { await h().switchGoogleAccount(); });
    expect(h().error).toMatch(/same Google account/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a Google account without an email is refused', async () => {
    mockPick.mockResolvedValue(picked(''));
    await setup(true);
    await act(async () => { await h().switchGoogleAccount(); });
    expect(h().error).toBe('That Google account has no email address.');
  });

  test('a closed popup shows a friendly message', async () => {
    mockPick.mockRejectedValue(Object.assign(new Error('x'), { code: 'auth/popup-closed-by-user' }));
    await setup(true);
    await act(async () => { await h().switchGoogleAccount(); });
    expect(h().error).toBe('Google selection was cancelled. Please try again.');
  });
});

test('every request goes to the auth service, never the monolith', async () => {
  mockPick.mockResolvedValue({ email: 'g@gmail.com', idToken: 't' });
  await setup();
  await fill('new@gmail.com');
  await act(async () => { await h().sendOtp(); });
  await act(async () => { h().setOtp('123456'); });
  await act(async () => { await h().resendOtp(); });
  await act(async () => { await h().verifyOtp(); });
  await act(async () => { await h().switchGoogleAccount(); });
  expect(urls().length).toBeGreaterThanOrEqual(5);
  expect(urls().every((u) => u.startsWith(`${AUTH_SERVER_URL}/`))).toBe(true);
  expect(urls().some((u) => u.startsWith(`${SERVER_URL}/`))).toBe(false);
});

test('reset clears everything', async () => {
  await setup();
  await fill('new@gmail.com');
  await act(async () => { h().reset(); });
  expect([h().newEmail, h().password, h().step, h().error]).toEqual(['', '', 'form', '']);
});
