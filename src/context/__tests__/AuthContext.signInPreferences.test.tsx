// Regression: sign-in built the user from an explicit field list that dropped
// avatarStyle/learningStyle, so a student resuming onboarding after
// "Save & go to home page" saw Default avatar and no learning style.

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
  onAuthStateChanged: jest.fn(() => jest.fn()),
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

function TestConsumer() {
  const { user, signInWithGoogle, signInWithEmail } = useAuth();
  return (
    <>
      <Text testID="avatar">{(user as any)?.avatarStyle ?? '(none)'}</Text>
      <Text testID="learning">{(user as any)?.learningStyle ?? '(none)'}</Text>
      <Text testID="photo">{(user as any)?.photoUrl ?? '(none)'}</Text>
      <Text testID="school">{user?.school ?? '(none)'}</Text>
      <TouchableOpacity testID="signin-google" onPress={() => signInWithGoogle('student').catch(() => {})}>
        <Text>Google</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="signin-email" onPress={() => signInWithEmail('student@example.com', 'password123').catch(() => {})}>
        <Text>Email</Text>
      </TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).window = { location: { hostname: 'aivorah-frontend.vercel.app', search: '', origin: 'https://aivorah-frontend.vercel.app' } };
  mockSignInWithPopup.mockResolvedValue({
    user: { displayName: 'Brintha', email: 'student@example.com', emailVerified: true },
  });
  mockSignInWithEmailAndPassword.mockResolvedValue({
    user: { displayName: 'Brintha', email: 'student@example.com', emailVerified: true, uid: 'u1' },
  });
  // Mid-onboarding student: progress saved, onboarding not complete yet.
  (global.fetch as jest.Mock) = jest.fn((url: string) => {
    if (url.includes('/user/sync')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          id: 'u1', role: 'student', name: 'Brintha', onboardingComplete: false,
          grade: 'Grade 8', curriculum: 'IB MYP', photoUrl: 'https://img.example/p.jpg',
        }),
      });
    }
    if (url.includes('/user/preferences')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ accountStatus: 'active', avatarStyle: 'casual', learningStyle: 'visual' }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
});

test.each([['signin-email'], ['signin-google']])(
  '%s carries saved avatar, learning style and photo onto the user',
  async (testID) => {
    const user = userEvent.setup();
    await render(<AuthProvider><TestConsumer /></AuthProvider>);
    await user.press(screen.getByTestId(testID));

    await waitFor(() => {
      expect(screen.getByTestId('avatar').props.children).toBe('casual');
    });
    expect(screen.getByTestId('learning').props.children).toBe('visual');
    expect(screen.getByTestId('photo').props.children).toBe('https://img.example/p.jpg');
  },
);

// Regression: email sign-in defaulted a blank school to "Hyderabad International
// School", so teacher-created students showed the wrong school.
test('email sign-in never invents a school for a student without one', async () => {
  const user = userEvent.setup();
  await render(<AuthProvider><TestConsumer /></AuthProvider>);
  await user.press(screen.getByTestId('signin-email'));
  await waitFor(() => expect(screen.getByTestId('avatar').props.children).toBe('casual'));
  expect(screen.getByTestId('school').props.children).toBe('(none)');
});
