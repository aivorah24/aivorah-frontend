import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ChangeEmailModal from '../../components/ChangeEmailModal';
import { useEmailChange } from '../../hooks/useEmailChange';
import AUTH_SERVER_URL from '../../../../../config/authServerUrl';

const mockPick = jest.fn();
const mockMainSignIn = jest.fn();
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn(() => 'cred') },
  reauthenticateWithCredential: jest.fn(async () => {}),
  signInWithPopup: (...a: unknown[]) => mockMainSignIn(...a),
}));
jest.mock('../../services/googlePicker', () => ({ pickGoogleAccount: (...a: unknown[]) => mockPick(...a) }));
jest.mock('../../../../../config/firebase', () => ({ auth: { currentUser: { email: 'old@gmail.com' } } }));

const colors: any = { textDim: '#999', textMuted: '#888', accentRed: 'red', accentYellow: 'gold' };
const styles: any = {};

function Harness({ isGoogleUser = false, onClose = jest.fn(), onSignOut = jest.fn() }: any) {
  const emailChange = useEmailChange({ email: 'old@gmail.com', name: 'Asha', isGoogleUser });
  return <ChangeEmailModal visible onClose={onClose} onSignOut={onSignOut} userEmail="old@gmail.com" emailChange={emailChange} styles={styles} colors={colors} />;
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn((url: string) => Promise.resolve(url.includes('/user/role')
    ? { ok: false, json: async () => ({}) }
    : { ok: true, json: async () => ({ newEmail: 'new@gmail.com' }) })) as any;
});

test('password account: email + password → code → done → Sign in again signs out', async () => {
  const onSignOut = jest.fn();
  await render(<Harness onSignOut={onSignOut} />);
  await fireEvent.changeText(screen.getByTestId('settings-modal-email-new-input'), 'new@gmail.com');
  await fireEvent.changeText(screen.getByTestId('settings-modal-email-password-input'), 'pw');
  await fireEvent.press(screen.getByText('Send Verification Code'));
  await screen.findByTestId('settings-modal-email-otp-input');

  await fireEvent.changeText(screen.getByTestId('settings-modal-email-otp-input'), '123456');
  await fireEvent.press(screen.getByText('Verify & Update Email'));
  expect(await screen.findByTestId('settings-modal-email-done-message')).toHaveTextContent(/changed to new@gmail\.com/);
  expect(screen.getByText('Email Updated')).toBeTruthy();

  await fireEvent.press(screen.getByText('Sign in again'));
  expect(onSignOut).toHaveBeenCalled();
  expect((global.fetch as jest.Mock).mock.calls.every(([u]) => u.startsWith(AUTH_SERVER_URL))).toBe(true);
});

test('validation errors show in the window', async () => {
  await render(<Harness />);
  await fireEvent.press(screen.getByText('Send Verification Code'));
  expect(await screen.findByTestId('settings-modal-email-error')).toHaveTextContent('Please enter your new email.');
});

test('Google account: only the Switch Google Account option; closing after success signs out', async () => {
  mockPick.mockResolvedValue({ email: 'new@gmail.com', idToken: 'tok' });
  const onSignOut = jest.fn();
  const onClose = jest.fn();
  await render(<Harness isGoogleUser onSignOut={onSignOut} onClose={onClose} />);
  expect(screen.queryByTestId('settings-modal-email-new-input')).toBeNull();

  await fireEvent.press(screen.getByText('Switch Google Account'));
  await waitFor(() => expect(screen.getByTestId('settings-modal-email-done-message')).toHaveTextContent(/linked to new@gmail\.com/));
  await fireEvent.press(screen.getByTestId('settings-modal-email-close-button'));
  expect(onSignOut).toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});
