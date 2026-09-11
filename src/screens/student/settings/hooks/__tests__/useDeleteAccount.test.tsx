import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useDeleteAccount } from '../useDeleteAccount';
import AUTH_SERVER_URL from '../../../../../config/authServerUrl';

jest.setTimeout(15000);

let mockCurrentUser: any = { email: 'a@a.com' };
jest.mock('../../../../../config/firebase', () => ({
  auth: { get currentUser() { return mockCurrentUser; } },
}));

const mockReauthenticateWithCredential = jest.fn().mockResolvedValue(undefined);
const mockReauthenticateWithPopup = jest.fn().mockResolvedValue(undefined);
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn((email, pw) => ({ email, pw })) },
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
  reauthenticateWithCredential: (...args: any[]) => mockReauthenticateWithCredential(...args),
  reauthenticateWithPopup: (...args: any[]) => mockReauthenticateWithPopup(...args),
  deleteUser: (...args: any[]) => mockDeleteUser(...args),
}));

const mockLogout = jest.fn();

function Harness({ isPasswordUser = true, isGoogleUser = false }: { isPasswordUser?: boolean; isGoogleUser?: boolean }) {
  const h = useDeleteAccount(isPasswordUser, isGoogleUser, mockLogout);
  return (
    <>
      <Text testID="deleteError">{h.deleteError}</Text>
      <Text testID="deleteLoading">{String(h.deleteLoading)}</Text>
      <Text testID="modalVisible">{String(h.deleteModalVisible)}</Text>
      <TouchableOpacity testID="openModal" onPress={() => h.openDeleteModal()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setPassword" onPress={() => h.setDeletePassword('pw123')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="confirm" onPress={() => h.confirmDeleteAccount()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = { email: 'a@a.com' };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
});

describe('useDeleteAccount — openDeleteModal', () => {
  test('a real open clears any previous password/error and shows the modal', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('openModal'));

    expect(screen.getByTestId('modalVisible').props.children).toBe('true');
  });
});

describe('useDeleteAccount — password-user validation', () => {
  test('a real password user with no password entered is asked to confirm with one', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('confirm'));

    expect(screen.getByTestId('deleteError').props.children).toBe('Please enter your password to confirm.');
    expect(mockReauthenticateWithCredential).not.toHaveBeenCalled();
  });
});

describe('useDeleteAccount — happy path', () => {
  test('a real password user deletes via reauth + server call + best-effort client delete, then logs out', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setPassword'));

    await user.press(screen.getByTestId('confirm'));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockReauthenticateWithCredential).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/delete-account`, expect.objectContaining({ method: 'DELETE' }));
    expect(mockDeleteUser).toHaveBeenCalled();
  });

  test('a real Google-SSO user deletes via a real popup reauth, no password required', async () => {
    const user = userEvent.setup();
    await render(<Harness isPasswordUser={false} isGoogleUser={true} />);

    await user.press(screen.getByTestId('confirm'));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockReauthenticateWithPopup).toHaveBeenCalled();
    expect(mockReauthenticateWithCredential).not.toHaveBeenCalled();
  });

  test('a real client-side deleteUser failure (already deleted server-side) still completes and logs out', async () => {
    mockDeleteUser.mockRejectedValueOnce(new Error('already gone'));
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setPassword'));

    await user.press(screen.getByTestId('confirm'));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });
});

describe('useDeleteAccount — Firebase error mapping', () => {
  test('a real wrong-password reauth error maps to a real friendly message, no logout', async () => {
    mockReauthenticateWithCredential.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setPassword'));

    await user.press(screen.getByTestId('confirm'));

    await waitFor(() => expect(screen.getByTestId('deleteError').props.children).toBe('Incorrect password. Please try again.'));
    expect(mockLogout).not.toHaveBeenCalled();
  });

  test('a real cancelled Google popup maps to a real friendly message, no logout', async () => {
    mockReauthenticateWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    const user = userEvent.setup();
    await render(<Harness isPasswordUser={false} isGoogleUser={true} />);

    await user.press(screen.getByTestId('confirm'));

    await waitFor(() => expect(screen.getByTestId('deleteError').props.children).toBe('Google confirmation was cancelled. Please try again.'));
    expect(mockLogout).not.toHaveBeenCalled();
  });

  test('an unexpected real error maps to a real generic friendly message', async () => {
    mockReauthenticateWithCredential.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setPassword'));

    await user.press(screen.getByTestId('confirm'));

    await waitFor(() => expect(screen.getByTestId('deleteError').props.children).toBe('Could not delete account. Please try again.'));
  });
});
