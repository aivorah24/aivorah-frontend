import { renderHook, waitFor } from '@testing-library/react-native';
import { useParentProfileData } from '../../hooks/useParentProfileData';
import { syncUser, fetchChildrenActivity } from '../../services/parentProfileService';

jest.mock('../../services/parentProfileService');

// Mock useFocusEffect from @react-navigation/native to just call the callback
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
}));

describe('useParentProfileData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
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
});
