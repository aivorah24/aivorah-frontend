import { renderHook, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import { useParentSettingsData } from '../../hooks/useParentSettingsData';
import * as settingsService from '../../services/settingsService';

const mockUpdateUser = jest.fn();
const mockLogout = jest.fn();
let mockUser: any = { email: 'p@test.com', name: 'Jane Parent', location: 'Salem', authProvider: 'password' };

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, updateUser: mockUpdateUser, logout: mockLogout }),
}));

jest.mock('../../../../../config/firebase', () => ({ auth: { currentUser: { email: 'p@test.com', providerData: [] } } }));

const mockReauth = jest.fn().mockResolvedValue(undefined);
const mockUpdatePassword = jest.fn().mockResolvedValue(undefined);
const mockSignInWithPopup = jest.fn();
const mockReauthPopup = jest.fn().mockResolvedValue(undefined);
const mockDeleteUser = jest.fn().mockResolvedValue(undefined);

jest.mock('firebase/auth', () => ({
  updatePassword: (...args: any[]) => mockUpdatePassword(...args),
  EmailAuthProvider: { credential: jest.fn().mockReturnValue('cred') },
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({ setCustomParameters: jest.fn() })),
  reauthenticateWithCredential: (...args: any[]) => mockReauth(...args),
  reauthenticateWithPopup: (...args: any[]) => mockReauthPopup(...args),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
  deleteUser: (...args: any[]) => mockDeleteUser(...args),
}));

jest.mock('../../services/settingsService');

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('useParentSettingsData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { email: 'p@test.com', name: 'Jane Parent', location: 'Salem', authProvider: 'password' };
  });

  describe('handleSaveName', () => {
    it('requires a non-empty name', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewName('  '); });
      await act(async () => { await result.current.handleSaveName(); });
      expect(Alert.alert).toHaveBeenCalledWith('Required', 'Please enter a name.');
      expect(settingsService.syncProfile).not.toHaveBeenCalled();
    });

    it('updates local user state and syncs the trimmed name', async () => {
      (settingsService.syncProfile as jest.Mock).mockResolvedValue(undefined);
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewName('  New Name  '); });
      await act(async () => { await result.current.handleSaveName(); });

      expect(mockUpdateUser).toHaveBeenCalledWith({ name: 'New Name' });
      expect(settingsService.syncProfile).toHaveBeenCalledWith({ email: 'p@test.com', name: 'New Name' });
      expect(result.current.activeModal).toBeNull();
    });
  });

  describe('handleSaveLocation', () => {
    it('requires a non-empty location', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewLocation(''); });
      await act(async () => { await result.current.handleSaveLocation(); });
      expect(result.current.modalError).toBe('Please enter a location.');
    });

    it('resends the current name alongside location, per /user/sync\'s upsert requirement', async () => {
      (settingsService.syncProfile as jest.Mock).mockResolvedValue(undefined);
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewLocation('Chennai'); });
      await act(async () => { await result.current.handleSaveLocation(); });

      expect(settingsService.syncProfile).toHaveBeenCalledWith({ email: 'p@test.com', name: 'Jane Parent', location: 'Chennai' });
      expect(mockUpdateUser).toHaveBeenCalledWith({ location: 'Chennai' });
    });

    it('surfaces the service error in modalError and keeps the modal open', async () => {
      (settingsService.syncProfile as jest.Mock).mockRejectedValue(new Error('Failed to save'));
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.openModal('location'); result.current.setNewLocation('Chennai'); });
      await act(async () => { await result.current.handleSaveLocation(); });

      expect(result.current.modalError).toBe('Failed to save');
      expect(result.current.activeModal).toBe('location');
    });
  });

  describe('handleChangePassword', () => {
    it('rejects a new password under 6 characters', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => {
        result.current.setCurrentPw('oldpass');
        result.current.setNewPw('123');
        result.current.setConfirmPw('123');
      });
      await act(async () => { await result.current.handleChangePassword(); });
      expect(Alert.alert).toHaveBeenCalledWith('Too Short', 'New password must be at least 6 characters.');
      expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('rejects mismatched new/confirm passwords', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => {
        result.current.setCurrentPw('oldpass');
        result.current.setNewPw('newpass1');
        result.current.setConfirmPw('newpass2');
      });
      await act(async () => { await result.current.handleChangePassword(); });
      expect(Alert.alert).toHaveBeenCalledWith('Mismatch', 'Passwords do not match.');
    });

    it('reauthenticates then updates the password on success', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => {
        result.current.setCurrentPw('oldpass');
        result.current.setNewPw('newpass1');
        result.current.setConfirmPw('newpass1');
      });
      await act(async () => { await result.current.handleChangePassword(); });

      expect(mockReauth).toHaveBeenCalled();
      expect(mockUpdatePassword).toHaveBeenCalledWith(expect.any(Object), 'newpass1');
      expect(Alert.alert).toHaveBeenCalledWith('Password Changed', 'Your password has been updated successfully.');
    });
  });

  describe('confirmDeleteAccount', () => {
    it('requires a password for password-auth users', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(async () => { await result.current.confirmDeleteAccount(); });
      expect(result.current.deleteError).toBe('Please enter your password to confirm.');
      expect(settingsService.deleteAccount).not.toHaveBeenCalled();
    });

    it('reauthenticates, deletes server-side and via Firebase, then logs out', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setDeletePassword('mypassword'); });
      await act(async () => { await result.current.confirmDeleteAccount(); });

      expect(mockReauth).toHaveBeenCalled();
      expect(settingsService.deleteAccount).toHaveBeenCalledWith('p@test.com');
      expect(mockDeleteUser).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('handleSignOut', () => {
    it('logs out when the web confirm dialog is accepted', async () => {
      const originalConfirm = (global as any).window?.confirm;
      (global as any).window = { ...(global as any).window, confirm: jest.fn().mockReturnValue(true) };
      Platform.OS = 'web';

      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.handleSignOut(); });

      expect(mockLogout).toHaveBeenCalled();
      (global as any).window.confirm = originalConfirm;
    });
  });
});
