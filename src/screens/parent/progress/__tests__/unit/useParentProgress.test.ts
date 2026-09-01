import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useParentProgress } from '../../hooks/useParentProgress';
import * as parentProgressService from '../../services/parentProgressService';

jest.mock('../../services/parentProgressService', () => ({
  __esModule: true,
  fetchChildren: jest.fn(),
  fetchProgressData: jest.fn(),
}));

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args: any[]) => mockUseFocusEffect(...args),
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@test.com' } }),
}));

describe('useParentProgress', () => {
  let mockedService = parentProgressService as jest.Mocked<typeof parentProgressService>;
  const mockChild = { id: 'c1', name: 'Kid 1', curriculum: 'CBSE', grade: 'Grade 5' };
  const mockChild2 = { id: 'c2', name: 'Kid 2' };
  let currentUnmount: (() => void) | null = null;

  beforeEach(() => {
    jest.resetAllMocks(); // Use resetAllMocks so implementations don't leak!
    mockedService.fetchChildren.mockResolvedValue([mockChild, mockChild2]);
    mockedService.fetchProgressData.mockResolvedValue({
      stats: { xpPoints: 100 },
      weekly: [10, 20, 30, 0, 0, 0, 0],
      practiceInsights: { topics: [] }
    });
  });

  afterEach(() => {
    if (currentUnmount) currentUnmount();
    currentUnmount = null;
  });

  const renderAndSettle = async (routeParams?: any) => {
    const { result, unmount } = await renderHook(() => useParentProgress({ params: routeParams }));
    currentUnmount = unmount;
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    return { result, unmount };
  };

  it('loads children and fetches progress data for first child', async () => {
    const { result } = await renderAndSettle();
    expect(result.current.children).toEqual([mockChild, mockChild2]);
    expect(result.current.selectedIdx).toBe(0);
    expect(result.current.child).toEqual(mockChild);
    expect(result.current.stats).toEqual({ xpPoints: 100 });
    expect(result.current.weekly).toEqual([10, 20, 30, 0, 0, 0, 0]);
  });

  it('selects specific child from route params', async () => {
    const { result } = await renderAndSettle({ childId: 'c2' });
    expect(result.current.selectedIdx).toBe(1);
    expect(result.current.child).toEqual(mockChild2);
  });

  it('sets loading to false when no children exist', async () => {
    mockedService.fetchChildren.mockResolvedValueOnce([]);
    const { result, unmount } = await renderHook(() => useParentProgress({}));
    currentUnmount = unmount;
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.children).toEqual([]);
    expect(result.current.child).toBeUndefined();
  });

  it('handles fetchProgressData error gracefully', async () => {
    mockedService.fetchProgressData.mockRejectedValueOnce(new Error('Network Error'));
    const { result } = await renderAndSettle();
    expect(result.current.stats).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('updates child when selectedIdx changes', async () => {
    const { result } = await renderAndSettle();
    await act(async () => {
      result.current.setSelectedIdx(1);
    });
    // Wait for the new fetch to resolve
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.selectedIdx).toBe(1);
    expect(result.current.child).toEqual(mockChild2);
  });

  it('refreshes data when setRefreshing is called', async () => {
    const { result } = await renderAndSettle();
    await act(async () => {
      result.current.setRefreshing(true);
      await result.current.fetchData();
    });
    expect(result.current.refreshing).toBe(false);
    expect(mockedService.fetchProgressData).toHaveBeenCalledTimes(2);
  });
});
