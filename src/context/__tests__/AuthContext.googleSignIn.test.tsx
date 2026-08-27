// Regression test for the Google SSO "name reverts to email/Google name"
// bug: a returning student who renamed themselves in onboarding, then
// signed out and back in with Google, saw their saved name replaced by
// Google's displayName (or the email's local-part) instead of the name
// they'd actually saved — because signInWithGoogle built `name` from
// Firebase alone, before `profile` (the saved DB record) was even fetched.

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default,
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), deleteApp: jest.fn() }));

const mockSignInWithPopup = jest.fn();
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()), // returns an unsubscribe fn, never fires
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  updateProfile: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
}));

jest.mock('../../config/firebase', () => ({ auth: {} }));
jest.mock('../ThemeContext', () => ({ useTheme: () => ({ setThemeMode: jest.fn() }) }));
jest.mock('../../utils/curriculumPrefetch', () => ({ prefetchStudentDashboard: jest.fn() }));

function TestConsumer({ role }: { role?: 'student' }) {
  const { user, signInWithGoogle } = useAuth();
  return (
    <>
      <Text testID="name">{user?.name ?? '(none)'}</Text>
      <TouchableOpacity testID="signin" onPress={() => signInWithGoogle(role).catch(() => {})}>
        <Text>Sign in</Text>
      </TouchableOpacity>
    </>
  );
}

function mockFetchByUrl(handlers: Record<string, any>) {
  (global.fetch as jest.Mock) = jest.fn((url: string) => {
    const key = Object.keys(handlers).find(k => url.includes(k));
    const body = key ? handlers[key] : {};
    return Promise.resolve({ ok: true, json: async () => body, text: async () => JSON.stringify(body) });
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // jest-expo's test env provides `window` but not `window.location` — several
  // AuthContext branches (isLocalDev, ?forceRole=) read it behind a `typeof
  // window !== 'undefined'` guard that this test env passes but then crashes on.
  (global as any).window = { location: { hostname: 'aivorah-frontend.vercel.app', search: '', origin: 'https://aivorah-frontend.vercel.app' } };
});

describe('signInWithGoogle — name resolution', () => {
  test('a REAL returning user with a saved DB name keeps that name, not Google\'s displayName', async () => {
    mockSignInWithPopup.mockResolvedValue({
      user: { displayName: 'Google Account Name', email: 'student@example.com', emailVerified: true },
    });
    mockFetchByUrl({
      '/user/sync': { id: 'u1', role: 'student', name: 'My Real Saved Name', onboardingComplete: true },
      '/user/preferences': { accountStatus: 'active' },
    });

    const user = userEvent.setup();
    await render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await user.press(screen.getByTestId('signin'));

    await waitFor(() => {
      expect(screen.getByTestId('name').props.children).toBe('My Real Saved Name');
    });
  });

  test('a REAL brand-new user (no saved name yet) falls back to Google\'s displayName', async () => {
    mockSignInWithPopup.mockResolvedValue({
      user: { displayName: 'Brand New Google Name', email: 'newstudent@example.com', emailVerified: true },
    });
    mockFetchByUrl({
      '/user/sync': { onboardingComplete: false }, // no id/role → treated as a genuinely new account
      '/user/preferences': {},
    });

    const user = userEvent.setup();
    await render(
      <AuthProvider>
        <TestConsumer role="student" />
      </AuthProvider>,
    );

    await user.press(screen.getByTestId('signin'));

    await waitFor(() => {
      expect(screen.getByTestId('name').props.children).toBe('Brand New Google Name');
    });
  });
});
