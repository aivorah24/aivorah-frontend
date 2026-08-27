import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useDeleteAccount } from '../../hooks/useDeleteAccount';

const mockReauthenticateWithCredential = jest.fn();
const mockReauthenticateWithPopup = jest.fn();
const mockDeleteUser = jest.fn();
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn((email, pw) => ({ email, pw })) },
  GoogleAuthProvider: jest.fn(),
  reauthenticateWithCredential: (...args: any[]) => mockReauthenticateWithCredential(...args),
  reauthenticateWithPopup: (...args: any[]) => mockReauthenticateWithPopup(...args),
  deleteUser: (...args: any[]) => mockDeleteUser(...args),
}));

jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { email: 'teacher@school.com' } },
}));

const mockDeleteAccountApi = jest.fn();
jest.mock('../../services/settingsService', () => ({
  deleteAccount: (...args: any[]) => mockDeleteAccountApi(...args),
}));

const mockLogout = jest.fn();

function Harness({ isPasswordUser = true, isGoogleUser = false, password = 'realpassword' }: { isPasswordUser?: boolean; isGoogleUser?: boolean; password?: string }) {
  const h = useDeleteAccount(isPasswordUser, isGoogleUser, mockLogout);
  return (
    <View>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{h.error}</Text>
      <TouchableOpacity testID="confirm" onPress={() => h.confirmDelete(password)}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReauthenticateWithCredential.mockResolvedValue(undefined);
  mockReauthenticateWithPopup.mockResolvedValue(undefined);
  mockDeleteAccountApi.mockResolvedValue({ ok: true });
  mockDeleteUser.mockResolvedValue(undefined);
});

describe('useDeleteAccount — password user', () => {
  test('a real blank password is rejected locally, never calls the API', async () => {
    const user = userEvent.setup();
    await render(<Harness password="" />);
    await user.press(screen.getByTestId('confirm'));
    expect(screen.getByTestId('error').props.children).toBe('Please enter your password to confirm.');
    expect(mockDeleteAccountApi).not.toHaveBeenCalled();
  });

  test('a real successful deletion reauthenticates, calls the API, deletes the Firebase user, then logs out', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('confirm'));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockReauthenticateWithCredential).toHaveBeenCalled();
    expect(mockDeleteAccountApi).toHaveBeenCalledWith('teacher@school.com');
    expect(mockDeleteUser).toHaveBeenCalled();
  });

  test('a Firebase user already gone server-side is a non-fatal no-op, deletion still succeeds', async () => {
    mockDeleteUser.mockRejectedValue(new Error('user already deleted'));
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('confirm'));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  test('a real wrong password surfaces a friendly error, never logs out', async () => {
    mockReauthenticateWithCredential.mockRejectedValue({ code: 'auth/wrong-password' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('confirm'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Incorrect password. Please try again.'));
    expect(mockLogout).not.toHaveBeenCalled();
  });
});

describe('useDeleteAccount — Google-SSO user', () => {
  test('confirms via a real Google popup, not a password field', async () => {
    const user = userEvent.setup();
    await render(<Harness isPasswordUser={false} isGoogleUser password="" />);
    await user.press(screen.getByTestId('confirm'));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(mockReauthenticateWithPopup).toHaveBeenCalled();
    expect(mockReauthenticateWithCredential).not.toHaveBeenCalled();
  });

  test('a real cancelled Google popup surfaces a friendly error', async () => {
    mockReauthenticateWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    const user = userEvent.setup();
    await render(<Harness isPasswordUser={false} isGoogleUser password="" />);
    await user.press(screen.getByTestId('confirm'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Google confirmation was cancelled. Please try again.'));
  });
});
