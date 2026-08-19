import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useEmailChange } from '../useEmailChange';

jest.setTimeout(15000);

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

let mockCurrentUser: any = { email: 'a@a.com' };
jest.mock('../../../../../config/firebase', () => ({
  auth: { get currentUser() { return mockCurrentUser; } },
}));

const mockReauthenticateWithCredential = jest.fn().mockResolvedValue(undefined);
const mockReauthenticateWithPopup = jest.fn().mockResolvedValue(undefined);
const mockSignInWithPopup = jest.fn();
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn((email, pw) => ({ email, pw })) },
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({ setCustomParameters: jest.fn() })),
  reauthenticateWithCredential: (...args: any[]) => mockReauthenticateWithCredential(...args),
  reauthenticateWithPopup: (...args: any[]) => mockReauthenticateWithPopup(...args),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const mockCloseModal = jest.fn();
const mockLogout = jest.fn();

function Harness({ isGoogleUser = false, isPasswordUser = true }: { isGoogleUser?: boolean; isPasswordUser?: boolean }) {
  const user = { email: 'a@a.com', name: 'A Student' };
  const h = useEmailChange(user, isGoogleUser, isPasswordUser, mockCloseModal, mockLogout);
  return (
    <>
      <Text testID="emailError">{h.emailError}</Text>
      <Text testID="emailStep">{h.emailStep}</Text>
      <Text testID="modalLoading">{String(h.modalLoading)}</Text>
      <TouchableOpacity testID="setEmailValid" onPress={() => h.setNewEmail('new@b.com')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setEmailInvalid" onPress={() => h.setNewEmail('not-an-email')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setEmailSame" onPress={() => h.setNewEmail('a@a.com')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setEmailEmpty" onPress={() => h.setNewEmail('')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setPassword" onPress={() => h.setEmailPassword('pw123')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setOtp" onPress={() => h.setEmailOtp('123456')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="sendOtp" onPress={() => h.handleSendEmailOtp()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="verifyOtp" onPress={() => h.handleVerifyEmailOtp()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="resendOtp" onPress={() => h.handleResendEmailOtp()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="switchGoogle" onPress={() => h.handleSwitchGoogleAccount()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = { email: 'a@a.com' };
  // /user/role "taken" check: not-ok (404) means the email is free.
  global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as any;
});

describe('useEmailChange — send OTP validation', () => {
  test('an empty new email sets a real validation error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailEmpty'));

    await user.press(screen.getByTestId('sendOtp'));

    expect(screen.getByTestId('emailError').props.children).toBe('Please enter your new email.');
  });

  test('a real malformed email sets a real format validation error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailInvalid'));

    await user.press(screen.getByTestId('sendOtp'));

    expect(screen.getByTestId('emailError').props.children).toBe('Please enter a valid email address.');
  });

  test('the real current email is rejected as "already your current email"', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailSame'));

    await user.press(screen.getByTestId('sendOtp'));

    expect(screen.getByTestId('emailError').props.children).toBe('That is already your current email.');
  });

  test('a real Google-SSO user is blocked up front with a real explanatory message', async () => {
    const user = userEvent.setup();
    await render(<Harness isGoogleUser={true} isPasswordUser={false} />);
    await user.press(screen.getByTestId('setEmailValid'));

    await user.press(screen.getByTestId('sendOtp'));

    expect(screen.getByTestId('emailError').props.children).toContain('signs in with Google');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a real password user with no password entered is asked for their password', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));

    await user.press(screen.getByTestId('sendOtp'));

    expect(screen.getByTestId('emailError').props.children).toBe('Please enter your current password.');
  });
});

describe('useEmailChange — send OTP happy/error paths', () => {
  test('a real email already taken by another account is rejected before any reauth popup', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any; // /user/role 200 = taken
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));
    await user.press(screen.getByTestId('setPassword'));

    await user.press(screen.getByTestId('sendOtp'));

    await waitFor(() => expect(screen.getByTestId('emailError').props.children).toBe('That email is already registered to another Aivorah account.'));
    expect(mockReauthenticateWithCredential).not.toHaveBeenCalled();
  });

  test('a real successful send moves to the real otp step after reauth', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/user/role')) return Promise.resolve({ ok: false, json: async () => ({}) });
      if (url.includes('/email-otp/send')) return jsonRes({});
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));
    await user.press(screen.getByTestId('setPassword'));

    await user.press(screen.getByTestId('sendOtp'));

    await waitFor(() => expect(screen.getByTestId('emailStep').props.children).toBe('otp'));
    expect(mockReauthenticateWithCredential).toHaveBeenCalled();
  });

  test('a real wrong-password reauth error maps to a real friendly message', async () => {
    mockReauthenticateWithCredential.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));
    await user.press(screen.getByTestId('setPassword'));

    await user.press(screen.getByTestId('sendOtp'));

    await waitFor(() => expect(screen.getByTestId('emailError').props.children).toBe('Incorrect password. Please try again.'));
  });

  test('a real server failure on send-otp surfaces the real server error message', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/user/role')) return Promise.resolve({ ok: false, json: async () => ({}) });
      if (url.includes('/email-otp/send')) return jsonRes({ error: 'Rate limited' }, false);
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));
    await user.press(screen.getByTestId('setPassword'));

    await user.press(screen.getByTestId('sendOtp'));

    await waitFor(() => expect(screen.getByTestId('emailError').props.children).toBe('Rate limited'));
  });
});

describe('useEmailChange — verify OTP', () => {
  test('an empty code sets a real validation error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('verifyOtp'));

    expect(screen.getByTestId('emailError').props.children).toBe('Please enter the code.');
  });

  test('a real successful verify closes the modal, alerts, and signs out shortly after', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false });
    global.fetch = jest.fn().mockResolvedValue(jsonRes({})) as any;
    const user = userEvent.setup({ delay: null as any });
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));
    await user.press(screen.getByTestId('setOtp'));

    await user.press(screen.getByTestId('verifyOtp'));

    await waitFor(() => expect(mockCloseModal).toHaveBeenCalled());
    expect(Alert.alert).toHaveBeenCalledWith('Email Updated', expect.stringContaining('new@b.com'));
    jest.advanceTimersByTime(200);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    jest.useRealTimers();
  });

  test('a real server verification failure surfaces the real error, no logout', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ error: 'Invalid code' }, false)) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setOtp'));

    await user.press(screen.getByTestId('verifyOtp'));

    await waitFor(() => expect(screen.getByTestId('emailError').props.children).toBe('Invalid code'));
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

describe('useEmailChange — resend OTP', () => {
  test('a real successful resend shows a real confirmation alert', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({})) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));

    await user.press(screen.getByTestId('resendOtp'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Code Resent', expect.stringContaining('new@b.com')));
  });
});

describe('useEmailChange — Google account switch', () => {
  test('a real successful switch closes, alerts, and signs out shortly after', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { email: 'newgoogle@b.com', getIdToken: async () => 'tok' } });
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ newEmail: 'newgoogle@b.com' })) as any;
    jest.useFakeTimers({ legacyFakeTimers: false });
    const user = userEvent.setup({ delay: null as any });
    await render(<Harness isGoogleUser={true} isPasswordUser={false} />);

    await user.press(screen.getByTestId('switchGoogle'));

    await waitFor(() => expect(mockCloseModal).toHaveBeenCalled());
    expect(Alert.alert).toHaveBeenCalledWith('Email Updated', expect.stringContaining('newgoogle@b.com'));
    jest.advanceTimersByTime(200);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    jest.useRealTimers();
  });

  test('picking the real SAME Google account is rejected', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { email: 'a@a.com', getIdToken: async () => 'tok' } });
    const user = userEvent.setup();
    await render(<Harness isGoogleUser={true} isPasswordUser={false} />);

    await user.press(screen.getByTestId('switchGoogle'));

    await waitFor(() => expect(screen.getByTestId('emailError').props.children).toContain('same Google account'));
    expect(mockLogout).not.toHaveBeenCalled();
  });

  test('a real cancelled Google popup maps to a real friendly message', async () => {
    mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    const user = userEvent.setup();
    await render(<Harness isGoogleUser={true} isPasswordUser={false} />);

    await user.press(screen.getByTestId('switchGoogle'));

    await waitFor(() => expect(screen.getByTestId('emailError').props.children).toBe('Google selection was cancelled. Please try again.'));
  });
});
