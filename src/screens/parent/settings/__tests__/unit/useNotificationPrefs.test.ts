import { renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotificationPrefs } from '../../hooks/useNotificationPrefs';

describe('useNotificationPrefs', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('defaults every preference to true when nothing is stored', async () => {
    const { result } = await renderHook(() => useNotificationPrefs('p@test.com'));
    expect(result.current.prefs.assignmentAlerts).toBe(true);
    expect(result.current.prefs.teacherMessages).toBe(true);
    expect(result.current.prefs.challengeUpdates).toBe(true);
  });

  it('loads saved prefs for the given email on mount', async () => {
    await AsyncStorage.setItem('notifPrefs_p@test.com', JSON.stringify({ assignmentAlerts: false }));
    const { result } = await renderHook(() => useNotificationPrefs('p@test.com'));
    await waitFor(() => expect(result.current.prefs.assignmentAlerts).toBe(false));
    expect(result.current.prefs.teacherMessages).toBe(true);
  });

  it('setPref updates state and persists to AsyncStorage keyed by email', async () => {
    const { result } = await renderHook(() => useNotificationPrefs('p@test.com'));

    await act(async () => {
      result.current.setPref('teacherMessages', false);
    });

    expect(result.current.prefs.teacherMessages).toBe(false);
    const raw = await AsyncStorage.getItem('notifPrefs_p@test.com');
    expect(JSON.parse(raw!).teacherMessages).toBe(false);
  });

  it('scopes the storage key to "guest" when no email is given', async () => {
    const { result } = await renderHook(() => useNotificationPrefs(undefined));
    await act(async () => {
      result.current.setPref('challengeUpdates', false);
    });
    expect(await AsyncStorage.getItem('notifPrefs_guest')).toBeTruthy();
  });
});
