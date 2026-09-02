import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useParentAIProgressReport } from '../../hooks/useParentAIProgressReport';
import * as parentAIProgressReportService from '../../services/parentAIProgressReportService';

jest.mock('../../services/parentAIProgressReportService', () => ({
  __esModule: true,
  fetchChildren: jest.fn(),
  generateAIReport: jest.fn(),
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@test.com' } }),
}));

describe('useParentAIProgressReport', () => {
  const mockedService = parentAIProgressReportService as jest.Mocked<typeof parentAIProgressReportService>;
  const child1 = { id: 'c1', name: 'Kid 1', grade: 'Grade 5' };
  const child2 = { id: 'c2', name: 'Kid 2', grade: 'Grade 3' };
  const report = { student: { name: 'Kid 1' }, metrics: { xp: 100 }, report: {}, generatedAt: '2026-09-02T00:00:00.000Z' };

  beforeEach(() => {
    jest.resetAllMocks();
    mockedService.fetchChildren.mockResolvedValue([child1, child2]);
    mockedService.generateAIReport.mockResolvedValue(report);
  });

  it('loads children and selects the first one by default', async () => {
    const { result } = await renderHook(() => useParentAIProgressReport());
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));

    expect(result.current.children).toEqual([child1, child2]);
    expect(result.current.selectedChild).toEqual(child1);
    expect(result.current.reportData).toBeNull();
    expect(mockedService.generateAIReport).not.toHaveBeenCalled();
  });

  it('selects the matching child and auto-generates when an incomingChildId is passed', async () => {
    const { result } = await renderHook(() => useParentAIProgressReport('c2'));
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));

    expect(result.current.selectedChild).toEqual(child2);
    await waitFor(() => expect(result.current.loadingReport).toBe(false));
    expect(mockedService.generateAIReport).toHaveBeenCalledWith('parent@test.com', 'c2');
    expect(result.current.reportData).toEqual(report);
  });

  it('falls back to the first child when incomingChildId does not match any linked child', async () => {
    const { result } = await renderHook(() => useParentAIProgressReport('unknown-id'));
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));
    expect(result.current.selectedChild).toEqual(child1);
  });

  it('leaves selectedChild null when the parent has no linked children', async () => {
    mockedService.fetchChildren.mockResolvedValueOnce([]);
    const { result } = await renderHook(() => useParentAIProgressReport());
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));
    expect(result.current.children).toEqual([]);
    expect(result.current.selectedChild).toBeNull();
  });

  it('swallows a fetchChildren failure and still stops loading', async () => {
    mockedService.fetchChildren.mockRejectedValueOnce(new Error('network down'));
    const { result } = await renderHook(() => useParentAIProgressReport());
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));
    expect(result.current.children).toEqual([]);
  });

  it('generateReport sets the selected child, populates reportData, and clears loading', async () => {
    const { result } = await renderHook(() => useParentAIProgressReport());
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));

    await act(async () => {
      result.current.generateReport(child2);
    });

    expect(mockedService.generateAIReport).toHaveBeenCalledWith('parent@test.com', 'c2');
    expect(result.current.selectedChild).toEqual(child2);
    expect(result.current.reportData).toEqual(report);
    expect(result.current.loadingReport).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('generateReport surfaces the error message and clears reportData on failure', async () => {
    mockedService.generateAIReport.mockRejectedValueOnce(new Error('model_not_found'));
    const { result } = await renderHook(() => useParentAIProgressReport());
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));

    await act(async () => {
      result.current.generateReport(child1);
    });

    expect(result.current.error).toBe('model_not_found');
    expect(result.current.reportData).toBeNull();
    expect(result.current.loadingReport).toBe(false);
  });

  it('generateReport falls back to a default message when the error has none', async () => {
    mockedService.generateAIReport.mockRejectedValueOnce(new Error());
    const { result } = await renderHook(() => useParentAIProgressReport());
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));

    await act(async () => {
      result.current.generateReport(child1);
    });

    expect(result.current.error).toBe('Could not generate report. Please try again.');
  });

  it('selectChild switches the selected child and resets report/error state', async () => {
    mockedService.generateAIReport.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useParentAIProgressReport());
    await waitFor(() => expect(result.current.loadingChildren).toBe(false));

    await act(async () => {
      result.current.generateReport(child1);
    });
    expect(result.current.error).toBe('boom');

    await act(async () => {
      result.current.selectChild(child2);
    });

    expect(result.current.selectedChild).toEqual(child2);
    expect(result.current.reportData).toBeNull();
    expect(result.current.error).toBe('');
  });
});
