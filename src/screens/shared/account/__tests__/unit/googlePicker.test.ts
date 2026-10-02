import { pickGoogleAccount } from '../../services/googlePicker';

const pickerAuth = { name: 'picker-auth' };
const mockInitializeApp = jest.fn(() => ({ name: 'google-account-picker' }));
const mockSignIn = jest.fn();
const mockSignOut = jest.fn(async () => {});
const mockSetPersistence = jest.fn(async () => {});

jest.mock('firebase/app', () => ({ getApps: () => [], initializeApp: (...a: unknown[]) => mockInitializeApp(...(a as [])) }));
jest.mock('firebase/auth', () => ({
  getAuth: () => pickerAuth,
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({ setCustomParameters: jest.fn() })),
  inMemoryPersistence: 'memory',
  setPersistence: (...a: unknown[]) => mockSetPersistence(...(a as [])),
  signInWithPopup: (...a: unknown[]) => mockSignIn(...a),
  signOut: (...a: unknown[]) => mockSignOut(...(a as [])),
}));
jest.mock('../../../../../config/firebase', () => ({ __esModule: true, default: { options: { apiKey: 'k' } }, auth: { name: 'main-auth' } }));

beforeEach(() => jest.clearAllMocks());

test('signs in on a separate in-memory app, returns the picked account, then signs that out', async () => {
  mockSignIn.mockResolvedValue({ user: { email: 'New@Gmail.com', getIdToken: async () => 'tok' } });
  await expect(pickGoogleAccount()).resolves.toEqual({ email: 'new@gmail.com', idToken: 'tok' });
  expect(mockInitializeApp).toHaveBeenCalledWith({ apiKey: 'k' }, 'google-account-picker');
  expect(mockSetPersistence).toHaveBeenCalledWith(pickerAuth, 'memory');
  expect(mockSignIn.mock.calls[0][0]).toBe(pickerAuth);
  expect(mockSignOut).toHaveBeenCalledWith(pickerAuth);
});

test('a cancelled popup is passed on (nothing to sign out)', async () => {
  mockSignIn.mockRejectedValue(Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }));
  await expect(pickGoogleAccount()).rejects.toMatchObject({ code: 'auth/popup-closed-by-user' });
  expect(mockSignOut).not.toHaveBeenCalled();
});
