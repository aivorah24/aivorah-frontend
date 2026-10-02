import { renderHook, act } from '@testing-library/react-native';
import { useTimetableImport } from '../../hooks/useTimetableImport';
import { previewTimetableImport, commitTimetableImport } from '../../services/timetableApi';

jest.mock('../../services/timetableApi', () => ({ previewTimetableImport: jest.fn(), commitTimetableImport: jest.fn() }));
const mockPreview = previewTimetableImport as jest.Mock;
const mockCommit = commitTimetableImport as jest.Mock;

const G7A = { grade: 'Grade 7', section: 'A', label: 'Grade 7 A' };
const G7B = { grade: 'Grade 7', section: 'B', label: 'Grade 7 B' };
const P = [{ code: 'P1', start: '08:00', end: '08:45', isBreak: false }];
const slot = { day: 'MON', periodCode: 'P1', subject: 'Maths', room: '', teacherId: null };
const cls = (label: string, match: any, canSave = true) => ({ label, homeroomTeacher: '', match, matchReason: match ? null : 'No grade 10 in this school', canSave, periodDefs: P, slots: [slot], warnings: [] });

async function setup(targets = [G7A, G7B], onSaved = jest.fn()) {
  const { result } = await renderHook(() => useTimetableImport(targets, onSaved));
  return { h: () => result.current, onSaved };
}
const pdf = (size = 1000) => ({ size } as Blob);

beforeEach(() => jest.clearAllMocks());

test('reads the PDF and ticks only classes it matched and the user may save', async () => {
  mockPreview.mockResolvedValue({ classes: [cls('Class VII - A', { grade: 'Grade 7', section: 'A' }), cls('Class VII - B', { grade: 'Grade 7', section: 'B' }, false), cls('Class X', null)] });
  const { h } = await setup([G7A]);
  await act(async () => { await h().readFile(pdf(), 'tt.pdf'); });
  expect(h().step).toBe('review');
  expect(h().rows.map((r) => [r.target?.label ?? null, r.include])).toEqual([['Grade 7 A', true], [null, false], [null, false]]);
  expect(h().chosen).toHaveLength(1);
});

test('a PDF over 10 MB is refused before uploading', async () => {
  const { h } = await setup();
  await act(async () => { await h().readFile(pdf(11 * 1024 * 1024), 'big.pdf'); });
  expect(mockPreview).not.toHaveBeenCalled();
  expect(h().error).toBe('The PDF must be under 10 MB.');
});

test('a read error returns to the start with the message', async () => {
  mockPreview.mockRejectedValue(new Error("Couldn't read the PDF right now"));
  const { h } = await setup();
  await act(async () => { await h().readFile(pdf(), 'tt.pdf'); });
  expect(h().step).toBe('pick');
  expect(h().error).toBe("Couldn't read the PDF right now");
});

test('choosing a class by hand ticks it; two rows on one class blocks saving', async () => {
  mockPreview.mockResolvedValue({ classes: [cls('Class VII - A', { grade: 'Grade 7', section: 'A' }), cls('7?', null)] });
  const { h } = await setup();
  await act(async () => { await h().readFile(pdf(), 'tt.pdf'); });
  await act(async () => { h().setTarget(1, G7B); });
  expect(h().chosen).toHaveLength(2);
  expect(h().duplicateTargets).toBe(false);
  await act(async () => { h().setTarget(1, G7A); });
  expect(h().duplicateTargets).toBe(true);
  await act(async () => { await h().save(); });
  expect(mockCommit).not.toHaveBeenCalled();
});

test('saves the ticked classes to their chosen class and reports results', async () => {
  mockPreview.mockResolvedValue({ classes: [cls('Class VII - A', { grade: 'Grade 7', section: 'A' }), cls('Class VII - B', { grade: 'Grade 7', section: 'B' })] });
  mockCommit.mockResolvedValue({ saved: 1, results: [{ grade: 'Grade 7', section: 'A', ok: true, slots: 1 }] });
  const { h, onSaved } = await setup();
  await act(async () => { await h().readFile(pdf(), 'tt.pdf'); });
  await act(async () => { h().toggle(1); });
  await act(async () => { await h().save(); });
  expect(mockCommit).toHaveBeenCalledWith([{ grade: 'Grade 7', section: 'A', periodDefs: P, slots: [slot] }]);
  expect(h().step).toBe('done');
  expect(onSaved).toHaveBeenCalled();
});
