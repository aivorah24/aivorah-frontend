import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useImportHistory } from '../../hooks/useImportHistory';
import * as importHistoryService from '../../services/importHistoryService';

jest.mock('../../services/importHistoryService', () => ({
  __esModule: true,
  fetchImportHistory: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []),
}));

const mockedService = importHistoryService as jest.Mocked<typeof importHistoryService>;
const RUNS = [{ id: '1', type: 'students' as const, fileName: 'a.csv', runByEmail: 'a@x.com', importedCount: 5, skippedCount: 1, status: 'Completed with errors', createdAt: '2026-01-01' }];

describe('useImportHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads runs on focus', async () => {
    mockedService.fetchImportHistory.mockResolvedValue(RUNS);
    const { result } = await renderHook(() => useImportHistory('admin@x.com'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.runs).toEqual(RUNS);
    expect(result.current.error).toBe('');
  });

  it('sets an error message when the fetch fails', async () => {
    mockedService.fetchImportHistory.mockRejectedValue(new Error('boom'));
    const { result } = await renderHook(() => useImportHistory('admin@x.com'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.runs).toEqual([]);
  });

  it('does not fetch when adminEmail is missing', async () => {
    await renderHook(() => useImportHistory(undefined));
    expect(mockedService.fetchImportHistory).not.toHaveBeenCalled();
  });

  it('selected/setSelected controls the detail modal target', async () => {
    mockedService.fetchImportHistory.mockResolvedValue(RUNS);
    const { result } = await renderHook(() => useImportHistory('admin@x.com'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.setSelected(RUNS[0]));
    expect(result.current.selected).toEqual(RUNS[0]);

    await act(async () => result.current.setSelected(null));
    expect(result.current.selected).toBeNull();
  });

  it('retry re-fetches and resets loading', async () => {
    mockedService.fetchImportHistory.mockResolvedValue(RUNS);
    const { result } = await renderHook(() => useImportHistory('admin@x.com'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.retry());
    await waitFor(() => expect(mockedService.fetchImportHistory).toHaveBeenCalledTimes(2));
  });
});
