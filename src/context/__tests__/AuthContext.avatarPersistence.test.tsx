// Regression tests for Bug #9 — "avatar picked on Profile screen reverts
// after a refresh" (reported 2026-08-28: "initially it was working but when
// I refresh it was failing").
//
// Root cause: avatarStyle/learningStyle/interests/bio only ever come from a
// second, best-effort GET /user/preferences call inside
// fetchSupabaseProfile() — never from the reliable /user/sync call (same
// split that caused the earlier dob/gender/state/country bug, see
// AuthContext.dobGenderState.test.tsx). Unlike that fix, these 4 fields were
// never given the "fall back to what's already known, don't blank it out"
// protection — the session-restore path built `resolvedUser` with
// `{ ...baseUser, ...savedLocal, ...supaProfile, ... }`, a blind spread
// where `supaProfile` (last) always wins, including when its avatarStyle key
// is explicitly `undefined`. Any refresh that races ahead of the
// just-fired, un-awaited `updateUser()` PATCH (or hits the network
// flakiness already proven elsewhere this session) silently wipes the
// locally-cached, correct choice.

import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../AuthContext';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default,
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), deleteApp: jest.fn() }));

let capturedAuthCallback: ((firebaseUser: any) => void | Promise<void>) | null = null;
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: any, cb: any) => { capturedAuthCallback = cb; return jest.fn(); },
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn().mockResolvedValue(undefined),
  updateProfile: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
  signInWithPopup: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({ auth: {} }));
jest.mock('../ThemeContext', () => ({ useTheme: () => ({ setThemeMode: jest.fn() }) }));
jest.mock('../../utils/curriculumPrefetch', () => ({ prefetchStudentDashboard: jest.fn() }));

const PROFILE_KEY = 'ai_mentor_user_profile';

function TestConsumer() {
  const { user } = useAuth();
  return (
    <>
      <Text testID="avatarStyle">{user?.avatarStyle ?? '(none)'}</Text>
      <Text testID="learningStyle">{user?.learningStyle ?? '(none)'}</Text>
      <Text testID="bio">{(user as any)?.bio ?? '(none)'}</Text>
      {/* isPro is only ever a real boolean once the authoritative session-restore
          (not the earlier optimistic AsyncStorage-cache render) has landed — the
          seeded local cache below never sets it, so this is a reliable "the real
          async resolution has actually finished" marker distinct from
          avatarStyle/learningStyle/bio themselves. */}
      <Text testID="isPro">{String(user?.isPro)}</Text>
    </>
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  capturedAuthCallback = null;
  (global as any).window = { location: { hostname: 'aivorah-frontend.vercel.app', search: '', origin: 'https://aivorah-frontend.vercel.app' } };
  await AsyncStorage.clear();
});

async function fireSessionRestore(firebaseUser: {
  email: string; displayName?: string; emailVerified?: boolean; providerData?: { providerId: string }[];
}) {
  expect(capturedAuthCallback).not.toBeNull();
  await capturedAuthCallback!(firebaseUser);
}

describe('Bug #9 — avatarStyle/learningStyle/bio survive a page refresh', () => {
  test('a returning user with a locally-cached avatar keeps it on refresh even when GET /user/preferences omits it (the actual bug)', async () => {
    // Simulates: the user picked "gamer" moments ago (cached locally via
    // updateUser()'s own AsyncStorage write), then refreshed the page. The
    // separate preferences GET below deliberately does NOT return
    // avatarStyle — reproducing either a race with the not-yet-landed PATCH,
    // or the network flakiness already proven elsewhere this session.
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({
      email: 'student@example.com', name: 'Real Student', role: 'student',
      onboardingComplete: true, avatarStyle: 'gamer', learningStyle: 'visual', bio: 'I love robotics',
    }));

    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url.includes('/user/sync')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'u1', role: 'student', name: 'Real Student', onboardingComplete: true }),
        });
      }
      if (url.includes('/user/preferences')) {
        // Real preferences row, real fields — just not these ones this time.
        return Promise.resolve({ ok: true, json: async () => ({ accountStatus: 'active' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await render(<AuthProvider><TestConsumer /></AuthProvider>);
    await fireSessionRestore({
      email: 'student@example.com', displayName: 'Real Student', emailVerified: true,
      providerData: [{ providerId: 'password' }],
    });

    // Wait for the REAL, authoritative session-restore to land (not the
    // earlier optimistic AsyncStorage-cache render, which also briefly shows
    // 'gamer' correctly regardless of whether the bug is fixed — asserting
    // too early would pass even against the buggy code).
    await waitFor(() => {
      expect(screen.getByTestId('isPro').props.children).toBe('false');
    });
    expect(screen.getByTestId('avatarStyle').props.children).toBe('gamer');
    expect(screen.getByTestId('learningStyle').props.children).toBe('visual');
    expect(screen.getByTestId('bio').props.children).toBe('I love robotics');
  });

  test('the server IS trusted when it actually returns a value — a real change made elsewhere still wins', async () => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({
      email: 'student@example.com', name: 'Real Student', role: 'student',
      onboardingComplete: true, avatarStyle: 'gamer',
    }));

    (global.fetch as jest.Mock) = jest.fn((url: string) => {
      if (url.includes('/user/sync')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'u1', role: 'student', name: 'Real Student', onboardingComplete: true }),
        });
      }
      if (url.includes('/user/preferences')) {
        // Server has a genuinely different, real value this time.
        return Promise.resolve({ ok: true, json: async () => ({ accountStatus: 'active', avatarStyle: 'scholar' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await render(<AuthProvider><TestConsumer /></AuthProvider>);
    await fireSessionRestore({
      email: 'student@example.com', displayName: 'Real Student', emailVerified: true,
      providerData: [{ providerId: 'password' }],
    });

    await waitFor(() => {
      expect(screen.getByTestId('isPro').props.children).toBe('false');
    });
    expect(screen.getByTestId('avatarStyle').props.children).toBe('scholar');
  });
});
