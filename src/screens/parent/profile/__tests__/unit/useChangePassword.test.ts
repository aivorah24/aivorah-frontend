import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useChangePassword } from '../../hooks/useChangePassword';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  updatePassword: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  reauthenticateWithCredential: jest.fn(),
}));

describe('useChangePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct defaults', async () => {
    const { result } = await renderHook(() => useChangePassword('test@test.com'));
    expect(result.current.passModalVisible).toBe(false);
    expect(result.current.passError).toBe('');
    expect(result.current.passSuccess).toBe(false);
  });

  it('opens modal and resets state', async () => {
    const { result } = await renderHook(() => useChangePassword('test@test.com'));
    await act(async () => {
      result.current.setCurrentPass('leftover');
      result.current.openPassModal();
    });
    expect(result.current.passModalVisible).toBe(true);
    expect(result.current.passError).toBe('');
    expect(result.current.currentPass).toBe('');
  });

  it('validates password length', async () => {
    const { result } = await renderHook(() => useChangePassword('test@test.com'));
    await act(async () => {
      result.current.setNewPass('12345');
      result.current.setConfirmPass('12345');
    });
    await act(async () => {
      await result.current.handleChangePassword();
    });
    expect(result.current.passError).toBe('New password must be at least 6 characters.');
    expect(getAuth).not.toHaveBeenCalled();
  });

  it('validates passwords match', async () => {
    const { result } = await renderHook(() => useChangePassword('test@test.com'));
    await act(async () => {
      result.current.setNewPass('123456');
      result.current.setConfirmPass('1234567');
    });
    await act(async () => {
      await result.current.handleChangePassword();
    });
    expect(result.current.passError).toBe('Passwords do not match.');
  });

  it('successfully updates password and strips whitespace', async () => {
    const mockUser = { uid: '123' };
    const mockCredential = { type: 'cred' };
    (getAuth as jest.Mock).mockReturnValue({ currentUser: mockUser });
    (EmailAuthProvider.credential as jest.Mock).mockReturnValue(mockCredential);
    (reauthenticateWithCredential as jest.Mock).mockResolvedValue({});
    (updatePassword as jest.Mock).mockResolvedValue({});

    const { result } = await renderHook(() => useChangePassword('test@test.com'));

    await act(async () => {
      result.current.setCurrentPass('oldpass  ');
      result.current.setNewPass('newpass  ');
      result.current.setConfirmPass('newpass');
    });

    await act(async () => {
      await result.current.handleChangePassword();
    });

    expect(EmailAuthProvider.credential).toHaveBeenCalledWith('test@test.com', 'oldpass');
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(mockUser, mockCredential);
    expect(updatePassword).toHaveBeenCalledWith(mockUser, 'newpass');
    expect(result.current.passSuccess).toBe(true);

    // Real 1.6s wait instead of fake timers - the hook's own setTimeout(1500)
    // closes the modal; fake timers here previously leaked into later tests'
    // renderHook() calls (cross-test pollution), so a genuine short wait is
    // more robust than juggling useFakeTimers/useRealTimers cleanup ordering.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1600));
    });
    expect(result.current.passModalVisible).toBe(false);
  }, 10000);

  it('handles auth errors appropriately', async () => {
    const mockUser = { uid: '123' };
    (getAuth as jest.Mock).mockReturnValue({ currentUser: mockUser });
    (reauthenticateWithCredential as jest.Mock).mockRejectedValue({ code: 'auth/wrong-password' });

    const { result } = await renderHook(() => useChangePassword('test@test.com'));
    
    await act(async () => {
      result.current.setCurrentPass('oldpass');
      result.current.setNewPass('newpass');
      result.current.setConfirmPass('newpass');
    });

    await act(async () => {
      await result.current.handleChangePassword();
    });

    expect(result.current.passError).toBe('Current password is incorrect.');
  });
});
