import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import AdminLoginScreen from '../AdminLoginScreen';

jest.mock('../../../../config/firebase', () => ({ auth: {} }));
jest.mock('firebase/auth', () => ({ signInWithEmailAndPassword: jest.fn() }));
import { signInWithEmailAndPassword } from 'firebase/auth';

describe('AdminLoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows an error instead of calling Firebase when a field is empty', async () => {
    const user = userEvent.setup();
    await render(<AdminLoginScreen />);
    await user.press(screen.getByTestId('admin-login-submit'));
    expect(await screen.findByTestId('admin-login-error')).toBeTruthy();
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('signs in with the entered email and password', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({});
    const user = userEvent.setup();
    await render(<AdminLoginScreen />);
    await user.type(screen.getByTestId('admin-login-email'), 'admin@aivorah.test');
    await user.type(screen.getByTestId('admin-login-password'), 'secret123');
    await user.press(screen.getByTestId('admin-login-submit'));
    await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, 'admin@aivorah.test', 'secret123'));
  });

  it('shows a friendly message for a wrong password instead of the raw Firebase error', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({ code: 'auth/invalid-credential' });
    const user = userEvent.setup();
    await render(<AdminLoginScreen />);
    await user.type(screen.getByTestId('admin-login-email'), 'admin@aivorah.test');
    await user.type(screen.getByTestId('admin-login-password'), 'wrong');
    await user.press(screen.getByTestId('admin-login-submit'));
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
  });

  it('tells a blocked user to contact support', async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({ code: 'auth/user-disabled' });
    const user = userEvent.setup();
    await render(<AdminLoginScreen />);
    await user.type(screen.getByTestId('admin-login-email'), 'admin@aivorah.test');
    await user.type(screen.getByTestId('admin-login-password'), 'x');
    await user.press(screen.getByTestId('admin-login-submit'));
    expect(await screen.findByText(/suspended by an administrator.*aivorah24@gmail\.com/)).toBeTruthy();
  });
});
