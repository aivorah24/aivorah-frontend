import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useAddParentState } from '../../hooks/useAddParentState';
import { schoolAdminParentsService, CreateParentError } from '../../services/schoolAdminParentsService';

jest.mock('../../services/schoolAdminParentsService', () => {
  const actual = jest.requireActual('../../services/schoolAdminParentsService');
  return {
    ...actual,
    schoolAdminParentsService: { getGradeSectionOptions: jest.fn(), createParent: jest.fn() },
  };
});

const mockGetOptions = schoolAdminParentsService.getGradeSectionOptions as jest.Mock;
const mockCreate = schoolAdminParentsService.createParent as jest.Mock;

let hookRef: ReturnType<typeof useAddParentState>;
let currentUnmount: (() => void) | undefined;

function Harness({ email }: { email: string | undefined }) {
  const h = useAddParentState(email);
  React.useEffect(() => { hookRef = h; });
  return <Text testID="submitting">{String(h.submitting)}</Text>;
}

async function renderHarness(email: string | undefined = 'admin@x.com') {
  hookRef = undefined as any;
  const { unmount } = await render(<Harness email={email} />);
  currentUnmount = unmount;
  await waitFor(() => expect(hookRef).toBeDefined());
}

describe('useAddParentState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOptions.mockResolvedValue({ sectionsByGrade: {}, allSections: [], schoolCurriculumBase: null });
  });
  afterEach(() => { currentUnmount?.(); currentUnmount = undefined; });

  test('canSubmit requires both first and last name', async () => {
    await renderHarness();
    expect(hookRef.canSubmit).toBe(false);
    await act(async () => hookRef.setFirstName('E2E'));
    expect(hookRef.canSubmit).toBe(false);
    await act(async () => hookRef.setLastName('Test'));
    expect(hookRef.canSubmit).toBe(true);
  });

  test('submit posts firstName/lastName and stores the result', async () => {
    mockCreate.mockResolvedValue({ id: 'p1', name: 'E2E Test', email: 'e2e@x.com', password: 'pw', status: 'invited' });
    await renderHarness();
    await act(async () => hookRef.setFirstName('E2E'));
    await act(async () => hookRef.setLastName('Test'));

    await act(async () => hookRef.submit());

    expect(mockCreate).toHaveBeenCalledWith('admin@x.com', { firstName: 'E2E', lastName: 'Test' });
    expect(hookRef.result?.email).toBe('e2e@x.com');
  });

  test('a filled child row is included in the payload', async () => {
    mockCreate.mockResolvedValue({ id: 'p1', name: 'E2E Test', email: 'e2e@x.com', password: 'pw', status: 'invited' });
    await renderHarness();
    await act(async () => hookRef.setFirstName('E2E'));
    await act(async () => hookRef.setLastName('Test'));
    const key = hookRef.children[0].key;
    await act(async () => hookRef.updateChild(key, { admissionNumber: 'TSRA-1005' }));

    await act(async () => hookRef.submit());

    expect(mockCreate).toHaveBeenCalledWith('admin@x.com', expect.objectContaining({
      children: [{ admissionNumber: 'TSRA-1005', name: undefined, grade: undefined, section: undefined }],
    }));
  });

  test('submit failure surfaces the error and unresolved rows', async () => {
    mockCreate.mockRejectedValue(new CreateParentError('Could not match a child', [{ index: 0, reason: 'No student found' }]));
    await renderHarness();
    await act(async () => hookRef.setFirstName('E2E'));
    await act(async () => hookRef.setLastName('Test'));

    await act(async () => hookRef.submit());

    expect(hookRef.formError).toBe('Could not match a child');
    expect(hookRef.unresolved).toEqual([{ index: 0, reason: 'No student found' }]);
  });

  test('addChild/removeChild manage the children list, never dropping below one row', async () => {
    await renderHarness();
    await act(async () => hookRef.addChild());
    expect(hookRef.children).toHaveLength(2);

    const [first, second] = hookRef.children;
    await act(async () => hookRef.removeChild(second.key));
    expect(hookRef.children).toHaveLength(1);

    await act(async () => hookRef.removeChild(hookRef.children[0].key));
    expect(hookRef.children).toHaveLength(1);
  });

  test('reset clears the form back to a single empty child row', async () => {
    mockCreate.mockResolvedValue({ id: 'p1', name: 'E2E Test', email: 'e2e@x.com', password: 'pw', status: 'invited' });
    await renderHarness();
    await act(async () => hookRef.setFirstName('E2E'));
    await act(async () => hookRef.setLastName('Test'));
    await act(async () => hookRef.submit());

    await act(async () => hookRef.reset());

    expect(hookRef.result).toBeNull();
    expect(hookRef.firstName).toBe('');
    expect(hookRef.children).toHaveLength(1);
  });
});
