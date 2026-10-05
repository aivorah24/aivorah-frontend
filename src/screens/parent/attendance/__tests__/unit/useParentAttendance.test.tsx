import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useParentAttendance } from '../../hooks/useParentAttendance';

const mockChildren = jest.fn();
const mockSummary = jest.fn();
jest.mock('../../../dashboard/services/parentDashboardService', () => ({ fetchChildren: (...a: any[]) => mockChildren(...a) }));
jest.mock('../../../../../services/attendanceClient', () => ({ fetchStudentAttendanceSummary: (...a: any[]) => mockSummary(...a) }));

function Harness({ enabled = true }: { enabled?: boolean }) {
  const h = useParentAttendance('p@a.com', enabled);
  return (
    <>
      <Text testID="kids">{h.children.map((c) => c.id).join(',')}</Text>
      <Text testID="selected">{String(h.selectedChild?.id)}</Text>
      <Text testID="rate">{h.summary ? String(h.summary.summary.ratePct) : 'none'}</Text>
      <Text testID="error">{String(h.error)}</Text>
    </>
  );
}

beforeEach(() => {
  mockChildren.mockReset().mockResolvedValue([{ id: 'k1', name: 'A', grade: 'Grade 5' }]);
  mockSummary.mockReset().mockResolvedValue({ summary: { present: 1, absent: 0, late: 0, total: 1, ratePct: 100 }, history: [] });
});

describe('useParentAttendance', () => {
  test('loads the children and the first child\'s summary', async () => {
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('rate').props.children).toBe('100'));
    expect(screen.getByTestId('selected').props.children).toBe('k1');
    expect(mockChildren).toHaveBeenCalledWith('p@a.com');
    expect(mockSummary).toHaveBeenCalledWith('k1');
  });

  test('a summary error is reported, not shown as numbers', async () => {
    mockSummary.mockRejectedValue(new Error('Not your child'));
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Not your child'));
    expect(screen.getByTestId('rate').props.children).toBe('none');
  });

  test('disabled (no school link): nothing is fetched', async () => {
    await render(<Harness enabled={false} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(mockChildren).not.toHaveBeenCalled();
  });
});
