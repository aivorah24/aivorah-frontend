import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useRecoveryEmail } from '../useRecoveryEmail';

jest.setTimeout(15000);

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const mockCloseModal = jest.fn();

function Harness({ userEmail = 'a@a.com' }: { userEmail?: string }) {
  const h = useRecoveryEmail(userEmail, mockCloseModal);
  return (
    <>
      <Text testID="recoveryError">{h.recoveryError}</Text>
      <Text testID="recoveryStep">{h.recoveryStep}</Text>
      <Text testID="recoverySaved">{h.recoverySaved}</Text>
      <Text testID="recoverySending">{String(h.recoverySending)}</Text>
      <Text testID="modalLoading">{String(h.modalLoading)}</Text>
      <TouchableOpacity testID="setEmailEmpty" onPress={() => h.setRecoveryEmail('')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setEmailInvalid" onPress={() => h.setRecoveryEmail('not-an-email')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setEmailValid" onPress={() => h.setRecoveryEmail('backup@b.com')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setOtpEmpty" onPress={() => h.setRecoveryOtp('')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setOtpValid" onPress={() => h.setRecoveryOtp('123456')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="sendCode" onPress={() => h.handleSendRecoveryCode()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="verifyOtp" onPress={() => h.handleVerifyRecoveryOtp()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="reset" onPress={() => h.resetForm()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue(jsonRes({})) as any;
});

describe('useRecoveryEmail — send code validation', () => {
  test('an empty recovery email sets a real validation error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailEmpty'));

    await user.press(screen.getByTestId('sendCode'));

    expect(screen.getByTestId('recoveryError').props.children).toBe('Please enter a recovery email.');
  });

  test('a real malformed email sets a real format validation error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailInvalid'));

    await user.press(screen.getByTestId('sendCode'));

    expect(screen.getByTestId('recoveryError').props.children).toBe('Please enter a valid email address.');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useRecoveryEmail — send code', () => {
  test('a real successful send moves to the real otp step', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));

    await user.press(screen.getByTestId('sendCode'));

    await waitFor(() => expect(screen.getByTestId('recoveryStep').props.children).toBe('otp'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/recovery-email/send-code'), expect.objectContaining({
      body: JSON.stringify({ email: 'a@a.com', recoveryEmail: 'backup@b.com' }),
    }));
  });

  test('a real server failure surfaces the real server error message', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ error: 'Already in use' }, false)) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));

    await user.press(screen.getByTestId('sendCode'));

    await waitFor(() => expect(screen.getByTestId('recoveryError').props.children).toBe('Already in use'));
  });

  test('a real network failure shows a real friendly error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));

    await user.press(screen.getByTestId('sendCode'));

    await waitFor(() => expect(screen.getByTestId('recoveryError').props.children).toBe('Network error. Please try again.'));
  });
});

describe('useRecoveryEmail — verify OTP', () => {
  test('an empty code sets a real validation error', async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('verifyOtp'));

    expect(screen.getByTestId('recoveryError').props.children).toBe('Please enter the verification code.');
  });

  test('a real successful verify closes the modal and saves the real recovery email', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ recoveryEmail: 'backup@b.com' })) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));
    await user.press(screen.getByTestId('setOtpValid'));

    await user.press(screen.getByTestId('verifyOtp'));

    await waitFor(() => expect(mockCloseModal).toHaveBeenCalled());
    expect(screen.getByTestId('recoverySaved').props.children).toBe('backup@b.com');
  });

  test('a real server verification failure surfaces the real error, no close', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ error: 'Invalid code' }, false)) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setOtpValid'));

    await user.press(screen.getByTestId('verifyOtp'));

    await waitFor(() => expect(screen.getByTestId('recoveryError').props.children).toBe('Invalid code'));
    expect(mockCloseModal).not.toHaveBeenCalled();
  });
});

describe('useRecoveryEmail — resetForm', () => {
  test('clears all real fields back to the initial state', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setEmailValid'));
    await user.press(screen.getByTestId('setOtpValid'));

    await user.press(screen.getByTestId('reset'));

    expect(screen.getByTestId('recoveryStep').props.children).toBe('email');
  });
});
