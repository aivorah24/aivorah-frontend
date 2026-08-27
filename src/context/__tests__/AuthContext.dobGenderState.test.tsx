// Regression tests for the "Gender/DOB/State missing on re-login" bug
// (2026-08-26): dob/gender/state/country used to live ONLY in
// user_preferences (fetched by a separate, best-effort GET /user/preferences
// call wrapped in a silent try/catch) while grade/curriculum/school came
// from the reliable /user/sync call. Any failure of that one preferences
// fetch silently dropped exactly these 3-4 fields, nothing else.
//
// Root-cause fix: dob/gender/state/country are now real `users` columns,
// returned directly by /user/sync (see aivorah-auth-service /
// aivorah-profile-service). These tests prove the fields survive even when
// the separate /user/preferences call fails outright — the actual failure
// mode that caused the bug.

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
const mockSignInWithEmailAndPassword = jest.fn();
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()), // returns an unsubscribe fn, never fires
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
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
  const { user, signInWithGoogle, signInWithEmail } = useAuth();
  return (
    <>
      <Text testID="dob">{user?.dob ?? '(none)'}</Text>
      <Text testID="gender">{user?.gender ?? '(none)'}</Text>
      <Text testID="state">{user?.state ?? '(none)'}</Text>
      <Text testID="country">{user?.country ?? '(none)'}</Text>
      <TouchableOpacity testID="signin" onPress={() => signInWithGoogle(role).catch(() => {})}>
        <Text>Sign in with Google</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="signin-email" onPress={() => signInWithEmail('student@example.com', 'password123').catch(() => {})}>
        <Text>Sign in with email</Text>
      </TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).window = { location: { hostname: 'aivorah-frontend.vercel.app', search: '', origin: 'https://aivorah-frontend.vercel.app' } };
  mockSignInWithPopup.mockResolvedValue({
    user: { displayName: 'Real Student', email: 'student@example.com', emailVerified: true },
  });
  mockSignInWithEmailAndPassword.mockResolvedValue({
    user: { displayName: 'Real Student', email: 'student@example.com', emailVerified: true, uid: 'u1' },
  });
});

describe('fetchSupabaseProfile — dob/gender/state/country resilience', () => {
  test('a REAL user with both calls succeeding gets dob/gender/state/country from /user/sync', async () => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url.includes('/user/sync')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'u1', role: 'student', name: 'Real Student', onboardingComplete: true,
            dob: '15/06/2012', gender: 'Female', state: 'Karnataka', country: 'India',
          }),
        });
      }
      if (url.includes('/user/preferences')) {
        return Promise.resolve({ ok: true, json: async () => ({ accountStatus: 'active' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup();
    await render(<AuthProvider><TestConsumer /></AuthProvider>);
    await user.press(screen.getByTestId('signin'));

    await waitFor(() => {
      expect(screen.getByTestId('dob').props.children).toBe('15/06/2012');
    });
    expect(screen.getByTestId('gender').props.children).toBe('Female');
    expect(screen.getByTestId('state').props.children).toBe('Karnataka');
    expect(screen.getByTestId('country').props.children).toBe('India');
  });

  test('a REAL user still has dob/gender/state/country even when /user/preferences fails outright — the actual bug', async () => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url.includes('/user/sync')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'u1', role: 'student', name: 'Real Student', onboardingComplete: true,
            dob: '15/06/2012', gender: 'Female', state: 'Karnataka', country: 'India',
          }),
        });
      }
      if (url.includes('/user/preferences')) {
        // The exact failure mode that used to silently wipe these fields —
        // a network error on the SEPARATE preferences call.
        return Promise.reject(new Error('network error'));
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup();
    await render(<AuthProvider><TestConsumer /></AuthProvider>);
    await user.press(screen.getByTestId('signin'));

    await waitFor(() => {
      expect(screen.getByTestId('dob').props.children).toBe('15/06/2012');
    });
    expect(screen.getByTestId('gender').props.children).toBe('Female');
    expect(screen.getByTestId('state').props.children).toBe('Karnataka');
    expect(screen.getByTestId('country').props.children).toBe('India');
  });

  test('a REAL user still has dob/gender/state/country when /user/preferences returns them empty (not overwritten with blanks)', async () => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url.includes('/user/sync')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'u1', role: 'student', name: 'Real Student', onboardingComplete: true,
            dob: '15/06/2012', gender: 'Female', state: 'Karnataka', country: 'India',
          }),
        });
      }
      if (url.includes('/user/preferences')) {
        // Preferences row exists but (as would happen mid-migration, before
        // these fields are ever written there again) doesn't have these 4 fields.
        return Promise.resolve({ ok: true, json: async () => ({ accountStatus: 'active' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup();
    await render(<AuthProvider><TestConsumer /></AuthProvider>);
    await user.press(screen.getByTestId('signin'));

    await waitFor(() => {
      expect(screen.getByTestId('dob').props.children).toBe('15/06/2012');
    });
    expect(screen.getByTestId('gender').props.children).toBe('Female');
    expect(screen.getByTestId('state').props.children).toBe('Karnataka');
    expect(screen.getByTestId('country').props.children).toBe('India');
  });
});

describe('signInWithEmail — dob/gender/state/country (regular email/password login, the actual reported path)', () => {
  test('a REAL email/password login carries dob/gender/state/country onto the user object', async () => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url.includes('/user/sync')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'u1', role: 'student', name: 'Real Student', onboardingComplete: true,
            dob: '15/06/2012', gender: 'Female', state: 'Karnataka', country: 'India',
          }),
        });
      }
      if (url.includes('/user/preferences')) {
        return Promise.resolve({ ok: true, json: async () => ({ accountStatus: 'active' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup();
    await render(<AuthProvider><TestConsumer /></AuthProvider>);
    await user.press(screen.getByTestId('signin-email'));

    await waitFor(() => {
      expect(screen.getByTestId('dob').props.children).toBe('15/06/2012');
    });
    expect(screen.getByTestId('gender').props.children).toBe('Female');
    expect(screen.getByTestId('state').props.children).toBe('Karnataka');
    expect(screen.getByTestId('country').props.children).toBe('India');
  });

  test('dob/gender/state/country survive even when /user/preferences fails outright', async () => {
    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url.includes('/user/sync')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'u1', role: 'student', name: 'Real Student', onboardingComplete: true,
            dob: '15/06/2012', gender: 'Female', state: 'Karnataka', country: 'India',
          }),
        });
      }
      if (url.includes('/user/preferences')) {
        return Promise.reject(new Error('network error'));
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const user = userEvent.setup();
    await render(<AuthProvider><TestConsumer /></AuthProvider>);
    await user.press(screen.getByTestId('signin-email'));

    await waitFor(() => {
      expect(screen.getByTestId('dob').props.children).toBe('15/06/2012');
    });
    expect(screen.getByTestId('gender').props.children).toBe('Female');
    expect(screen.getByTestId('state').props.children).toBe('Karnataka');
    expect(screen.getByTestId('country').props.children).toBe('India');
  });
});
