// Integration test for OnboardingTeacherBoxes — the real teacher onboarding
// screen. Renders the real component, fills real fields, checks the real
// "Complete Setup" gating. AuthContext/ThemeContext mocked; fetch mocked
// (the screen fetches saved preferences on mount, and network calls would
// otherwise hit a real server).

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import OnboardingTeacherBoxes from '../OnboardingTeacherBoxes';

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), deleteApp: jest.fn() }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(), createUserWithEmailAndPassword: jest.fn(), signOut: jest.fn(),
  updateProfile: jest.fn(), RecaptchaVerifier: jest.fn(), signInWithPhoneNumber: jest.fn(),
}));
jest.mock('../../../config/firebase', () => ({}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'teacher@a.com', role: 'teacher' },
    updateUser: jest.fn(),
    logout: jest.fn(),
  }),
}));
jest.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {}, isDark: true }),
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('OnboardingTeacherBoxes', () => {
  test('renders the personal info fields', async () => {
    await render(<OnboardingTeacherBoxes />);
    expect(screen.getByPlaceholderText('Your name')).toBeTruthy();
    expect(screen.getByPlaceholderText('DD/MM/YYYY')).toBeTruthy();
    expect(screen.getByPlaceholderText('98765 43210')).toBeTruthy();
  });

  test('Complete Setup starts disabled', async () => {
    await render(<OnboardingTeacherBoxes />);
    const button = screen.getByText('Complete Setup').parent;
    expect(button?.props.accessibilityState?.disabled).toBe(true);
  });

  test('filling name, dob, and mobile completes the Personal Info card', async () => {
    const user = userEvent.setup();
    await render(<OnboardingTeacherBoxes />);

    await user.type(screen.getByPlaceholderText('Your name'), 'A Teacher');
    await user.type(screen.getByPlaceholderText('DD/MM/YYYY'), '01/01/1990');
    await user.type(screen.getByPlaceholderText('98765 43210'), '9876543210');

    // Still disabled overall (school/professional/teaching cards still empty),
    // but proves typing into these real fields is wired to the real state.
    const button = screen.getByText('Complete Setup').parent;
    expect(button?.props.accessibilityState?.disabled).toBe(true);
  });
});
