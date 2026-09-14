import { renderHook, waitFor } from '@testing-library/react-native';
import { useParentProfileData } from '../../hooks/useParentProfileData';
import { syncUser, fetchChildrenActivity } from '../../services/parentProfileService';

jest.mock('../../services/parentProfileService');

// Mock useFocusEffect from @react-navigation/native - captures every registered
// callback (there are two: profile refresh, activity refresh) and invokes each
// once immediately, like the real hook firing on initial focus. Tests that need
// to simulate a LATER focus event (returning to an already-mounted screen) can
// re-invoke everything in focusCallbacks directly.
const focusCallbacks: Array<() => void> = [];
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback: () => void) => {
    focusCallbacks.push(callback);
    callback();
  }),
}));

describe('useParentProfileData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    focusCallbacks.length = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches profile data and children activity on mount', async () => {
    (syncUser as jest.Mock).mockResolvedValue({ phone: '123', location: 'City' });
    (fetchChildrenActivity as jest.Mock).mockResolvedValue({
      children: [{ id: '1' }],
      weeklyActivity: [10, 20, 30, 40, 50, 60, 70],
    });

    const { result } = await renderHook(() => useParentProfileData('user@example.com', 'parent@example.com'));

    await waitFor(() => {
      expect(result.current.phone).toBe('123');
      expect(result.current.city).toBe('City');
      expect(result.current.childrenLoading).toBe(false);
      expect(result.current.children).toEqual([{ id: '1' }]);
      expect(result.current.weeklyActivity).toEqual([10, 20, 30, 40, 50, 60, 70]);
    });

    expect(syncUser).toHaveBeenCalledWith('user@example.com');
    expect(fetchChildrenActivity).toHaveBeenCalledWith('parent@example.com');
  });

  it('handles syncUser error gracefully', async () => {
    (syncUser as jest.Mock).mockRejectedValue(new Error('error'));
    (fetchChildrenActivity as jest.Mock).mockResolvedValue({
      children: [],
      weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    });

    const { result } = await renderHook(() => useParentProfileData('user@example.com', 'parent@example.com'));

    await waitFor(() => {
      expect(result.current.phone).toBe('');
      expect(result.current.city).toBe('');
      expect(result.current.childrenLoading).toBe(false);
    });
  });

  it('handles fetchChildrenActivity error gracefully', async () => {
    (syncUser as jest.Mock).mockResolvedValue({});
    (fetchChildrenActivity as jest.Mock).mockRejectedValue(new Error('error'));

    const { result } = await renderHook(() => useParentProfileData('user@example.com', 'parent@example.com'));

    await waitFor(() => {
      expect(result.current.childrenLoading).toBe(false);
      expect(result.current.children).toEqual([]);
    });
  });

  it('refreshes data on interval', async () => {
    (syncUser as jest.Mock).mockResolvedValue({});
    (fetchChildrenActivity as jest.Mock).mockResolvedValue({
      children: [],
      weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    });

    await renderHook(() => useParentProfileData('user@example.com', 'parent@example.com'));

    await waitFor(() => {
      expect(fetchChildrenActivity).toHaveBeenCalled(); // 1 mount + 1 focus effect
    });

    jest.advanceTimersByTime(15000);

    await waitFor(() => {
      expect(fetchChildrenActivity).toHaveBeenCalled();
    });
  });

  // Regression test: location/phone changed on another screen (e.g. Settings)
  // must show up here on return, without needing this screen to fully remount.
  it('refreshes city and phone when the screen regains focus, not just on mount', async () => {
    (syncUser as jest.Mock).mockResolvedValue({ phone: '111', location: 'Old City' });
    (fetchChildrenActivity as jest.Mock).mockResolvedValue({ children: [], weeklyActivity: [0, 0, 0, 0, 0, 0, 0] });

    const { result } = await renderHook(() => useParentProfileData('user@example.com', 'parent@example.com'));

    await waitFor(() => {
      expect(result.current.city).toBe('Old City');
      expect(result.current.phone).toBe('111');
    });

    // Location/phone updated elsewhere (e.g. Settings), then the user navigates
    // back to this already-mounted Profile screen - simulate the resulting focus event.
    (syncUser as jest.Mock).mockResolvedValue({ phone: '222', location: 'New City' });
    focusCallbacks.forEach(cb => cb());

    await waitFor(() => {
      expect(result.current.city).toBe('New City');
      expect(result.current.phone).toBe('222');
    });
  });
});
