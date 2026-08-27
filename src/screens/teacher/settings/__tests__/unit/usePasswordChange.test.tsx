import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { usePasswordChange } from '../../hooks/usePasswordChange';

const mockReauthenticateWithCredential = jest.fn();
const mockUpdatePassword = jest.fn();
jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn((email, pw) => ({ email, pw })) },
  reauthenticateWithCredential: (...args: any[]) => mockReauthenticateWithCredential(...args),
  updatePassword: (...args: any[]) => mockUpdatePassword(...args),
}));

jest.mock('../../../../../config/firebase', () => ({
  auth: { currentUser: { email: 'teacher@school.com' } },
}));

function Harness({ current = 'currentpw', next = 'newpassword123', confirm = 'newpassword123' }: { current?: string; next?: string; confirm?: string }) {
  const h = usePasswordChange();
  return (
    <View>
      <Text testID="saving">{String(h.saving)}</Text>
      <Text testID="error">{h.error}</Text>
      <TouchableOpacity testID="change" onPress={() => h.changePassword(current, next, confirm)}><Text>x</Text></TouchableOpacity>
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReauthenticateWithCredential.mockResolvedValue(undefined);
  mockUpdatePassword.mockResolvedValue(undefined);
});

describe('usePasswordChange', () => {
  test('a real blank current password is rejected locally', async () => {
    const user = userEvent.setup();
    await render(<Harness current="" />);
    await user.press(screen.getByTestId('change'));
    expect(screen.getByTestId('error').props.children).toBe('Enter your current password.');
    expect(mockReauthenticateWithCredential).not.toHaveBeenCalled();
  });

  test('a real too-short new password is rejected locally', async () => {
    const user = userEvent.setup();
    await render(<Harness next="abc" confirm="abc" />);
    await user.press(screen.getByTestId('change'));
    expect(screen.getByTestId('error').props.children).toBe('New password must be at least 6 characters.');
  });

  test('a real mismatched confirmation is rejected locally', async () => {
    const user = userEvent.setup();
    await render(<Harness next="password1" confirm="password2" />);
    await user.press(screen.getByTestId('change'));
    expect(screen.getByTestId('error').props.children).toBe('Passwords do not match.');
  });

  test('a real password with stray whitespace still matches after stripping (#154)', async () => {
    const user = userEvent.setup();
    await render(<Harness current=" current pw " next=" new password 123 " confirm="newpassword123" />);
    await user.press(screen.getByTestId('change'));
    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalled());
    expect(mockReauthenticateWithCredential).toHaveBeenCalled();
  });

  test('a real successful change reauthenticates then updates the password', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('change'));
    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalledWith({ email: 'teacher@school.com' }, 'newpassword123'));
  });

  test('a real wrong current password surfaces the real Firebase error message', async () => {
    mockReauthenticateWithCredential.mockRejectedValue(new Error('The password is invalid.'));
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('change'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('The password is invalid.'));
  });
});
