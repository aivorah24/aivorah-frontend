// Platform-admin edits applied live (applyAccountUpdate) and the server role winning on app load.
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth, mergeAccountUpdate, rolesWithPrimary, User } from '../AuthContext';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default,
}));

const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => mockStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { mockStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete mockStore[k]; }),
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), deleteApp: jest.fn() }));
let mockAuthCallback: ((u: any) => Promise<void>) | null = null;
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_a: any, cb: any) => { mockAuthCallback = cb; return jest.fn(); }),
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

let syncBody: any;
let prefsBody: any;

function Consumer({ start }: { start: User }) {
  const { user, login, applyAccountUpdate } = useAuth();
  return (
    <>
      <Text testID="u">{user ? `${user.name}|${user.role}|${user.activeRole}|${(user.roles || []).join('+')}|${user.section ?? '-'}|${user.school ?? '-'}` : 'none'}</Text>
      <TouchableOpacity testID="login" onPress={() => login(start)}><Text>login</Text></TouchableOpacity>
      <TouchableOpacity testID="apply" onPress={() => applyAccountUpdate()}><Text>apply</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStore).forEach(k => delete mockStore[k]);
  mockAuthCallback = null;
  (global as any).window = { location: { hostname: 'aivorah-frontend.vercel.app', search: '', origin: 'https://aivorah-frontend.vercel.app' } };
  syncBody = { id: 'u1', name: 'Asha', role: 'student', onboardingComplete: true };
  prefsBody = { accountStatus: 'active' };
  (global.fetch as jest.Mock) = jest.fn((url: string) => {
    if (url.includes('/user/sync')) return Promise.resolve({ ok: true, json: async () => syncBody });
    if (url.includes('/user/preferences')) return Promise.resolve({ ok: true, json: async () => prefsBody });
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
});

const STUDENT: User = { name: 'Asha', email: 'asha@x.test', role: 'student', activeRole: 'student', roles: ['student'], school: 'TSRA', emailVerified: true, onboardingComplete: true };

async function setup(start: User) {
  const u = userEvent.setup();
  await render(<AuthProvider><Consumer start={start} /></AuthProvider>);
  await u.press(screen.getByTestId('login'));
  return u;
}

describe('applyAccountUpdate', () => {
  test('primary role change switches role and activeRole immediately and persists it', async () => {
    syncBody = { id: 'u1', name: 'Asha', role: 'teacher', roles: ['teacher'], school: 'TSRA', onboardingComplete: true };
    const u = await setup(STUDENT);
    await u.press(screen.getByTestId('apply'));
    await waitFor(() => expect(screen.getByTestId('u')).toHaveTextContent('Asha|teacher|teacher|teacher|-|TSRA'));
    const saved = JSON.parse(mockStore.ai_mentor_user_profile || Object.values(mockStore).find(v => v.includes('asha@x.test'))!);
    expect(saved).toMatchObject({ role: 'teacher', activeRole: 'teacher', roles: ['teacher'] });
  });

  test('stale roles from preferences do not keep the old role', async () => {
    syncBody = { id: 'u1', name: 'Asha', role: 'teacher', onboardingComplete: true };
    prefsBody = { accountStatus: 'active', roles: ['student'] };
    const u = await setup(STUDENT);
    await u.press(screen.getByTestId('apply'));
    await waitFor(() => expect(screen.getByTestId('u')).toHaveTextContent(/^Asha\|teacher\|teacher\|teacher\|/));
  });

  test('name, school and section changes apply without touching the role', async () => {
    syncBody = { id: 'u1', name: 'Asha Rao', role: 'student', school: 'Seed School', section: 'B', onboardingComplete: true };
    const u = await setup(STUDENT);
    await u.press(screen.getByTestId('apply'));
    await waitFor(() => expect(screen.getByTestId('u')).toHaveTextContent('Asha Rao|student|student|student|B|Seed School'));
  });

  test('multi-role user keeps the active role they picked', async () => {
    const dual: User = { ...STUDENT, name: 'Tara', role: 'parent', activeRole: 'parent', roles: ['teacher', 'parent'] };
    syncBody = { id: 'u1', name: 'Tara K', role: 'teacher', roles: ['teacher', 'parent'], onboardingComplete: true };
    const u = await setup(dual);
    await u.press(screen.getByTestId('apply'));
    await waitFor(() => expect(screen.getByTestId('u')).toHaveTextContent(/^Tara K\|parent\|parent\|teacher\+parent\|/));
  });

  test('a failed profile read changes nothing', async () => {
    (global.fetch as jest.Mock) = jest.fn(() => Promise.reject(new Error('offline')));
    const u = await setup(STUDENT);
    await u.press(screen.getByTestId('apply'));
    expect(screen.getByTestId('u')).toHaveTextContent('Asha|student|student|student|-|TSRA');
  });
});

describe('app load after an admin role change', () => {
  test('server role wins over the old displayName role and a stale cached activeRole', async () => {
    mockStore.ai_mentor_user_profile = JSON.stringify({ email: 'asha@x.test', role: 'student', activeRole: 'student', roles: ['student'], emailVerified: true, onboardingComplete: true });
    syncBody = { id: 'u1', name: 'Asha', role: 'teacher', onboardingComplete: true };
    prefsBody = { accountStatus: 'active', roles: ['student'], activeRole: 'student' };
    await render(<AuthProvider><Consumer start={STUDENT} /></AuthProvider>);
    await waitFor(() => expect(mockAuthCallback).not.toBeNull());
    await act(async () => {
      await mockAuthCallback!({ email: 'asha@x.test', displayName: 'Asha|student', emailVerified: true, providerData: [{ providerId: 'password' }] });
    });
    await waitFor(() => expect(screen.getByTestId('u')).toHaveTextContent(/^Asha\|teacher\|teacher\|teacher\|/));
  });
});

describe('pure helpers', () => {
  test('rolesWithPrimary drops a roles list that lacks the server role', () => {
    expect(rolesWithPrimary(['student'], 'teacher')).toEqual(['teacher']);
    expect(rolesWithPrimary(['teacher', 'parent'], 'teacher')).toEqual(['teacher', 'parent']);
    expect(rolesWithPrimary(undefined, 'parent')).toEqual(['parent']);
    expect(rolesWithPrimary(['student'], undefined)).toEqual(['student']);
  });

  test('mergeAccountUpdate switches when the active role was removed', () => {
    const dual: User = { ...STUDENT, role: 'teacher', activeRole: 'teacher', roles: ['teacher', 'parent'] };
    const next = mergeAccountUpdate(dual, { role: 'parent', roles: ['parent'] });
    expect(next).toMatchObject({ role: 'parent', activeRole: 'parent', roles: ['parent'] });
  });
});
