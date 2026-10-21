import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTeachersState } from '../../hooks/useTeachersState';
import { schoolAdminTeachersService } from '../../services/schoolAdminTeachersService';

jest.mock('../../services/schoolAdminTeachersService', () => ({
  schoolAdminTeachersService: { getTeachers: jest.fn() },
}));

const mockGetTeachers = schoolAdminTeachersService.getTeachers as jest.Mock;

let hookRef: ReturnType<typeof useTeachersState>;
let currentUnmount: (() => void) | undefined;

function Harness({ email }: { email: string | undefined }) {
  const h = useTeachersState(email);
  React.useEffect(() => { hookRef = h; });
  return <Text testID="loading">{String(h.loading)}</Text>;
}

async function renderHarness(email: string | undefined = 'admin@x.com') {
  hookRef = undefined as any;
  const { unmount } = await render(<Harness email={email} />);
  currentUnmount = unmount;
  await waitFor(() => expect(hookRef).toBeDefined());
}

describe('useTeachersState', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  afterEach(() => { currentUnmount?.(); currentUnmount = undefined; });

  test('load populates items on success', async () => {
    mockGetTeachers.mockResolvedValue([{ id: 't1', name: 'A', email: 'a@x.com' }]);
    await renderHarness();

    await act(async () => hookRef.load());

    expect(hookRef.items).toHaveLength(1);
    expect(hookRef.loading).toBe(false);
    expect(hookRef.error).toBe('');
  });

  test('load failure surfaces the error and clears loading', async () => {
    mockGetTeachers.mockRejectedValue(new Error('Failed to load teachers'));
    await renderHarness();

    await act(async () => hookRef.load());

    expect(hookRef.error).toBe('Failed to load teachers');
    expect(hookRef.loading).toBe(false);
  });

  test('load does nothing without an email', async () => {
    await renderHarness('');
    await act(async () => hookRef.load());
    expect(mockGetTeachers).not.toHaveBeenCalled();
  });

  test('refresh sets refreshing then clears it once load resolves', async () => {
    mockGetTeachers.mockResolvedValue([]);
    await renderHarness();

    await act(async () => hookRef.refresh());

    expect(hookRef.refreshing).toBe(false);
    expect(mockGetTeachers).toHaveBeenCalledWith('admin@x.com');
  });
});
