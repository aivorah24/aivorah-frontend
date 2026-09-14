// Regression test for: a student account created via Teacher "Create New
// Student" or Parent "My Kids" (both write to aivorah-students-service,
// which lives on the Supabase "Test" project) immediately signs the user
// back out on login.
//
// Root cause: AuthContext's "deleted / non-existent account" guard (the
// block right after "Load saved local profile + fetch Supabase profile" in
// the onAuthStateChanged listener) treats an account as genuinely deleted
// when /user/sync (aivorah-auth-service) reports no row for the email, even
// after 3 retries. aivorah-auth-service and aivorah-profile-service are
// pointed at the Supabase "Dev" project, a DIFFERENT project than
// aivorah-students-service's "Test" project where the account was actually
// created — so the row can never be found there, no matter how many times
// it retries, and a perfectly real, freshly-created account gets treated as
// deleted and signed straight back out. This is a config/environment bug
// (the two services must agree on one Supabase project), not a logic bug in
// this guard itself — the guard is doing exactly what it's supposed to do
// given what /user/sync tells it.
//
// This test pins the OBSERVABLE symptom (repro at the AuthContext level,
// independent of which two services disagree) so it fails again if the
// environment drifts apart, without needing to spin up real services.

import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default,
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), deleteApp: jest.fn() }));

let authStateCallback: ((user: any) => void) | null = null;
const mockSignOut = jest.fn().mockResolvedValue(undefined);
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth: any, cb: any) => { authStateCallback = cb; return jest.fn(); }),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: (...args: any[]) => mockSignOut(...args),
  updateProfile: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
  signInWithPopup: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({ auth: {} }));
jest.mock('../ThemeContext', () => ({ useTheme: () => ({ setThemeMode: jest.fn() }) }));
jest.mock('../../utils/curriculumPrefetch', () => ({ prefetchStudentDashboard: jest.fn() }));

function TestConsumer() {
  const { user, loading } = useAuth();
  return (
    <>
      <Text testID="state">{loading ? 'loading' : user ? 'signed-in' : 'signed-out'}</Text>
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
  authStateCallback = null;
  (global as any).window = { location: { hostname: 'aivorah-frontend.vercel.app', search: '', origin: 'https://aivorah-frontend.vercel.app' } };
});

describe('AuthContext — account created in a different Supabase project than login reads from', () => {
  test(
    'a real, freshly-created student (auto-generated @aivorah.student email) is wrongly signed out ' +
    'when /user/sync never finds the row (simulates aivorah-students-service vs aivorah-auth-service project mismatch)',
    async () => {
      // /user/sync (aivorah-auth-service) and /user/preferences (aivorah-profile-service)
      // both report "no such account" on every call — exactly what happens when the
      // account only exists in a different Supabase project than these two query.
      mockFetchByUrl({
        '/user/sync': { email: 'newkid@aivorah.student', onboardingComplete: false },
        '/user/preferences': {},
      });

      await render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );

      expect(authStateCallback).not.toBeNull();

      // Simulate Firebase confirming a real, already-authenticated session for a
      // just-created account (this fires independently of any explicit login call
      // whenever the SDK resolves auth state - e.g. on the page that follows
      // account creation, or a page reload right after).
      authStateCallback!({
        email: 'newkid@aivorah.student',
        emailVerified: false,
        displayName: 'New Kid|student',
        providerData: [{ providerId: 'password' }],
      });

      // The guard retries 3x with backoff (400/800/1500ms) before concluding the
      // account is genuinely deleted - allow real time for that.
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      }, { timeout: 4000 });

      await waitFor(() => {
        expect(screen.getByTestId('state').props.children).toBe('signed-out');
      });
    },
    6000,
  );
});
