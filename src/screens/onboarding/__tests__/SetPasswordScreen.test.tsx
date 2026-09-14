// Regression test for a real bug (Bug A investigation, 2026-09-14): setting
// a first-time password used to PATCH the monolith's
// /user/clear-must-change-password, which writes to a different Supabase
// project than aivorah-auth-service's /user/sync reads mustChangePassword
// from. So the flag never actually cleared server-side, even though Firebase
// itself DID get the new password. Any fresh session with no cached local
// profile (new device/browser, or an incognito window — the exact scenario a
// manual tester would use) got sent back to this screen on every future
// login, but by then the account's real Firebase password was the NEW one,
// not the "temporary" one this screen prompts for — a real login that could
// never succeed again. Fixed by calling aivorah-profile-service's existing
// /user/preferences PATCH endpoint instead, same project /user/sync reads.

import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import SetPasswordScreen from '../SetPasswordScreen';

jest.mock('../../../config/firebase', () => ({ auth: { currentUser: { email: 'kid@aivorah.student' } } }));

const mockReauthenticateWithCredential = jest.fn().mockResolvedValue(undefined);
const mockUpdatePassword = jest.fn().mockResolvedValue(undefined);
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn((email, pw) => ({ email, pw })) },
  reauthenticateWithCredential: (...args: any[]) => mockReauthenticateWithCredential(...args),
  updatePassword: (...args: any[]) => mockUpdatePassword(...args),
}));

const mockUpdateUser = jest.fn();
const mockLogout = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'kid@aivorah.student', name: 'New Kid', mustChangePassword: true },
    updateUser: mockUpdateUser,
    logout: mockLogout,
  }),
}));
jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, isDark: false }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('SetPasswordScreen — clearing mustChangePassword', () => {
  test('a real successful password change PATCHes aivorah-profile-service, not the monolith', async () => {
    const user = userEvent.setup();
    await render(<SetPasswordScreen />);

    await user.type(screen.getByPlaceholderText('Enter temporary password'), 'TempPw1$');
    await user.type(screen.getByPlaceholderText('Choose a new password'), 'MyNewPw123');
    await user.type(screen.getByPlaceholderText('Re-enter new password'), 'MyNewPw123');
    await user.press(screen.getByText('Set Password & Continue'));

    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalled());
    await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ mustChangePassword: false }));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/user/preferences'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"mustChangePassword":false'),
      }),
    );
    // The old, broken destination must never be called again.
    const calledUrls = (global.fetch as jest.Mock).mock.calls.map(c => String(c[0]));
    expect(calledUrls.some(u => u.includes('clear-must-change-password'))).toBe(false);
  });

  test('a wrong temporary password shows the real friendly error and does not clear the flag locally', async () => {
    mockReauthenticateWithCredential.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    const user = userEvent.setup();
    await render(<SetPasswordScreen />);

    await user.type(screen.getByPlaceholderText('Enter temporary password'), 'WrongTemp1');
    await user.type(screen.getByPlaceholderText('Choose a new password'), 'MyNewPw123');
    await user.type(screen.getByPlaceholderText('Re-enter new password'), 'MyNewPw123');
    await user.press(screen.getByText('Set Password & Continue'));

    await waitFor(() => {
      expect(screen.getByText(/Temporary password is incorrect/)).toBeTruthy();
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
