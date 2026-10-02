import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePassageLibrary } from '../../hooks/usePassageLibrary';
import * as api from '../../services/readAloudApi';

jest.mock('../../../../../config/firebase', () => ({ auth: {} }));
jest.mock('../../services/readAloudApi');
const mockApi = api as jest.Mocked<typeof api>;

const LIST = [
  { title: 'Easy One', topic: 'T', level: 'easy', wordCount: 70 },
  { title: 'Hard One', topic: 'T', level: 'hard', wordCount: 150 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.fetchLexile.mockResolvedValue({ lexile: 450, needsCalibration: false });
  mockApi.fetchPassageList.mockResolvedValue(LIST);
});

test('loads the level, then the list sorted for it', async () => {
  const { result } = await renderHook(() => usePassageLibrary('Grade 4'));
  expect(mockApi.fetchLexile).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(result.current.lexile).toBe(450));
  await waitFor(() => expect(mockApi.fetchPassageList).toHaveBeenLastCalledWith('Grade 4', 450));
  await waitFor(() => expect(result.current.passages).toHaveLength(2));
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeNull();
});

test('filters by difficulty', async () => {
  const { result } = await renderHook(() => usePassageLibrary('Grade 4'));
  await waitFor(() => expect(result.current.passages).toHaveLength(2));
  await act(async () => { result.current.setFilter('hard'); });
  expect(result.current.passages.map((p) => p.title)).toEqual(['Hard One']);
  expect(result.current.hasPassages).toBe(true);
});

test('a failed list shows an error and Try again reloads', async () => {
  mockApi.fetchLexile.mockRejectedValue(new Error('offline'));
  mockApi.fetchPassageList.mockRejectedValueOnce(new Error('Service down'));
  const { result } = await renderHook(() => usePassageLibrary('Grade 3'));
  await waitFor(() => expect(result.current.error).toBe('Service down'));
  expect(result.current.passages).toEqual([]);

  await act(async () => { result.current.reload(); });
  await waitFor(() => expect(result.current.passages).toHaveLength(2));
  expect(result.current.error).toBeNull();
  expect(result.current.lexile).toBeNull();
});

test('needs calibration, skip sets the default level', async () => {
  mockApi.fetchLexile.mockResolvedValue({ lexile: null, needsCalibration: true });
  const { result } = await renderHook(() => usePassageLibrary('Grade 3'));
  await waitFor(() => expect(result.current.needsCalibration).toBe(true));
  await act(async () => { result.current.skipCalibration(); });
  expect(result.current.needsCalibration).toBe(false);
  expect(result.current.lexile).toBe(400);
});

test('applyLexile ignores a missing value', async () => {
  const { result } = await renderHook(() => usePassageLibrary('Grade 3'));
  await waitFor(() => expect(result.current.lexile).toBe(450));
  await act(async () => { result.current.applyLexile(null); });
  expect(result.current.lexile).toBe(450);
  await act(async () => { result.current.applyLexile(475); });
  expect(result.current.lexile).toBe(475);
});

test('loads a passage and the calibration passage', async () => {
  mockApi.fetchPassage.mockResolvedValue({ title: 'T', text: 'a b c', topic: 'x', level: 'easy', wordCount: 3 });
  mockApi.fetchCalibrationPassage.mockResolvedValue({ title: 'Cal', text: 'one two three four' });
  const { result } = await renderHook(() => usePassageLibrary('Grade 3'));
  let p: any;
  await act(async () => { p = await result.current.loadPassage('T'); });
  expect(p.title).toBe('T');
  expect(mockApi.fetchPassage).toHaveBeenCalledWith('Grade 3', 'T');
  expect(result.current.loadingPassage).toBe(false);
  await act(async () => { p = await result.current.loadCalibrationPassage(); });
  expect(p).toEqual({ title: 'Cal', text: 'one two three four', topic: 'Calibration', level: 'medium', wordCount: 4 });
});
