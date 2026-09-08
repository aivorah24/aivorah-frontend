import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useParentChallenges } from '../../hooks/useParentChallenges';
import * as parentChallengesService from '../../services/parentChallengesService';

jest.mock('../../services/parentChallengesService', () => ({
  __esModule: true,
  fetchChildren: jest.fn(),
  fetchChildStats: jest.fn(),
  fetchChallenges: jest.fn(),
}));

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args: any[]) => mockUseFocusEffect(...args),
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@test.com' } }),
}));

describe('useParentChallenges', () => {
  let mockedService = parentChallengesService as jest.Mocked<typeof parentChallengesService>;
  const mockChild = { id: 'c1', name: 'Kid 1', curriculum: 'CBSE', grade: 'Grade 5' };
  const mockChild2 = { id: 'c2', name: 'Kid 2', grade: 'Grade 3' };
  let currentUnmount: (() => void) | null = null;

  beforeEach(() => {
    jest.resetAllMocks();
    // useFocusEffect just needs to invoke the callback once, like on mount.
    mockUseFocusEffect.mockImplementation((cb: any) => cb());
    mockedService.fetchChildren.mockResolvedValue([mockChild, mockChild2]);
    mockedService.fetchChildStats.mockResolvedValue({ xpPoints: 100, challengesCompleted: 2, currentStreak: 3 });
    mockedService.fetchChallenges.mockResolvedValue([
      { id: 'ch1', type: 'school_challenge', category: 'School Challenges' } as any,
      { id: 'ch2', type: 'olympiad', category: 'Olympiad' } as any,
      { id: 'ch3', type: 'advanced_practice', category: 'Advanced Practice' } as any,
      { id: 'ch4', type: 'pattern_challenge', category: 'Pattern Challenge' } as any,
    ]);
  });

  afterEach(() => {
    if (currentUnmount) currentUnmount();
    currentUnmount = null;
  });

  const renderAndSettle = async () => {
    const { result, unmount } = await renderHook(() => useParentChallenges());
    currentUnmount = unmount;
    await waitFor(() => expect(result.current.loadingCh).toBe(false));
    return { result, unmount };
  };

  it('loads children, stats, and challenges for the first child', async () => {
    const { result } = await renderAndSettle();
    expect(result.current.children).toEqual([mockChild, mockChild2]);
    expect(result.current.child).toEqual(mockChild);
    expect(result.current.childStats).toEqual({ xpPoints: 100, challengesCompleted: 2, currentStreak: 3 });
    expect(result.current.challenges).toHaveLength(4);
  });

  it('groups challenges by category, one group per distinct category', async () => {
    const { result } = await renderAndSettle();
    expect(result.current.challengeGroups).toHaveLength(4);
    expect(result.current.challengeGroups.map(g => g.label)).toEqual([
      'School Challenges', 'Olympiad', 'Advanced Practice', 'Pattern Challenge',
    ]);
  });

  it('does not drop challenges whose type is outside the legacy three-type set', async () => {
    mockedService.fetchChallenges.mockResolvedValue([
      { id: 'ch-new', type: 'real_world_application', category: 'Real-World Application' } as any,
    ]);
    const { result, unmount } = await renderHook(() => useParentChallenges());
    currentUnmount = unmount;
    await waitFor(() => expect(result.current.loadingCh).toBe(false));
    expect(result.current.challengeGroups).toEqual([
      { key: 'Real-World Application', label: 'Real-World Application', items: [{ id: 'ch-new', type: 'real_world_application', category: 'Real-World Application' }] },
    ]);
  });

  it('switches child on setSelectedIdx and refetches', async () => {
    const { result } = await renderAndSettle();
    mockedService.fetchChildStats.mockResolvedValueOnce({ xpPoints: 5, challengesCompleted: 0, currentStreak: 0 });
    await act(async () => {
      result.current.setSelectedIdx(1);
    });
    await waitFor(() => expect(result.current.child).toEqual(mockChild2));
  });

  it('handles no linked children', async () => {
    mockedService.fetchChildren.mockResolvedValueOnce([]);
    const { result, unmount } = await renderHook(() => useParentChallenges());
    currentUnmount = unmount;
    await waitFor(() => expect(result.current.loadingCh).toBe(false));
    expect(result.current.child).toBeNull();
    expect(result.current.challenges).toEqual([]);
  });

  it('refresh() re-fetches challenges and stats', async () => {
    const { result } = await renderAndSettle();
    const callsBefore = mockedService.fetchChallenges.mock.calls.length;
    await act(async () => {
      result.current.refresh();
    });
    expect(mockedService.fetchChallenges.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('clears the 30s poll interval on unmount (useFocusEffect cleanup)', async () => {
    // The real jest.mock above only invokes the useFocusEffect callback,
    // never its returned cleanup - unmount() alone can't reach it. Capture
    // the cleanup ourselves and call it directly, matching what React
    // Navigation actually does when the screen loses focus/unmounts.
    let capturedCleanup: (() => void) | undefined;
    mockUseFocusEffect.mockImplementation((cb: any) => { capturedCleanup = cb(); });
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { result, unmount } = await renderHook(() => useParentChallenges());
    currentUnmount = unmount;
    await waitFor(() => expect(result.current.loadingCh).toBe(false));

    capturedCleanup?.();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
