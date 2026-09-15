import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useDailyTasks } from '../../hooks/useDailyTasks';
import * as dailyTasksService from '../../services/dailyTasksService';

jest.mock('../../services/dailyTasksService');

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

describe('useDailyTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads children and auto-selects + loads the first child\'s tasks', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockResolvedValue([{ id: 'c1', name: 'Kid' }]);
    (dailyTasksService.fetchTasks as jest.Mock).mockResolvedValue([{ id: 't1', label: 'Read', coins: 5 }]);

    const { result } = await renderHook(() => useDailyTasks('parent@test.com'));

    await waitFor(() => {
      expect(result.current.loadingChildren).toBe(false);
      expect(result.current.children).toEqual([{ id: 'c1', name: 'Kid' }]);
      expect(result.current.selectedChild).toEqual({ id: 'c1', name: 'Kid' });
    });

    await waitFor(() => {
      expect(result.current.tasks).toEqual([{ id: 't1', label: 'Read', coins: 5 }]);
    });

    expect(dailyTasksService.fetchChildren).toHaveBeenCalledWith('parent@test.com');
    expect(dailyTasksService.fetchTasks).toHaveBeenCalledWith('c1');
  });

  it('handles fetchChildren failure gracefully', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockRejectedValue(new Error('network'));

    const { result } = await renderHook(() => useDailyTasks('parent@test.com'));

    await waitFor(() => {
      expect(result.current.loadingChildren).toBe(false);
      expect(result.current.children).toEqual([]);
    });
  });

  it('addTask requires a selected child and a non-empty label', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useDailyTasks('parent@test.com'));
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.addTask('', 'star', '5');
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('Please enter a task description.');

    await act(async () => {
      ok = await result.current.addTask('Read', 'star', '5');
    });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('Select a child first.');
  });

  it('addTask creates a task and prepends it to the list', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockResolvedValue([{ id: 'c1', name: 'Kid' }]);
    (dailyTasksService.fetchTasks as jest.Mock).mockResolvedValue([]);
    (dailyTasksService.createTask as jest.Mock).mockResolvedValue({ id: 't1', label: 'Read', coins: 5 });

    const { result } = await renderHook(() => useDailyTasks('parent@test.com'));
    await waitFor(() => expect(result.current.selectedChild).toEqual({ id: 'c1', name: 'Kid' }));

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.addTask('Read', 'book-open', '5');
    });

    expect(ok).toBe(true);
    expect(dailyTasksService.createTask).toHaveBeenCalledWith({
      parentEmail: 'parent@test.com', childId: 'c1', childName: 'Kid', grade: undefined, curriculum: undefined,
      label: 'Read', icon: 'book-open', coins: 5,
    });
    expect(result.current.tasks).toEqual([{ id: 't1', label: 'Read', coins: 5 }]);
  });

  it('removeTask optimistically removes then reverts on failure', async () => {
    (dailyTasksService.fetchChildren as jest.Mock).mockResolvedValue([{ id: 'c1', name: 'Kid' }]);
    (dailyTasksService.fetchTasks as jest.Mock).mockResolvedValue([{ id: 't1', label: 'Read', coins: 5 }]);
    (dailyTasksService.deleteTask as jest.Mock).mockRejectedValue(new Error('fail'));

    const { result } = await renderHook(() => useDailyTasks('parent@test.com'));
    await waitFor(() => expect(result.current.tasks).toEqual([{ id: 't1', label: 'Read', coins: 5 }]));

    await act(async () => {
      await result.current.removeTask('t1');
    });

    // Reverted back after the failed delete.
    expect(result.current.tasks).toEqual([{ id: 't1', label: 'Read', coins: 5 }]);
  });
});
