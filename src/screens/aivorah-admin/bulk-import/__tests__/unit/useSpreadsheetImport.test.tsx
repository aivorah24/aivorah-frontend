import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSpreadsheetImport } from '../../hooks/useSpreadsheetImport';

jest.mock('../../../map-to-teacher/services/mapToTeacherService', () => ({
  fetchAdminSchools: jest.fn(async () => [{ id: 'sch1', name: 'TSRA', curriculum: 'IB' }, { id: 'sch3', name: 'Blank', curriculum: null }]),
}));
jest.mock('../../services/bulkImportService', () => ({ importSpreadsheet: jest.fn() }));
import { importSpreadsheet } from '../../services/bulkImportService';

const GRID = [
  ['Student Name', 'Email', 'Grade', 'Section', 'Favourite colour'],
  ['Asha Rao', 'asha@s.test', 'PYP 4', 'A', 'blue'],
  ['', 'nobody@s.test', '5', '', 'red'],
  ['Ben', 'asha@s.test', '6', 'B', ''],
];

beforeEach(() => jest.clearAllMocks());

test('loads schools, auto-maps headers, and sends only the rows that passed review', async () => {
  (importSpreadsheet as jest.Mock).mockResolvedValueOnce({ school: 'TSRA', created: 1, skipped: [], errors: [], credentials: [] });
  const { result } = await renderHook(() => useSpreadsheetImport());
  await waitFor(() => expect(result.current.schools).toHaveLength(2));

  await act(async () => { result.current.setSchoolId('sch1'); });
  await act(async () => { result.current.loadGrid(GRID, 'g4.xlsx'); });

  expect(result.current.columnMap).toEqual(['studentName', 'studentEmail', 'grade', 'section', '']);
  expect(result.current.reviewed.map((r) => r.issues.length > 0)).toEqual([false, true, true]); // no name; duplicate email
  expect(result.current.readyRows).toHaveLength(1);

  await act(async () => { await result.current.submit(); });
  expect(importSpreadsheet).toHaveBeenCalledWith({
    schoolId: 'sch1', fileName: 'g4.xlsx',
    rows: [expect.objectContaining({ studentName: 'Asha Rao', studentEmail: 'asha@s.test', grade: 'Grade 4', section: 'A' })],
  });
  expect(result.current.result?.created).toBe(1);
});

test('remapping a column moves the field off its old column, and import needs a school + Student Name', async () => {
  const { result } = await renderHook(() => useSpreadsheetImport());
  await act(async () => { result.current.loadGrid(GRID, 'x.csv'); });

  await act(async () => { result.current.setColumnField(4, 'studentName'); });
  expect(result.current.columnMap).toEqual(['', 'studentEmail', 'grade', 'section', 'studentName']);

  await act(async () => { await result.current.submit(); });
  expect(result.current.submitError).toBe('Choose a school first.');

  await act(async () => { result.current.setColumnField(4, ''); result.current.setSchoolId('sch1'); });
  await act(async () => { await result.current.submit(); });
  expect(result.current.submitError).toBe('Map a column to Student Name.');
  expect(importSpreadsheet).not.toHaveBeenCalled();
});

test('a Curriculum column is never mapped, only checked against the school, and the mapping card collapses once matched', async () => {
  (importSpreadsheet as jest.Mock).mockResolvedValueOnce({ school: 'TSRA', created: 1, skipped: [], errors: [], credentials: [] });
  const { result } = await renderHook(() => useSpreadsheetImport());
  await waitFor(() => expect(result.current.schools).toHaveLength(2));
  await act(async () => { result.current.setSchoolId('sch1'); });
  await act(async () => { result.current.loadGrid([['Student Name', 'Grade', 'Curriculum'], ['Asha', '4', 'CBSE']], 'c.csv'); });

  expect(result.current.columnMap).toEqual(['studentName', 'grade', '']);
  expect(result.current.columnsOpen).toBe(false);
  expect(result.current.reviewed[0].warnings).toContain('Spreadsheet says CBSE — will use IB PYP');
  expect(result.current.readyRows).toHaveLength(1);

  await act(async () => { await result.current.submit(); });
  const sent = (importSpreadsheet as jest.Mock).mock.calls[0][0].rows[0];
  expect(sent).not.toHaveProperty('curriculum');

  await act(async () => { result.current.setEditingColumns(true); });
  expect(result.current.columnsOpen).toBe(true);
});

test('the mapping card is open when Student Name could not be matched', async () => {
  const { result } = await renderHook(() => useSpreadsheetImport());
  await act(async () => { result.current.loadGrid([['Who', 'Grade'], ['Asha', '4']], 'x.csv'); });
  expect(result.current.nameMapped).toBe(false);
  expect(result.current.columnsOpen).toBe(true);
});

test('a school with no curriculum needs one chosen; it drives review and is sent once (only then)', async () => {
  (importSpreadsheet as jest.Mock).mockResolvedValueOnce({ school: 'Blank', created: 1, skipped: [], errors: [], credentials: [] });
  const { result } = await renderHook(() => useSpreadsheetImport());
  await waitFor(() => expect(result.current.schools).toHaveLength(2));
  await act(async () => { result.current.setSchoolId('sch3'); result.current.loadGrid([['Student Name', 'Grade'], ['Asha', '12']], 'b.csv'); });
  expect(result.current.needsBoard).toBe(true);
  expect(result.current.reviewed[0].curriculum).toBeNull();

  await act(async () => { await result.current.submit(); });
  expect(result.current.submitError).toBe('Choose a curriculum for this school.');
  expect(importSpreadsheet).not.toHaveBeenCalled();

  await act(async () => { result.current.setChosenBoard('IB'); });
  expect(result.current.reviewed[0].curriculum).toBe('IB DP');
  await act(async () => { await result.current.submit(); });
  expect(importSpreadsheet).toHaveBeenCalledWith(expect.objectContaining({ schoolId: 'sch3', curriculum: 'IB' }));

  // switching school clears the pick; a school with a curriculum never sends one
  await act(async () => { result.current.reset(); result.current.setSchoolId('sch1'); });
  expect(result.current.chosenBoard).toBe('');
  expect(result.current.needsBoard).toBe(false);
});

test('a file with only a header row, or over 500 rows, is rejected with a clear message', async () => {
  const { result } = await renderHook(() => useSpreadsheetImport());
  await act(async () => { result.current.loadGrid([['Student Name']], 'empty.csv'); });
  expect(result.current.fileError).toMatch(/no student rows/);

  const big = [['Student Name'], ...Array.from({ length: 501 }, (_, i) => [`S${i}`])];
  await act(async () => { result.current.loadGrid(big, 'big.csv'); });
  expect(result.current.fileError).toMatch(/at most 500/);
  expect(result.current.headers).toEqual([]);
});

test('a failed import keeps the review on screen with the server message', async () => {
  (importSpreadsheet as jest.Mock).mockRejectedValueOnce(new Error('School not found'));
  const { result } = await renderHook(() => useSpreadsheetImport());
  await act(async () => { result.current.setSchoolId('sch1'); result.current.loadGrid(GRID, 'g.xlsx'); });
  await act(async () => { await result.current.submit(); });
  expect(result.current.submitError).toBe('School not found');
  expect(result.current.result).toBeNull();
  expect(result.current.headers).toHaveLength(5);
});
