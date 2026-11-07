// My Library: the teacher's own saved assignments - listed, filtered, assigned
// again (whole class or one student) and removed. The library API is mocked.
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import { MyLibrary } from '../../components/MyLibrary';
import * as lib from '../../services/libraryService';
import { buildTeacherScope } from '../../utils/teacherScope';
import { darkColors } from '../../../../../theme';

jest.mock('../../services/libraryService', () => ({
  fetchMyLibrary: jest.fn(),
  removeLibraryItem: jest.fn(),
  assignFromLibrary: jest.fn(),
}));
// A plain field: type the date straight in
jest.mock('../../../../../components/common/DatePicker', () => {
  const { TextInput } = require('react-native');
  return { __esModule: true, default: ({ value, onChange }: any) => <TextInput testID="due-date" value={value} onChangeText={onChange} /> };
});

const mocked = lib as jest.Mocked<typeof lib>;
const styles: any = new Proxy({}, { get: () => ({}) });
const ITEMS = [
  { id: 'i1', title: 'Fractions quiz', type: 'quiz', subject: 'Mathematics', chapter: null, grade: 'Grade 4', curriculum: 'CBSE', times_assigned: 2, created_at: '2026-11-01T09:00:00Z', last_assigned_at: '2026-11-06T09:00:00Z' },
  { id: 'i2', title: 'My family essay', type: 'assignment', subject: 'English', chapter: null, grade: 'Grade 6', curriculum: 'CBSE', times_assigned: 1, created_at: '2026-10-01T09:00:00Z', last_assigned_at: '2026-10-01T09:00:00Z' },
] as any[];
const STUDENTS = [
  { id: 's1', name: 'Asha Rao', grade: 'Grade 4' },
  { id: 's2', name: 'Bilal Khan', grade: 'Grade 4' },
  { id: 's3', name: 'Chitra Iyer', grade: 'Grade 6' },
];
const SCOPE = buildTeacherScope([{ grade: 'Grade 4', subjects: ['Maths'] }, { grade: 'Grade 6', subjects: ['English'] }]);

async function renderLib(extra: any = {}) {
  const onAssigned = jest.fn();
  await render(
    <MyLibrary active teacherEmail="t@school.test" students={STUDENTS} scope={SCOPE} subject="" grade=""
      colors={darkColors} gold="#D9A93E" styles={styles} onAssigned={onAssigned} {...extra} />,
  );
  return { onAssigned };
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.fetchMyLibrary.mockResolvedValue(ITEMS);
});

test('lists the teacher\'s saved assignments with how often they were assigned', async () => {
  await renderLib();
  expect(await screen.findByText('Fractions quiz')).toBeTruthy();
  expect(screen.getByText('My family essay')).toBeTruthy();
  expect(screen.getByText('Assigned 2× · last on 6 Nov 2026')).toBeTruthy();
});

test('the grade / subject chips filter it', async () => {
  await renderLib({ grade: 'Grade 6' });
  expect(await screen.findByText('My family essay')).toBeTruthy();
  expect(screen.queryByText('Fractions quiz')).toBeNull();
});

test('empty library explains what it is for', async () => {
  mocked.fetchMyLibrary.mockResolvedValue([]);
  await renderLib();
  expect(await screen.findByText('Your library is empty')).toBeTruthy();
});

test('Assign to one new student: pick a due date and the student, then it is sent', async () => {
  mocked.assignFromLibrary.mockResolvedValue({ ok: true, data: { id: 'a9', title: 'Fractions quiz' } });
  const { onAssigned } = await renderLib();
  await screen.findByText('Fractions quiz');
  await act(async () => { fireEvent.press(screen.getAllByTestId('my-library-assign')[0]); });
  await screen.findByTestId('due-date');

  expect(screen.getByText('Whole class (Grade 4)')).toBeTruthy();
  await act(async () => { fireEvent.changeText(screen.getByTestId('due-date'), '2026-12-01'); });
  await act(async () => { fireEvent.press(screen.getByText('One student')); });
  // only Grade 4 students are offered for a Grade 4 item
  expect(screen.getByText(/Asha Rao/)).toBeTruthy();
  expect(screen.queryByText(/Chitra Iyer/)).toBeNull();
  await act(async () => { fireEvent.press(screen.getByText(/Bilal Khan/)); });
  await act(async () => { fireEvent.press(screen.getByTestId('my-library-assign-confirm')); });

  expect(mocked.assignFromLibrary).toHaveBeenCalledWith(ITEMS[0], { dueDate: '2026-12-01', studentId: 's2', teacherEmail: 't@school.test' });
  expect(onAssigned).toHaveBeenCalledWith({ id: 'a9', title: 'Fractions quiz' });
});

test('Assign to the whole class; Assign stays disabled until a due date is set', async () => {
  mocked.assignFromLibrary.mockResolvedValue({ ok: true, data: { id: 'a10' } });
  await renderLib();
  await screen.findByText('Fractions quiz');
  await act(async () => { fireEvent.press(screen.getAllByTestId('my-library-assign')[0]); });
  await screen.findByTestId('due-date');
  fireEvent.press(screen.getByTestId('my-library-assign-confirm'));
  expect(mocked.assignFromLibrary).not.toHaveBeenCalled();

  await act(async () => { fireEvent.changeText(screen.getByTestId('due-date'), '2026-12-01'); });
  await act(async () => { fireEvent.press(screen.getByTestId('my-library-assign-confirm')); });
  expect(mocked.assignFromLibrary).toHaveBeenCalledWith(ITEMS[0], { dueDate: '2026-12-01', studentId: null, teacherEmail: 't@school.test' });
});

test('an assign failure is shown in the dialog', async () => {
  mocked.assignFromLibrary.mockResolvedValue({ ok: false, error: 'Quiz must include valid MCQ questions (4 options each).' });
  await renderLib();
  await screen.findByText('Fractions quiz');
  await act(async () => { fireEvent.press(screen.getAllByTestId('my-library-assign')[0]); });
  await screen.findByTestId('due-date');
  await act(async () => { fireEvent.changeText(screen.getByTestId('due-date'), '2026-12-01'); });
  await act(async () => { fireEvent.press(screen.getByTestId('my-library-assign-confirm')); });
  expect(await screen.findByText('Quiz must include valid MCQ questions (4 options each).')).toBeTruthy();
});

test('Remove takes it out of the library after confirming', async () => {
  (global as any).window = Object.assign((global as any).window || {}, { confirm: jest.fn(() => true) });
  jest.spyOn(require('react-native').Alert, 'alert').mockImplementation((_t: any, _m: any, buttons: any) => buttons?.[1]?.onPress?.());
  mocked.removeLibraryItem.mockResolvedValue();
  await renderLib();
  await screen.findByText('Fractions quiz');
  await act(async () => { fireEvent.press(screen.getAllByTestId('my-library-remove')[0]); });
  await waitFor(() => expect(screen.queryByText('Fractions quiz')).toBeNull());
  expect(mocked.removeLibraryItem).toHaveBeenCalledWith('i1');
});
