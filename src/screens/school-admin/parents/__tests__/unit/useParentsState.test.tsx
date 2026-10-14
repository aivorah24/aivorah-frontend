import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useParentsState } from '../../hooks/useParentsState';
import { schoolAdminParentsService } from '../../services/schoolAdminParentsService';

jest.mock('../../services/schoolAdminParentsService', () => ({
  schoolAdminParentsService: { getParents: jest.fn() },
}));

const mockGetParents = schoolAdminParentsService.getParents as jest.Mock;

let hookRef: ReturnType<typeof useParentsState>;
let currentUnmount: (() => void) | undefined;

function Harness({ email }: { email: string | undefined }) {
  const h = useParentsState(email);
  React.useEffect(() => { hookRef = h; });
  return <Text testID="loading">{String(h.loading)}</Text>;
}

async function renderHarness(email: string | undefined = 'admin@x.com') {
  hookRef = undefined as any;
  const { unmount } = await render(<Harness email={email} />);
  currentUnmount = unmount;
  await waitFor(() => expect(hookRef).toBeDefined());
}

describe('useParentsState', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  afterEach(() => { currentUnmount?.(); currentUnmount = undefined; });

  test('load populates items on success', async () => {
    mockGetParents.mockResolvedValue([{ id: 'p1', name: 'A', email: 'a@x.com', linkedStudents: [], status: 'active', joinedAt: '' }]);
    await renderHarness();
    await act(async () => hookRef.load());
    expect(hookRef.items).toHaveLength(1);
    expect(hookRef.loading).toBe(false);
    expect(hookRef.error).toBe('');
  });

  test('load failure surfaces the error', async () => {
    mockGetParents.mockRejectedValue(new Error('Failed to load parents'));
    await renderHarness();
    await act(async () => hookRef.load());
    expect(hookRef.error).toBe('Failed to load parents');
    expect(hookRef.loading).toBe(false);
  });

  test('load does nothing without an email', async () => {
    await renderHarness('');
    await act(async () => hookRef.load());
    expect(mockGetParents).not.toHaveBeenCalled();
  });

  test('setSelectedParent stores/clears the selected row', async () => {
    await renderHarness();
    const p: any = { id: 'p1', name: 'A' };
    await act(async () => hookRef.setSelectedParent(p));
    expect(hookRef.selectedParent).toEqual(p);
    await act(async () => hookRef.setSelectedParent(null));
    expect(hookRef.selectedParent).toBeNull();
  });

  test('refresh sets refreshing then clears it once load resolves', async () => {
    mockGetParents.mockResolvedValue([]);
    await renderHarness();
    await act(async () => hookRef.refresh());
    expect(hookRef.refreshing).toBe(false);
    expect(mockGetParents).toHaveBeenCalledWith('admin@x.com');
  });
});
