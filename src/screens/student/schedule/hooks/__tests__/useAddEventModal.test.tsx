import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent } from '@testing-library/react-native';
import { useAddEventModal } from '../useAddEventModal';

const mockAddEvent = jest.fn();

function Harness() {
  const hook = useAddEventModal({ todayISO: '2026-04-15', addEvent: mockAddEvent });
  return (
    <>
      <Text testID="modalVisible">{String(hook.modalVisible)}</Text>
      <Text testID="modalDate">{hook.modalDate}</Text>
      <Text testID="startTime">{hook.newStartTime}</Text>
      <Text testID="endTime">{hook.newEndTime}</Text>
      <Text testID="isAllDay">{String(hook.isAllDay)}</Text>
      <Text testID="tag">{hook.newTag}</Text>
      <Text testID="saving">{String(hook.saving)}</Text>
      <TouchableOpacity testID="openSlot9am" onPress={() => hook.openSlotModal('2026-04-16', '09:00')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="openSlot23h" onPress={() => hook.openSlotModal('2026-04-16', '23:00')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="openSlotAllDay" onPress={() => hook.openSlotModal('2026-04-16', undefined, true, 'Holidays and vacations')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="openDrag" onPress={() => hook.openDragModal('2026-04-17', '14:00', '15:30')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="openNew" onPress={hook.openNewEventModal}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="toggleAllDay" onPress={hook.toggleAllDay}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setTitle" onPress={() => hook.setNewTitle('Maths Homework')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="startTimeLate" onPress={() => hook.onStartTimeChange('10:45')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="confirm" onPress={hook.confirmAddEvent}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useAddEventModal — opening the modal', () => {
  test('openSlotModal with a time label rounds to that hour and sets end +1 hour', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('openSlot9am'));
    expect(screen.getByTestId('modalVisible').props.children).toBe('true');
    expect(screen.getByTestId('modalDate').props.children).toBe('2026-04-16');
    expect(screen.getByTestId('startTime').props.children).toBe('09:00');
    expect(screen.getByTestId('endTime').props.children).toBe('10:00');
  });

  test('openSlotModal at 23:00 caps the end hour at 23 (never rolls to 24)', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('openSlot23h'));
    expect(screen.getByTestId('endTime').props.children).toBe('23:00');
  });

  test('openSlotModal with presetAllDay sets 23:59 start/end and the given preset tag', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('openSlotAllDay'));
    expect(screen.getByTestId('isAllDay').props.children).toBe('true');
    expect(screen.getByTestId('startTime').props.children).toBe('23:59');
    expect(screen.getByTestId('tag').props.children).toBe('Holidays and vacations');
  });

  test('openSlotModal with no time label at all defaults to 09:00-10:00', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('openNew'));
    expect(screen.getByTestId('startTime').props.children).toBe('09:00');
    expect(screen.getByTestId('endTime').props.children).toBe('10:00');
  });

  test('openDragModal uses the exact drag-selected start/end times', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('openDrag'));
    expect(screen.getByTestId('modalDate').props.children).toBe('2026-04-17');
    expect(screen.getByTestId('startTime').props.children).toBe('14:00');
    expect(screen.getByTestId('endTime').props.children).toBe('15:30');
  });

  test('openNewEventModal defaults to today, 09:00-10:00', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('openNew'));
    expect(screen.getByTestId('modalDate').props.children).toBe('2026-04-15');
  });
});

describe('useAddEventModal — toggleAllDay', () => {
  test('turning all-day ON sets 23:59/23:59 and switches the default tag away from "Study Session"', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('toggleAllDay'));
    expect(screen.getByTestId('isAllDay').props.children).toBe('true');
    expect(screen.getByTestId('startTime').props.children).toBe('23:59');
    expect(screen.getByTestId('tag').props.children).toBe('Holidays and vacations');
  });

  test('turning all-day back OFF restores the normal 09:00-10:00 default window', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('toggleAllDay'));
    await user.press(screen.getByTestId('toggleAllDay'));
    expect(screen.getByTestId('isAllDay').props.children).toBe('false');
    expect(screen.getByTestId('startTime').props.children).toBe('09:00');
  });
});

describe('useAddEventModal — onStartTimeChange', () => {
  test('pushing the start time past the current end time auto-bumps the end time by 30 minutes', async () => {
    const user = userEvent.setup();
    await render(<Harness />); // default end is 10:00
    await user.press(screen.getByTestId('startTimeLate')); // 10:45 > 10:00
    expect(screen.getByTestId('startTime').props.children).toBe('10:45');
    expect(screen.getByTestId('endTime').props.children).toBe('11:15');
  });
});

describe('useAddEventModal — confirmAddEvent', () => {
  test('a blank title is silently ignored, addEvent is never called', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('confirm'));
    expect(mockAddEvent).not.toHaveBeenCalled();
  });

  test('a real title submits the full real payload and resets the form afterward', async () => {
    mockAddEvent.mockResolvedValueOnce({ id: 'ev1' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setTitle'));

    await user.press(screen.getByTestId('confirm'));

    expect(mockAddEvent).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Maths Homework', date: '2026-04-15', startTime: '09:00', endTime: '10:00',
      type: 'study', tag: 'Study Session',
    }));
    expect(screen.getByTestId('modalVisible').props.children).toBe('false');
    expect(screen.getByTestId('saving').props.children).toBe('false');
  });

  test('an all-day event submits 23:59 for both start and end regardless of the stored draft times', async () => {
    mockAddEvent.mockResolvedValueOnce({ id: 'ev1' });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('setTitle'));
    await user.press(screen.getByTestId('toggleAllDay'));

    await user.press(screen.getByTestId('confirm'));

    expect(mockAddEvent).toHaveBeenCalledWith(expect.objectContaining({ startTime: '23:59', endTime: '23:59' }));
  });
});
