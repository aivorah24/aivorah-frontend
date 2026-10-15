import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useEditTeacherState, EditTeacherParam } from '../../hooks/useEditTeacherState';
import { schoolAdminTeachersService } from '../../services/schoolAdminTeachersService';

jest.mock('../../services/schoolAdminTeachersService', () => ({
  schoolAdminTeachersService: { getSchoolCurriculumBase: jest.fn(), updateTeacherTeaches: jest.fn() },
}));

const mockGetBase = schoolAdminTeachersService.getSchoolCurriculumBase as jest.Mock;
const mockUpdate = schoolAdminTeachersService.updateTeacherTeaches as jest.Mock;

const TEACHER: EditTeacherParam = { id: 't1', name: 'Alice Adams', email: 'alice@x.com', teaches: [{ curriculum: 'CBSE', grade: 'Grade 3', subjects: ['Maths'] }] };

let hookRef: ReturnType<typeof useEditTeacherState>;
let currentUnmount: (() => void) | undefined;
let onSaved: jest.Mock;

function Harness({ teacher }: { teacher: EditTeacherParam | undefined }) {
  const h = useEditTeacherState(teacher, 'admin@x.com', onSaved);
  React.useEffect(() => { hookRef = h; });
  return <Text testID="saving">{String(h.saving)}</Text>;
}

async function renderHarness(teacher: EditTeacherParam | undefined = TEACHER) {
  hookRef = undefined as any;
  onSaved = jest.fn();
  const { unmount } = await render(<Harness teacher={teacher} />);
  currentUnmount = unmount;
  await waitFor(() => expect(hookRef).toBeDefined());
}

describe('useEditTeacherState', () => {
  beforeEach(() => { jest.clearAllMocks(); mockGetBase.mockResolvedValue(null); });
  afterEach(() => { currentUnmount?.(); currentUnmount = undefined; });

  test('seeds entries from the teacher param teaches', async () => {
    await renderHarness();
    expect(hookRef.entries).toEqual([{ curriculum: 'CBSE', grade: 'Grade 3', subjectsInput: 'Maths' }]);
  });

  test('a teacher with no teaches seeds one empty entry', async () => {
    await renderHarness({ ...TEACHER, teaches: [] });
    expect(hookRef.entries).toEqual([{ curriculum: '', grade: '', subjectsInput: '' }]);
  });

  test('canSubmit is true only when at least one entry has curriculum and grade', async () => {
    await renderHarness();
    expect(hookRef.canSubmit).toBe(true);
  });

  test('save calls updateTeacherTeaches and onSaved with the teacher name', async () => {
    mockUpdate.mockResolvedValue(undefined);
    await renderHarness();

    await act(async () => hookRef.save());

    expect(mockUpdate).toHaveBeenCalledWith('alice@x.com', [{ curriculum: 'CBSE', grade: 'Grade 3', subjects: ['Maths'] }]);
    expect(onSaved).toHaveBeenCalledWith('Alice Adams');
  });

  test('save failure surfaces the error and does not call onSaved', async () => {
    mockUpdate.mockRejectedValue(new Error('Failed to save changes'));
    await renderHarness();

    await act(async () => hookRef.save());

    expect(hookRef.formError).toBe('Failed to save changes');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
