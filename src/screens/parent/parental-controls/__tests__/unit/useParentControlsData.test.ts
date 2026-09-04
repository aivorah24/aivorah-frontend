import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useParentControlsData } from '../../hooks/useParentControlsData';
import * as parentControlsService from '../../services/parentControlsService';

jest.mock('../../services/parentControlsService');

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const CHILD = { id: 'c1', name: 'Kid', email: 'kid@test.com', grade: 'Grade 4', studyTimeMinutes: 0 };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}

describe('useParentControlsData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads children and auto-selects + loads the first child\'s screen-time controls', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({
      isEnabled: true, dailyLimitMinutes: 45,
    });

    const { result } = await renderHook(() => useParentControlsData('parent@test.com', jest.fn()));

    await waitFor(() => {
      expect(result.current.children).toEqual([CHILD]);
      expect(result.current.selectedChild).toEqual(CHILD);
    });

    await waitFor(() => {
      expect(result.current.ctrl.isEnabled).toBe(true);
      expect(result.current.ctrl.dailyLimitMinutes).toBe(45);
    });

    expect(parentControlsService.fetchScreenTime).toHaveBeenCalledWith('parent@test.com', 'c1');
  });

  // Regression test for a real bug found via E2E testing (2026-09-03): the
  // initial screen-time GET can resolve AFTER the user has already toggled
  // a control. Since that GET result is applied unconditionally, it used to
  // silently revert the user's live edit back to the old server value - and
  // because reverting also changes `ctrl`, it re-triggered the debounced
  // auto-save, writing the STALE value back to the server too.
  it('a live user edit is not clobbered by a slow-resolving initial fetch', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    const initialFetch = deferred<any>();
    (parentControlsService.fetchScreenTime as jest.Mock).mockReturnValue(initialFetch.promise);

    const { result } = await renderHook(() => useParentControlsData('parent@test.com', jest.fn()));

    await waitFor(() => expect(result.current.selectedChild).toEqual(CHILD));
    // Initial fetch is still in flight (never resolved yet) - ctrl is still
    // the hook's disabled default.
    expect(result.current.ctrl.isEnabled).toBe(false);

    // User toggles the control before the slow initial fetch has resolved.
    await act(async () => {
      result.current.set({ isEnabled: true });
    });
    expect(result.current.ctrl.isEnabled).toBe(true);

    // The slow initial fetch NOW resolves, with old/disabled server data.
    await act(async () => {
      initialFetch.resolve({ isEnabled: false, dailyLimitMinutes: 60 });
    });

    // The user's live edit must survive - it must NOT be reverted.
    expect(result.current.ctrl.isEnabled).toBe(true);
  });

  it('saveSettings posts the current controls and calls onSaved on success', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ isEnabled: false });
    (parentControlsService.saveScreenTime as jest.Mock).mockResolvedValue({ success: true });
    const onSaved = jest.fn();

    const { result } = await renderHook(() => useParentControlsData('parent@test.com', onSaved));
    await waitFor(() => expect(result.current.selectedChild).toEqual(CHILD));

    let error: string | null = null;
    await act(async () => {
      error = await result.current.saveSettings();
    });

    expect(error).toBeNull();
    expect(onSaved).toHaveBeenCalled();
    expect(parentControlsService.saveScreenTime).toHaveBeenCalledWith('parent@test.com', 'c1', expect.any(Object));
  });

  it('saveSettings returns the server error and does not call onSaved on failure', async () => {
    (parentControlsService.fetchChildren as jest.Mock).mockResolvedValue([CHILD]);
    (parentControlsService.fetchScreenTime as jest.Mock).mockResolvedValue({ isEnabled: false });
    (parentControlsService.saveScreenTime as jest.Mock).mockResolvedValue({ success: false, error: 'Failed to save' });
    const onSaved = jest.fn();

    const { result } = await renderHook(() => useParentControlsData('parent@test.com', onSaved));
    await waitFor(() => expect(result.current.selectedChild).toEqual(CHILD));

    let error: string | null = null;
    await act(async () => {
      error = await result.current.saveSettings();
    });

    expect(error).toBe('Failed to save');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
