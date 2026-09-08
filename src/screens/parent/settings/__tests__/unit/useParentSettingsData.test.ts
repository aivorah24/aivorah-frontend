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

  describe('handleSendEmailOtp', () => {
    it('rejects an empty email', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(async () => { await result.current.handleSendEmailOtp(); });
      expect(result.current.modalError).toBe('Please enter your new email.');
    });

    it('rejects an email identical to the current one', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewEmail('p@test.com'); });
      await act(async () => { await result.current.handleSendEmailOtp(); });
      expect(result.current.modalError).toBe('That is already your current email.');
    });

    it('rejects when the email is already taken', async () => {
      (settingsService.isEmailTaken as jest.Mock).mockResolvedValue(true);
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewEmail('taken@test.com'); result.current.setEmailPassword('pw'); });
      await act(async () => { await result.current.handleSendEmailOtp(); });
      expect(result.current.modalError).toBe('That email is already registered to another Aivorah account.');
      expect(settingsService.sendEmailOtp).not.toHaveBeenCalled();
    });

    it('sends the OTP and advances to the otp step on success', async () => {
      (settingsService.isEmailTaken as jest.Mock).mockResolvedValue(false);
      (settingsService.sendEmailOtp as jest.Mock).mockResolvedValue(undefined);
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewEmail('new@test.com'); result.current.setEmailPassword('pw'); });
      await act(async () => { await result.current.handleSendEmailOtp(); });

      expect(settingsService.sendEmailOtp).toHaveBeenCalledWith('new@test.com', 'Jane Parent');
      expect(result.current.emailStep).toBe('otp');
    });
  });

  describe('handleSwitchGoogleAccount', () => {
    it('errors when the picked Google account has no email address', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: { email: '', getIdToken: jest.fn() } });
      const { result } = await renderHook(() => useParentSettingsData());
      await act(async () => { await result.current.handleSwitchGoogleAccount(); });
      expect(result.current.modalError).toBe('That Google account has no email address.');
      expect(settingsService.changeEmailGoogle).not.toHaveBeenCalled();
    });

    it('errors when the picked Google account is the same one already in use', async () => {
      mockSignInWithPopup.mockResolvedValue({ user: { email: 'p@test.com', getIdToken: jest.fn() } });
      const { result } = await renderHook(() => useParentSettingsData());
      await act(async () => { await result.current.handleSwitchGoogleAccount(); });
      expect(result.current.modalError).toBe('That is the same Google account you already use. Pick a different one.');
    });

    it('shows a friendly error when the Google popup is cancelled', async () => {
      mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
      const { result } = await renderHook(() => useParentSettingsData());
      await act(async () => { await result.current.handleSwitchGoogleAccount(); });
      expect(result.current.modalError).toBe('Google selection was cancelled. Please try again.');
    });

    it('switches the account, closes the modal, and logs out shortly after', async () => {
      jest.useFakeTimers();
      mockSignInWithPopup.mockResolvedValue({ user: { email: 'new@gmail.com', getIdToken: jest.fn().mockResolvedValue('tok') } });
      (settingsService.changeEmailGoogle as jest.Mock).mockResolvedValue({ newEmail: 'new@gmail.com' });

      const { result } = await renderHook(() => useParentSettingsData());
      await act(async () => { await result.current.handleSwitchGoogleAccount(); });

      expect(settingsService.changeEmailGoogle).toHaveBeenCalledWith('p@test.com', 'tok');
      expect(result.current.activeModal).toBeNull();

      await act(async () => { jest.advanceTimersByTime(150); });
      expect(mockLogout).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('handleResendEmailOtp', () => {
    it('resends the OTP and shows a confirmation alert', async () => {
      (settingsService.sendEmailOtp as jest.Mock).mockResolvedValue(undefined);
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewEmail('new@test.com'); });
      await act(async () => { await result.current.handleResendEmailOtp(); });

      expect(settingsService.sendEmailOtp).toHaveBeenCalledWith('new@test.com', 'Jane Parent');
      expect(Alert.alert).toHaveBeenCalledWith('Code Resent', 'A new code was sent to new@test.com.');
    });

    it('surfaces the error in modalError on failure', async () => {
      (settingsService.sendEmailOtp as jest.Mock).mockRejectedValue(new Error('resend failed'));
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewEmail('new@test.com'); });
      await act(async () => { await result.current.handleResendEmailOtp(); });

      expect(result.current.modalError).toBe('resend failed');
    });
  });

  describe('handleVerifyEmailOtp', () => {
    it('requires a code', async () => {
      const { result } = await renderHook(() => useParentSettingsData());
      await act(async () => { await result.current.handleVerifyEmailOtp(); });
      expect(result.current.modalError).toBe('Please enter the code.');
      expect(settingsService.changeEmail).not.toHaveBeenCalled();
    });

    it('verifies the code, closes the modal, and logs out shortly after', async () => {
      jest.useFakeTimers();
      (settingsService.changeEmail as jest.Mock).mockResolvedValue(undefined);
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewEmail('new@test.com'); result.current.setEmailOtp('123456'); });
      await act(async () => { await result.current.handleVerifyEmailOtp(); });

      expect(settingsService.changeEmail).toHaveBeenCalledWith('p@test.com', 'new@test.com', '123456');
      expect(result.current.activeModal).toBeNull();

      await act(async () => { jest.advanceTimersByTime(150); });
      expect(mockLogout).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('surfaces the server error and keeps the modal open on failure', async () => {
      (settingsService.changeEmail as jest.Mock).mockRejectedValue(new Error('bad otp'));
      const { result } = await renderHook(() => useParentSettingsData());
      await act(() => { result.current.setNewEmail('new@test.com'); result.current.setEmailOtp('000000'); });
      await act(async () => { await result.current.handleVerifyEmailOtp(); });

      expect(result.current.modalError).toBe('bad otp');
      expect(mockLogout).not.toHaveBeenCalled();
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
