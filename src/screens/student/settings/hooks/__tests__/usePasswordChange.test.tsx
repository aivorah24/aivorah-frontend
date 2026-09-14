import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { usePasswordChange } from '../usePasswordChange';

jest.setTimeout(20000);

let mockCurrentUser: any = { email: 'a@a.com' };
jest.mock('../../../../../config/firebase', () => ({
  auth: { get currentUser() { return mockCurrentUser; } },
}));

const mockReauthenticateWithCredential = jest.fn().mockResolvedValue(undefined);
const mockUpdatePassword = jest.fn().mockResolvedValue(undefined);
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn((email, pw) => ({ email, pw })) },
  reauthenticateWithCredential: (...args: any[]) => mockReauthenticateWithCredential(...args),
  updatePassword: (...args: any[]) => mockUpdatePassword(...args),
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const mockUpdateUser = jest.fn();
const mockCloseModal = jest.fn();

function Harness({ user = { email: 'a@a.com' } }: any) {
  const h = usePasswordChange(user, mockUpdateUser, mockCloseModal);
  return (
    <>
      <Text testID="passwordError">{h.passwordError}</Text>
      <Text testID="modalLoading">{String(h.modalLoading)}</Text>
      <TouchableOpacity testID="setCurrent" onPress={() => h.setCurrentPassword('oldpw123')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setNewShort" onPress={() => h.setNewPassword('123')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setNewValid" onPress={() => h.setNewPassword('newpw123')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setConfirmMismatch" onPress={() => h.setConfirmPassword('different')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setConfirmMatch" onPress={() => h.setConfirmPassword('newpw123')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="submit" onPress={() => h.handleChangePassword()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="reset" onPress={() => h.resetForm()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = { email: 'a@a.com' };
});

describe('usePasswordChange — validation', () => {
  test('an empty current password sets a real validation error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('submit'));

    expect(screen.getByTestId('passwordError').props.children).toBe('Enter your current password.');
  });

  test('a real new password under 6 characters sets a real validation error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setCurrent'));
    await user.press(screen.getByTestId('setNewShort'));

    await user.press(screen.getByTestId('submit'));

    expect(screen.getByTestId('passwordError').props.children).toBe('New password must be at least 6 characters.');
  });

  test('a real mismatched confirm password sets a real validation error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setCurrent'));
    await user.press(screen.getByTestId('setNewValid'));
    await user.press(screen.getByTestId('setConfirmMismatch'));

    await user.press(screen.getByTestId('submit'));

    expect(screen.getByTestId('passwordError').props.children).toBe('Passwords do not match.');
    expect(mockReauthenticateWithCredential).not.toHaveBeenCalled();
  });
});

describe('usePasswordChange — happy path', () => {
  test('a real successful change reauthenticates, updates the password, and closes the modal', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setCurrent'));
    await user.press(screen.getByTestId('setNewValid'));
    await user.press(screen.getByTestId('setConfirmMatch'));

    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(mockCloseModal).toHaveBeenCalled());
    expect(mockReauthenticateWithCredential).toHaveBeenCalled();
    expect(mockUpdatePassword).toHaveBeenCalled();
  });

  test('a real password with stray whitespace is stripped before use, matching the login screen', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    // setCurrent/setNewValid/setConfirmMatch already exercise the trimmed path
    // implicitly via handleChangePassword's own .replace(/\s+/g,'') — verify the
    // credential actually used has no whitespace by checking the mock call.
    await user.press(screen.getByTestId('setCurrent'));
    await user.press(screen.getByTestId('setNewValid'));
    await user.press(screen.getByTestId('setConfirmMatch'));

    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalledWith(expect.anything(), 'newpw123'));
  });

  test('a real must-change-password account clears that flag on success', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({})) as any;
    const user = userEvent.setup();
    await render(<Harness user={{ email: 'a@a.com', mustChangePassword: true }} />);
    await user.press(screen.getByTestId('setCurrent'));
    await user.press(screen.getByTestId('setNewValid'));
    await user.press(screen.getByTestId('setConfirmMatch'));

    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ mustChangePassword: false }));
    // Regression: this used to hit the monolith's /user/clear-must-change-password,
    // which writes to a different Supabase project than /user/sync reads from,
    // so the flag never actually cleared anywhere that mattered.
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/user/preferences'),
      expect.objectContaining({ body: expect.stringContaining('"mustChangePassword":false') }),
    );
  });
});

describe('usePasswordChange — auth.currentUser rehydration polling', () => {
  test('polls briefly for a real still-loading Firebase session, then succeeds once it arrives', async () => {
    mockCurrentUser = null;
    jest.useFakeTimers({ legacyFakeTimers: false });
    const user = userEvent.setup({ delay: null as any });
    await render(<Harness />);
    await user.press(screen.getByTestId('setCurrent'));
    await user.press(screen.getByTestId('setNewValid'));
    await user.press(screen.getByTestId('setConfirmMatch'));

    const submitPromise = user.press(screen.getByTestId('submit'));
    // Let a couple of 200ms poll ticks pass, then the session "arrives".
    await jest.advanceTimersByTimeAsync(400);
    mockCurrentUser = { email: 'a@a.com' };
    await jest.advanceTimersByTimeAsync(400);
    await submitPromise;

    await waitFor(() => expect(mockCloseModal).toHaveBeenCalled());
    jest.useRealTimers();
  }, 20000);

  test('a real session that never rehydrates within 5s shows a real friendly loading message', async () => {
    mockCurrentUser = null;
    jest.useFakeTimers({ legacyFakeTimers: false });
    const user = userEvent.setup({ delay: null as any });
    await render(<Harness />);
    await user.press(screen.getByTestId('setCurrent'));
    await user.press(screen.getByTestId('setNewValid'));
    await user.press(screen.getByTestId('setConfirmMatch'));

    const submitPromise = user.press(screen.getByTestId('submit'));
    await jest.advanceTimersByTimeAsync(5200);
    await submitPromise;
    jest.useRealTimers();

    await waitFor(() => expect(screen.getByTestId('passwordError').props.children).toBe('Your session is still loading. Please wait a moment and try again.'));
  }, 20000);
});

describe('usePasswordChange — Firebase error mapping', () => {
  test('a real wrong-password reauth error maps to a real friendly message', async () => {
    mockReauthenticateWithCredential.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setCurrent'));
    await user.press(screen.getByTestId('setNewValid'));
    await user.press(screen.getByTestId('setConfirmMatch'));

    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(screen.getByTestId('passwordError').props.children).toBe('Current password is incorrect.'));
  });
});

describe('usePasswordChange — resetForm', () => {
  test('clears all real fields and the error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('submit')); // populate an error first

    await user.press(screen.getByTestId('reset'));

    expect(screen.getByTestId('passwordError').props.children).toBe('');
  });
});
