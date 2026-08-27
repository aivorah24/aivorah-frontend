import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useEmailChange } from '../../hooks/useEmailChange';

const mockReauthenticateWithCredential = jest.fn();
const mockReauthenticateWithPopup = jest.fn();
const mockSignInWithPopup = jest.fn();
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn((email, pw) => ({ email, pw })) },
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({ setCustomParameters: jest.fn() })),
  reauthenticateWithCredential: (...args: any[]) => mockReauthenticateWithCredential(...args),
  reauthenticateWithPopup: (...args: any[]) => mockReauthenticateWithPopup(...args),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
}));

jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { email: 'old@a.com', getIdToken: jest.fn().mockResolvedValue('fake-token') } },
}));

const mockCheckEmailTaken = jest.fn();
const mockSendEmailOtp = jest.fn();
const mockChangeEmail = jest.fn();
const mockChangeEmailGoogle = jest.fn();
jest.mock('../../services/settingsService', () => ({
  checkEmailTaken: (...args: any[]) => mockCheckEmailTaken(...args),
  sendEmailOtp: (...args: any[]) => mockSendEmailOtp(...args),
  changeEmail: (...args: any[]) => mockChangeEmail(...args),
  changeEmailGoogle: (...args: any[]) => mockChangeEmailGoogle(...args),
}));

let lastResult: any;
function Harness({ isPasswordUser = true, isGoogleUser = false }: { isPasswordUser?: boolean; isGoogleUser?: boolean }) {
  const h = useEmailChange('old@a.com', 'Ms. Rao', isPasswordUser, isGoogleUser);
  React.useEffect(() => { lastResult = h; });
  return (
    <View>
      <Text testID="step">{h.step}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="loading">{String(h.loading)}</Text>
      <TouchableOpacity testID="sendOtp" onPress={() => h.sendOtp('new@a.com', 'currentpw')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="sendOtpBlank" onPress={() => h.sendOtp('', '')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="verifyOtp" onPress={() => h.verifyOtp('new@a.com', '123456')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="switchGoogle" onPress={() => h.switchGoogleAccount()}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckEmailTaken.mockResolvedValue(false);
  mockReauthenticateWithCredential.mockResolvedValue(undefined);
  mockReauthenticateWithPopup.mockResolvedValue(undefined);
  mockSendEmailOtp.mockResolvedValue({ ok: true });
  mockChangeEmail.mockResolvedValue({ ok: true, user: { email: 'new@a.com' } });
});

describe('useEmailChange — sendOtp', () => {
  test('a real blank email is rejected locally', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('sendOtpBlank'));
    expect(screen.getByTestId('error').props.children).toBe('Please enter your new email.');
    expect(mockCheckEmailTaken).not.toHaveBeenCalled();
  });

  test('a real email already taken by another account is refused', async () => {
    mockCheckEmailTaken.mockResolvedValue(true);
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('sendOtp'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('That email is already registered to another Aivorah account.'));
    expect(mockSendEmailOtp).not.toHaveBeenCalled();
  });

  test('a real password-account flow reauthenticates before sending the OTP', async () => {
    const user = userEvent.setup();
    await render(<Harness isPasswordUser />);
    await user.press(screen.getByTestId('sendOtp'));
    await waitFor(() => expect(screen.getByTestId('step').props.children).toBe('otp'));
    expect(mockReauthenticateWithCredential).toHaveBeenCalled();
    expect(mockSendEmailOtp).toHaveBeenCalledWith('new@a.com', 'Ms. Rao');
  });

  test('a real wrong password surfaces a friendly error', async () => {
    mockReauthenticateWithCredential.mockRejectedValue({ code: 'auth/wrong-password' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('sendOtp'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Incorrect password. Please try again.'));
  });
});

describe('useEmailChange — verifyOtp', () => {
  test('a real blank code is rejected locally', async () => {
    const Harness2 = () => {
      const h = useEmailChange('old@a.com', 'Ms. Rao', true, false);
      return <TouchableOpacity testID="v" onPress={() => h.verifyOtp('new@a.com', '')}><Text>{h.error}</Text></TouchableOpacity>;
    };
    const user = userEvent.setup();
    await render(<Harness2 />);
    await user.press(screen.getByTestId('v'));
    expect(mockChangeEmail).not.toHaveBeenCalled();
  });

  test('a real successful verify calls changeEmail with the trimmed/lowercased new address', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('verifyOtp'));
    await waitFor(() => expect(mockChangeEmail).toHaveBeenCalledWith('old@a.com', 'new@a.com', '123456'));
  });

  test('a real Google-SSO refusal from the server surfaces its error message', async () => {
    mockChangeEmail.mockResolvedValue({ error: 'This account signs in with Google...', code: 'GOOGLE_SSO_EMAIL_IMMUTABLE' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('verifyOtp'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('This account signs in with Google...'));
  });
});

describe('useEmailChange — switchGoogleAccount', () => {
  test('a real successful switch calls changeEmailGoogle with the fresh idToken', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { email: 'new@gmail.com', getIdToken: jest.fn().mockResolvedValue('fresh-token') } });
    mockChangeEmailGoogle.mockResolvedValue({ ok: true, newEmail: 'new@gmail.com' });
    const user = userEvent.setup();
    await render(<Harness isPasswordUser={false} isGoogleUser />);
    await user.press(screen.getByTestId('switchGoogle'));
    await waitFor(() => expect(mockChangeEmailGoogle).toHaveBeenCalledWith('old@a.com', 'fresh-token'));
  });

  test('picking the SAME Google account is refused locally, never calls the API', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { email: 'old@a.com', getIdToken: jest.fn() } });
    const user = userEvent.setup();
    await render(<Harness isPasswordUser={false} isGoogleUser />);
    await user.press(screen.getByTestId('switchGoogle'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('That is the same Google account you already use. Pick a different one.'));
    expect(mockChangeEmailGoogle).not.toHaveBeenCalled();
  });

  test('a real cancelled Google popup surfaces a friendly error', async () => {
    mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    const user = userEvent.setup();
    await render(<Harness isPasswordUser={false} isGoogleUser />);
    await user.press(screen.getByTestId('switchGoogle'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Google selection was cancelled. Please try again.'));
  });
});
