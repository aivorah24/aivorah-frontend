import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useClassAttendance } from '../../hooks/useClassAttendance';

const mockFetchClass = jest.fn();
const mockSave = jest.fn();
jest.mock('../../../../../services/attendanceClient', () => ({
  fetchClassAttendance: (...a: any[]) => mockFetchClass(...a),
  saveClassAttendance: (...a: any[]) => mockSave(...a),
}));

const cls = { grade: 'Grade 5', section: 'A' };

function Harness({ date = '2026-09-15' }: { date?: string }) {
  const h = useClassAttendance(cls, date);
  return (
    <>
      <Text testID="statuses">{h.students.map((s) => `${s.id}:${s.status}`).join(',')}</Text>
      <Text testID="error">{String(h.loadError)}</Text>
      <Text testID="message">{h.message ? `${h.message.kind}|${h.message.text}` : 'none'}</Text>
      <TouchableOpacity testID="absent-a" onPress={() => h.mark('a', 'absent')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="all" onPress={h.markAllPresent}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="save" onPress={h.save}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  mockFetchClass.mockReset().mockResolvedValue([{ id: 'a', name: 'A', status: 'present' }, { id: 'b', name: 'B', status: null }]);
  mockSave.mockReset().mockResolvedValue({ success: true });
});

describe('useClassAttendance', () => {
  test('loads the roster for the class and day', async () => {
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('statuses').props.children).toBe('a:present,b:null'));
    expect(mockFetchClass).toHaveBeenCalledWith('Grade 5', 'A', '2026-09-15');
  });

  test('saving sends the marks and shows an inline "Saved" message, not an Alert', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('statuses').props.children).toBe('a:present,b:null'));
    await user.press(screen.getByTestId('absent-a'));
    await user.press(screen.getByTestId('save'));
    await waitFor(() => expect(screen.getByTestId('message').props.children).toBe('success|Saved attendance for 2026-09-15'));
    expect(mockSave).toHaveBeenCalledWith({ grade: 'Grade 5', section: 'A', date: '2026-09-15', records: { a: 'absent' } });
  });

  test('a failed save shows the error inline', async () => {
    mockSave.mockRejectedValue(new Error('Not your class'));
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('statuses').props.children).toBe('a:present,b:null'));
    await user.press(screen.getByTestId('save'));
    await waitFor(() => expect(screen.getByTestId('message').props.children).toBe('error|Not your class'));
  });

  test('a load error empties the roster and reports it', async () => {
    mockFetchClass.mockRejectedValue(new Error('Forbidden'));
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('error').props.children).toBe('Forbidden'));
    expect(screen.getByTestId('statuses').props.children).toBe('');
  });

  test('Mark All Present, pressed twice, puts the earlier marks back', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('statuses').props.children).toBe('a:present,b:null'));
    await user.press(screen.getByTestId('all'));
    expect(screen.getByTestId('statuses').props.children).toBe('a:present,b:present');
    await user.press(screen.getByTestId('all'));
    expect(screen.getByTestId('statuses').props.children).toBe('a:present,b:null');
  });

  test('an incomplete date does not reload', async () => {
    await render(<Harness date="2026-09" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(mockFetchClass).not.toHaveBeenCalled();
  });
});
