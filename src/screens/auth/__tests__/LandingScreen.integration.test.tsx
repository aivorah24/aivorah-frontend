// Integration tests for LandingScreen — render the real screen, open the
// real Login/Signup modals, type into the real inputs, press the real
// buttons. AuthContext and ThemeContext are mocked (no real Firebase/network
// call), matching the auth-service backend tests' scope: login + signup only.

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import LandingScreen from '../LandingScreen';
import type { UserRole } from '../../../context/AuthContext';

// Typed against AuthContext's real function signatures — matches every
// other test file in this repo, which relies on the ambient global `jest`
// (from @types/jest) rather than importing from '@jest/globals' (not a
// direct dependency here, and shadowing the ambient global breaks its types).
//
// @types/jest 29.5.14 (the version installed here) uses the older
// jest.fn<ReturnType, ArgsTuple, ThisContext> generic form — NOT the newer
// jest.fn<(...args) => ReturnType>() single-function-type form from Jest 30.
const mockSignInWithEmail = jest.fn<Promise<void>, [email: string, password: string]>();
const mockSignUpWithEmail = jest.fn<
  Promise<void>,
  [name: string, email: string, password: string, role: UserRole, curriculum?: string]
>();
const mockSignInWithGoogle = jest.fn<Promise<void>, [role?: UserRole]>();
const mockClearAuthError = jest.fn<void, []>();

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    signInWithEmail: mockSignInWithEmail,
    signUpWithEmail: mockSignUpWithEmail,
    signInWithGoogle: mockSignInWithGoogle,
    demoLogin: jest.fn(),
    addParentRoleToTeacher: jest.fn(),
    addParentRoleToTeacherSSO: jest.fn(),
    authError: null,
    clearAuthError: mockClearAuthError,
    logout: jest.fn(),
  }),
}));

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, isDark: true }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Login', () => {
  test('opens the login modal from the landing page', async () => {
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));
    expect(await screen.findByPlaceholderText('you@example.com')).toBeTruthy();
  });

  test('submitting with empty fields shows a validation error, never calls signIn', async () => {
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));
    await screen.findByPlaceholderText('you@example.com');

    await user.press(screen.getByText('Sign In'));

    expect(await screen.findByText('Please fill in all fields.')).toBeTruthy();
    expect(mockSignInWithEmail).not.toHaveBeenCalled();
  });

  test('valid credentials call signInWithEmail with the trimmed values', async () => {
    mockSignInWithEmail.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));

    await user.type(await screen.findByPlaceholderText('you@example.com'), 'a@a.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret1');
    await user.press(screen.getByText('Sign In'));

    expect(mockSignInWithEmail).toHaveBeenCalledWith('a@a.com', 'secret1');
  });

  test('a rejected sign-in shows the server error message', async () => {
    mockSignInWithEmail.mockRejectedValueOnce(new Error('Invalid email or password.'));
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));

    await user.type(await screen.findByPlaceholderText('you@example.com'), 'a@a.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await user.press(screen.getByText('Sign In'));

    expect(await screen.findByText('Invalid email or password.')).toBeTruthy();
  });

  test('Sign in with Google calls signInWithGoogle', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));

    await user.press(await screen.findByText('Sign in with Google'));

    expect(mockSignInWithGoogle).toHaveBeenCalled();
  });

  test('a brand-new Google user is redirected to the Signup modal', async () => {
    mockSignInWithGoogle.mockRejectedValueOnce(new Error('NEW_GOOGLE_USER:a@a.com'));
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));

    await user.press(await screen.findByText('Sign in with Google'));

    // Signup modal's own field, proves we switched screens.
    expect(await screen.findByPlaceholderText('Jane Smith')).toBeTruthy();
  });

  test('a Google sign-in error shows the message', async () => {
    mockSignInWithGoogle.mockRejectedValueOnce(new Error('Network error, please try again.'));
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));

    await user.press(await screen.findByText('Sign in with Google'));

    expect(await screen.findByText('Network error, please try again.')).toBeTruthy();
  });
});

describe('Forgot password', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('opens from the login modal', async () => {
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));
    await user.press(await screen.findByText('Forgot password?'));

    expect(await screen.findByText('Reset your password')).toBeTruthy();
  });

  test('submitting with an email sends the reset request and shows a confirmation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));
    await user.press(await screen.findByText('Forgot password?'));

    await user.type(await screen.findByPlaceholderText('you@example.com'), 'a@a.com');
    await user.press(screen.getByText('Send Reset Link'));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/user/send-password-reset'),
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"email":"a@a.com"') })
    );
    expect(await screen.findByText(/Reset link sent to a@a.com/)).toBeTruthy();
  });

  test('a failed request shows an alert-style error, not the success message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Login'));
    await user.press(await screen.findByText('Forgot password?'));

    await user.type(await screen.findByPlaceholderText('you@example.com'), 'a@a.com');
    await user.press(screen.getByText('Send Reset Link'));

    await new Promise((r) => setTimeout(r, 0)); // let the rejected fetch settle
    expect(alertSpy).toHaveBeenCalledWith('Error', expect.stringContaining('Could not send reset email'));
    expect(screen.queryByText(/Reset link sent/)).toBeNull();
    alertSpy.mockRestore();
  });
});

describe('Signup', () => {
  test('opens the signup modal from the landing page', async () => {
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Join Early Access'));
    expect(await screen.findByPlaceholderText('Jane Smith')).toBeTruthy();
  });

  test('submitting with no name shows the name validation error, never calls signUp', async () => {
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Join Early Access'));
    await screen.findByPlaceholderText('Jane Smith');

    await user.press(screen.getByText('Create Free Account'));

    expect(await screen.findByText('Please enter your full name.')).toBeTruthy();
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  test('malformed email shows the email format error', async () => {
    const user = userEvent.setup();
    await render(<LandingScreen />);
    await user.press(screen.getByText('Join Early Access'));

    await user.type(await screen.findByPlaceholderText('Jane Smith'), 'A Student');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'not-an-email');
    await user.press(screen.getByText('Create Free Account'));

    expect(await screen.findByText('Please enter a valid email format.')).toBeTruthy();
  });
});
