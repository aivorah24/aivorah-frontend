// No RNTL renderHook in this version — a tiny harness component exposes the
// hook's state/handlers as text/props, same pattern as
// src/screens/teacher/schedule/__tests__/unit/useTagFilters.test.tsx.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useAssignmentsList } from '../../hooks/useAssignmentsList';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

function Harness({ teacherEmail }: { teacherEmail: string }) {
  const h = useAssignmentsList({ teacherEmail });
  return (
    <View>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="count">{String(h.assignments.length)}</Text>
      <Text testID="firstStatus">{h.assignments[0]?.status ?? ''}</Text>
      <TouchableOpacity testID="complete" onPress={() => h.markComplete(h.assignments[0]?.id)} />
      <TouchableOpacity testID="delete" onPress={() => h.deleteAssignment(h.assignments[0]?.id)} />
    </View>
  );
}

const ASSIGNMENT = { id: 'a1', title: 'Worksheet', status: 'pending' };

describe('useAssignmentsList', () => {
  test('loads the list on mount and flips loading off', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([ASSIGNMENT]) }) as any;
    await render(<Harness teacherEmail="t@school.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('count').props.children).toBe('1');
  });

  test('a failed fetch leaves the list empty but still clears loading', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;
    await render(<Harness teacherEmail="t@school.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('count').props.children).toBe('0');
  });

  test('a network error is swallowed, not thrown', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;
    await render(<Harness teacherEmail="t@school.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('count').props.children).toBe('0');
  });

  test('markComplete flips the local status optimistically on a 200', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([ASSIGNMENT]) })
      .mockResolvedValueOnce({ ok: true });
    await render(<Harness teacherEmail="t@school.com" />);
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('1'));
    await user.press(screen.getByTestId('complete'));
    await waitFor(() => expect(screen.getByTestId('firstStatus').props.children).toBe('completed'));
  });

  test('deleteAssignment removes it from the local list on success', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([ASSIGNMENT]) })
      .mockResolvedValueOnce({ ok: true });
    await render(<Harness teacherEmail="t@school.com" />);
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('1'));
    await user.press(screen.getByTestId('delete'));
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('0'));
  });
});
