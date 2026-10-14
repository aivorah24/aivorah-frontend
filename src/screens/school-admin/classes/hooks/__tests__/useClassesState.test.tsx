import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { useClassesState } from '../useClassesState';
import { schoolAdminClassesService } from '../../services/schoolAdminClassesService';

jest.mock('../../services/schoolAdminClassesService', () => ({
  schoolAdminClassesService: { getClasses: jest.fn(), getTeachers: jest.fn(), assignClassTeacher: jest.fn() },
}));

const mockGetClasses = schoolAdminClassesService.getClasses as jest.Mock;
const mockGetTeachers = schoolAdminClassesService.getTeachers as jest.Mock;
const mockAssign = schoolAdminClassesService.assignClassTeacher as jest.Mock;

const CLASS_A = { grade: 'Grade 1', section: 'A', studentCount: 2, classTeacherEmail: null, classTeacherName: null };
const TEACHER = { id: 't1', name: 'Alice', email: 'alice@x.com', teaches: [] };

let hookRef: ReturnType<typeof useClassesState>;

function Harness({ email, showToast }: { email: string | undefined; showToast: (opts: any) => void }) {
  const h = useClassesState(email, showToast);
  React.useEffect(() => { hookRef = h; });
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="classCount">{h.classes.length}</Text>
      <Text testID="teacherCount">{h.teachers.length}</Text>
      <Text testID="visibleCount">{h.visibleClasses.length}</Text>
      <Text testID="gradeOptions">{h.gradeOptions.join(',')}</Text>
      <Text testID="pickerFor">{h.pickerFor ? `${h.pickerFor.grade}::${h.pickerFor.section}` : ''}</Text>
      <Text testID="pickerError">{h.pickerError}</Text>
      <TouchableOpacity testID="load" onPress={() => h.load()} />
    </>
  );
}

async function renderHarness(email: string | undefined, showToast: (opts: any) => void = jest.fn()) {
  render(<Harness email={email} showToast={showToast} />);
  await waitFor(() => expect(hookRef).toBeDefined());
}

describe('useClassesState', () => {
  beforeEach(() => jest.clearAllMocks());

  test('load populates classes and teachers on success', async () => {
    mockGetClasses.mockResolvedValue([CLASS_A]);
    mockGetTeachers.mockResolvedValue([TEACHER]);
    await renderHarness('admin@x.com');

    await act(async () => hookRef.load());

    expect(hookRef.classes).toEqual([CLASS_A]);
    expect(hookRef.teachers).toEqual([TEACHER]);
    expect(hookRef.error).toBe('');
    expect(hookRef.loading).toBe(false);
  });

  test('a classes-fetch failure surfaces the error and stops loading', async () => {
    mockGetClasses.mockRejectedValue(new Error('Failed to load classes. Check your connection.'));
    await renderHarness('admin@x.com');

    await act(async () => hookRef.load());

    expect(hookRef.error).toBe('Failed to load classes. Check your connection.');
    expect(hookRef.loading).toBe(false);
  });

  test('a teachers-fetch failure is silently swallowed (preserved legacy behavior) — classes still load, no error shown', async () => {
    mockGetClasses.mockResolvedValue([CLASS_A]);
    mockGetTeachers.mockRejectedValue(new Error('teachers endpoint down'));
    await renderHarness('admin@x.com');

    await act(async () => hookRef.load());

    expect(hookRef.classes).toEqual([CLASS_A]);
    expect(hookRef.teachers).toEqual([]);
    expect(hookRef.error).toBe('');
  });

  test('does not fetch when there is no user email', async () => {
    await renderHarness(undefined);
    await act(async () => hookRef.load());
    expect(mockGetClasses).not.toHaveBeenCalled();
  });

  test('gradeFilter narrows visibleClasses via the extracted sorting util', async () => {
    const classB = { ...CLASS_A, grade: 'Grade 2', section: 'B' };
    mockGetClasses.mockResolvedValue([CLASS_A, classB]);
    mockGetTeachers.mockResolvedValue([]);
    await renderHarness('admin@x.com');
    await act(async () => hookRef.load());

    await act(async () => hookRef.setGradeFilter('Grade 2'));

    expect(hookRef.visibleClasses).toEqual([classB]);
    expect(hookRef.gradeOptions).toEqual(['Grade 1', 'Grade 2']);
  });

  test('openPicker sets the target class and resets search/error; closePicker clears it', async () => {
    await renderHarness('admin@x.com');

    await act(async () => hookRef.openPicker(CLASS_A));
    expect(hookRef.pickerFor).toEqual(CLASS_A);

    await act(async () => hookRef.closePicker());
    expect(hookRef.pickerFor).toBeNull();
  });

  test('assignTeacher success: closes the picker, reloads, and shows a toast', async () => {
    mockGetClasses.mockResolvedValue([CLASS_A]);
    mockGetTeachers.mockResolvedValue([]);
    mockAssign.mockResolvedValue(undefined);
    const showToast = jest.fn();
    await renderHarness('admin@x.com', showToast);
    await act(async () => hookRef.load());
    await act(async () => hookRef.openPicker(CLASS_A));

    await act(async () => hookRef.assignTeacher('alice@x.com'));

    expect(mockAssign).toHaveBeenCalledWith('Grade 1', 'A', 'admin@x.com', 'alice@x.com');
    expect(hookRef.pickerFor).toBeNull();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Class teacher assigned', type: 'success' }));
  });

  test('assignTeacher with null shows the "removed" toast title', async () => {
    mockGetClasses.mockResolvedValue([CLASS_A]);
    mockGetTeachers.mockResolvedValue([]);
    mockAssign.mockResolvedValue(undefined);
    const showToast = jest.fn();
    await renderHarness('admin@x.com', showToast);
    await act(async () => hookRef.load());
    await act(async () => hookRef.openPicker(CLASS_A));

    await act(async () => hookRef.assignTeacher(null));

    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Class teacher removed' }));
  });

  test('assignTeacher failure surfaces pickerError and keeps the picker open', async () => {
    mockAssign.mockRejectedValue(new Error('Teacher not found'));
    await renderHarness('admin@x.com');
    await act(async () => hookRef.openPicker(CLASS_A));

    await act(async () => hookRef.assignTeacher('x@x.com'));

    expect(hookRef.pickerError).toBe('Teacher not found');
    expect(hookRef.pickerFor).toEqual(CLASS_A);
  });

  test('assignTeacher does nothing without a target class', async () => {
    await renderHarness('admin@x.com');
    await act(async () => hookRef.assignTeacher('x@x.com'));
    expect(mockAssign).not.toHaveBeenCalled();
  });
});
