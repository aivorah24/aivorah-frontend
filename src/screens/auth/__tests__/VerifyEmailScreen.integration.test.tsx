// Integration tests for VerifyEmailScreen — the "check your inbox" screen
// shown right after signup. Renders the real screen, presses real buttons,
// checks real fetch calls and resulting messages. AuthContext/ThemeContext
// mocked; fetch mocked so no real network call.

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import VerifyEmailScreen from '../VerifyEmailScreen';

jest.mock('../../../config/firebase', () => ({ auth: {} }));

const mockUpdateUser = jest.fn();
const mockLogout = jest.fn();

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'a@a.com', name: 'A Student' },
    updateUser: mockUpdateUser,
    logout: mockLogout,
  }),
}));

jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {} }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('VerifyEmailScreen', () => {
  test('shows the real account email', async () => {
    await render(<VerifyEmailScreen />);
    expect(screen.getByText('a@a.com')).toBeTruthy();
  });

  test('"I\'ve Verified My Email" when the server confirms verified -> shows the success message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ verified: true }) });
    const user = userEvent.setup();
    await render(<VerifyEmailScreen />);

    await user.press(screen.getByText("I've Verified My Email"));

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/user/check-verified?email=a%40a.com'));
    expect(await screen.findByText('Email verified! Taking you in...')).toBeTruthy();
  });

  test('"I\'ve Verified My Email" when NOT yet verified -> shows the "check inbox" error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ verified: false }) });
    const user = userEvent.setup();
    await render(<VerifyEmailScreen />);

    await user.press(screen.getByText("I've Verified My Email"));

    expect(await screen.findByText('Email not yet verified. Please check your inbox and click the activation link.')).toBeTruthy();
  });

  test('Resend Email sends a new verification request and shows confirmation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    await render(<VerifyEmailScreen />);

    await user.press(screen.getByText('Resend Email'));

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/user/send-verification'),
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"email":"a@a.com"') })
    );
    expect(await screen.findByText('Verification email sent!')).toBeTruthy();
    // Cooldown starts immediately — button now shows a countdown and is disabled.
    expect(await screen.findByText(/Resend Email \(30s\)/)).toBeTruthy();
  });

  test('a failed resend shows an error message', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();
    await render(<VerifyEmailScreen />);

    await user.press(screen.getByText('Resend Email'));

    expect(await screen.findByText('Failed to resend. Please try again.')).toBeTruthy();
  });

  test('Sign out calls logout', async () => {
    const user = userEvent.setup();
    await render(<VerifyEmailScreen />);
    await user.press(screen.getByText('Sign out'));
    expect(mockLogout).toHaveBeenCalled();
  });
});
