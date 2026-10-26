import React from 'react';
import { Platform } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTimetableState } from '../../hooks/useTimetableState';
import { fetchClasses, fetchTimetable, saveSlot, saveTemplate } from '../../services/timetableApi';
import { downloadTimetablePdf } from '../../utils/timetablePdf';

jest.mock('../../services/timetableApi', () => ({
  fetchClasses: jest.fn(), fetchTimetable: jest.fn(), saveSlot: jest.fn(), saveTemplate: jest.fn(),
}));
jest.mock('../../utils/timetablePdf', () => ({ downloadTimetablePdf: jest.fn() }));

const mockFetchClasses = fetchClasses as jest.Mock;
const mockFetchTimetable = fetchTimetable as jest.Mock;
const mockSaveSlot = saveSlot as jest.Mock;
const mockSaveTemplate = saveTemplate as jest.Mock;
const mockDownloadPdf = downloadTimetablePdf as jest.Mock;

const MY_CLASS = { grade: 'Grade 4', section: 'A', label: 'Grade 4 A', homeroom: true };
const classes = (list: unknown[], grades: unknown[] = [], curriculum: string | null = null) => ({ classes: list, grades, curriculum });
const TT = { grade: 'Grade 4', section: 'A', title: '', periodDefs: [{ code: 'P1', start: '08:50', end: '09:40', isBreak: false }], days: ['MON'], slots: [], permissions: { canManageTemplate: true, canEditSlot: true } };

let hookRef: ReturnType<typeof useTimetableState>;

function Harness(params: Parameters<typeof useTimetableState>[0]) {
  const h = useTimetableState(params);
  React.useEffect(() => { hookRef = h; });
  return <Text testID="loading">{String(h.loading)}</Text>;
}

async function renderHarness(overrides: Partial<Parameters<typeof useTimetableState>[0]> = {}) {
  const params = { role: 'school_admin', school: 'Test School', userName: 'Admin User', paramClass: null, ...overrides };
  render(<Harness {...params} />);
  await waitFor(() => expect(hookRef).toBeDefined());
  return params;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchClasses.mockResolvedValue(classes([]));
});

describe('useTimetableState', () => {
  test('isAdmin is true for school_admin and super_admin, false otherwise', async () => {
    await renderHarness({ role: 'school_admin' });
    expect(hookRef.isAdmin).toBe(true);

    await renderHarness({ role: 'super_admin' });
    expect(hookRef.isAdmin).toBe(true);

    await renderHarness({ role: 'teacher' });
    expect(hookRef.isAdmin).toBe(false);
  });

  test('loadClasses (admin) keeps the grade picker and preselects the first class', async () => {
    mockFetchClasses.mockResolvedValue(classes(
      [{ grade: 'Grade 4', section: 'A', label: 'Grade 4 A' }, { grade: 'Grade 4', section: 'B', label: 'Grade 4 B' }],
      [{ name: 'Grade 4', sections: ['A', 'B'] }], 'IB',
    ));
    await renderHarness({ role: 'school_admin' });

    await act(async () => hookRef.loadClasses());

    expect(hookRef.classes).toHaveLength(2);
    expect(hookRef.structure).toEqual([{ name: 'Grade 4', sections: ['A', 'B'] }]);
    expect(hookRef.selected).toEqual(expect.objectContaining({ grade: 'Grade 4', section: 'A' }));
    expect(hookRef.curriculum).toBe('IB');
  });

  test('loadClasses (teacher) preselects the first class (homeroom first from the server)', async () => {
    mockFetchClasses.mockResolvedValue(classes([MY_CLASS]));
    await renderHarness({ role: 'teacher' });

    await act(async () => hookRef.loadClasses());

    expect(hookRef.classes).toEqual([MY_CLASS]);
    expect(hookRef.selected).toEqual(MY_CLASS);
  });

  test('loadClasses with zero classes clears loading instead of hanging', async () => {
    await renderHarness({ role: 'teacher' });

    await act(async () => hookRef.loadClasses());

    expect(hookRef.classes).toEqual([]);
    expect(hookRef.selected).toBeNull();
    expect(hookRef.loading).toBe(false);
  });

  test('loadClasses does nothing in param mode (a fixed single class)', async () => {
    await renderHarness({ role: 'teacher', paramClass: MY_CLASS });
    await act(async () => hookRef.loadClasses());
    expect(mockFetchClasses).not.toHaveBeenCalled();
  });

  test('loadClasses failure surfaces the error message', async () => {
    mockFetchClasses.mockRejectedValue(new Error('Failed to load classes'));
    await renderHarness({ role: 'teacher' });
    await act(async () => hookRef.loadClasses());
    expect(hookRef.error).toBe('Failed to load classes');
    expect(hookRef.loading).toBe(false);
  });

  test('loadTimetable asks for the class only (no email or school)', async () => {
    mockFetchTimetable.mockResolvedValue(TT);
    await renderHarness();
    await act(async () => hookRef.loadTimetable(MY_CLASS));
    expect(mockFetchTimetable).toHaveBeenCalledWith('Grade 4', 'A');
  });

  test('loadTimetable populates tt and clears loading', async () => {
    mockFetchTimetable.mockResolvedValue(TT);
    await renderHarness();
    await act(async () => hookRef.loadTimetable(MY_CLASS));
    expect(hookRef.tt).toEqual(TT);
    expect(hookRef.loading).toBe(false);
    expect(hookRef.error).toBe('');
  });

  test('loadTimetable failure clears tt and surfaces the error', async () => {
    mockFetchTimetable.mockRejectedValue(new Error('Failed to load timetable'));
    await renderHarness();
    await act(async () => hookRef.loadTimetable(MY_CLASS));
    expect(hookRef.tt).toBeNull();
    expect(hookRef.error).toBe('Failed to load timetable');
  });

  test('setupDefault saves the default period template and reloads', async () => {
    mockSaveTemplate.mockResolvedValue(undefined);
    mockFetchTimetable.mockResolvedValue(TT);
    await renderHarness();
    await act(async () => hookRef.loadClasses());
    await act(async () => hookRef.setSelected(MY_CLASS));

    await act(async () => hookRef.setupDefault());

    expect(mockSaveTemplate).toHaveBeenCalledWith(expect.objectContaining({ grade: 'Grade 4', section: 'A', periodDefs: expect.any(Array) }));
    expect(mockFetchTimetable).toHaveBeenCalled();
  });

  test('onSaveSlot does nothing without an open modal', async () => {
    await renderHarness();
    await act(async () => hookRef.onSaveSlot({ subject: 'Math', room: '', materialUrl: null, materialName: null, color: null }));
    expect(mockSaveSlot).not.toHaveBeenCalled();
  });

  test('onSaveSlot saves, reloads, and closes the modal', async () => {
    mockSaveSlot.mockResolvedValue(undefined);
    mockFetchTimetable.mockResolvedValue(TT);
    await renderHarness();
    await act(async () => hookRef.setSelected(MY_CLASS));
    await act(async () => hookRef.setModal({ day: 'MON', period: { code: 'P1', start: '08:50', end: '09:40', isBreak: false }, slot: null }));

    await act(async () => hookRef.onSaveSlot({ subject: 'Math', room: 'R1', materialUrl: null, materialName: null, color: '#fff' }));

    expect(mockSaveSlot).toHaveBeenCalledWith(expect.objectContaining({ grade: 'Grade 4', section: 'A', day: 'MON', periodCode: 'P1', subject: 'Math', room: 'R1' }));
    expect(hookRef.modal).toBeNull();
  });

  test('onClearSlot clears the slot subject and reloads', async () => {
    mockSaveSlot.mockResolvedValue(undefined);
    mockFetchTimetable.mockResolvedValue(TT);
    await renderHarness();
    await act(async () => hookRef.setSelected(MY_CLASS));
    await act(async () => hookRef.setModal({ day: 'MON', period: { code: 'P1', start: '08:50', end: '09:40', isBreak: false }, slot: null }));

    await act(async () => hookRef.onClearSlot());

    expect(mockSaveSlot).toHaveBeenCalledWith(expect.objectContaining({ subject: '' }));
    expect(hookRef.modal).toBeNull();
  });

  test('downloadPdf is a no-op off the web platform — never touches the PDF util', async () => {
    (Platform as any).OS = 'ios';
    mockFetchTimetable.mockResolvedValue(TT);
    await renderHarness();
    await act(async () => hookRef.setSelected(MY_CLASS));
    await act(async () => hookRef.loadTimetable(MY_CLASS));

    await act(async () => hookRef.downloadPdf());

    expect(mockDownloadPdf).not.toHaveBeenCalled();
    (Platform as any).OS = 'web';
  });

  test('downloadPdf on web calls the PDF util with the loaded timetable and toggles downloading', async () => {
    (Platform as any).OS = 'web';
    mockFetchTimetable.mockResolvedValue(TT);
    mockDownloadPdf.mockResolvedValue(undefined);
    await renderHarness();
    await act(async () => hookRef.setSelected(MY_CLASS));
    await act(async () => hookRef.loadTimetable(MY_CLASS));

    await act(async () => hookRef.downloadPdf());

    expect(mockDownloadPdf).toHaveBeenCalledWith(expect.objectContaining({ tt: TT, classLabel: 'Grade 4 A', schoolName: 'Test School' }));
    expect(hookRef.downloading).toBe(false);
  });

  test('classLabel falls back to "Timetable" when nothing is selected', async () => {
    await renderHarness();
    expect(hookRef.classLabel).toBe('Timetable');
  });
});
