import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useAddTeacherState } from '../../hooks/useAddTeacherState';
import { schoolAdminTeachersService } from '../../services/schoolAdminTeachersService';

jest.mock('../../services/schoolAdminTeachersService', () => ({
  schoolAdminTeachersService: { getSchoolCurriculumBase: jest.fn(), createTeacher: jest.fn() },
}));

const mockGetBase = schoolAdminTeachersService.getSchoolCurriculumBase as jest.Mock;
const mockCreate = schoolAdminTeachersService.createTeacher as jest.Mock;

let hookRef: ReturnType<typeof useAddTeacherState>;
let currentUnmount: (() => void) | undefined;

function Harness({ email }: { email: string | undefined }) {
  const h = useAddTeacherState(email);
  React.useEffect(() => { hookRef = h; });
  return <Text testID="submitting">{String(h.submitting)}</Text>;
}

async function renderHarness(email: string | undefined = 'admin@x.com') {
  hookRef = undefined as any;
  const { unmount } = await render(<Harness email={email} />);
  currentUnmount = unmount;
  await waitFor(() => expect(hookRef).toBeDefined());
}

describe('useAddTeacherState', () => {
  beforeEach(() => { jest.clearAllMocks(); mockGetBase.mockResolvedValue(null); });
  afterEach(() => { currentUnmount?.(); currentUnmount = undefined; });

  test('canSubmit requires both first and last name', async () => {
    await renderHarness();
    expect(hookRef.canSubmit).toBe(false);
    await act(async () => hookRef.setFirstName('E2E'));
    expect(hookRef.canSubmit).toBe(false);
    await act(async () => hookRef.setLastName('Test'));
    expect(hookRef.canSubmit).toBe(true);
  });

  test('submit does nothing when canSubmit is false', async () => {
    await renderHarness();
    await act(async () => hookRef.submit());
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('submit posts firstName/lastName/teaches and stores the result', async () => {
    mockCreate.mockResolvedValue({ id: 't1', name: 'E2E Test', email: 'e2e@x.com', password: 'pw', subjects: [], status: 'invited' });
    await renderHarness();
    await act(async () => hookRef.setFirstName('E2E'));
    await act(async () => hookRef.setLastName('Test'));

    await act(async () => hookRef.submit());

    expect(mockCreate).toHaveBeenCalledWith('admin@x.com', expect.objectContaining({ firstName: 'E2E', lastName: 'Test', teaches: [] }));
    expect(hookRef.result?.email).toBe('e2e@x.com');
  });

  test('submit failure surfaces the error and leaves result unset', async () => {
    mockCreate.mockRejectedValue(new Error('Email already in use'));
    await renderHarness();
    await act(async () => hookRef.setFirstName('E2E'));
    await act(async () => hookRef.setLastName('Test'));

    await act(async () => hookRef.submit());

    expect(hookRef.formError).toBe('Email already in use');
    expect(hookRef.result).toBeNull();
  });

  test('reset clears the form back to a single empty entry', async () => {
    mockCreate.mockResolvedValue({ id: 't1', name: 'E2E Test', email: 'e2e@x.com', password: 'pw', subjects: [], status: 'invited' });
    await renderHarness();
    await act(async () => hookRef.setFirstName('E2E'));
    await act(async () => hookRef.setLastName('Test'));
    await act(async () => hookRef.submit());

    await act(async () => hookRef.reset());

    expect(hookRef.result).toBeNull();
    expect(hookRef.firstName).toBe('');
    expect(hookRef.entries).toHaveLength(1);
  });
});
