// Standalone unit test for useEventForm — harness component pattern (see
// useTagFilters.test.tsx). scheduleService's createEvent/updateEvent are
// mocked at the module boundary (no real network / monolith calls).
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useEventForm } from '../../hooks/useEventForm';
import type { StudentItem } from '../../types';

jest.mock('../../services/scheduleService', () => ({
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
}));
import { createEvent, updateEvent } from '../../services/scheduleService';

const STUDENTS: StudentItem[] = [{ id: 's1', name: 'Aarav Sharma', grade: 'Grade 6' }];

function Harness({ removeEvent = jest.fn() }: { removeEvent?: (id: string, date: string) => Promise<void> }) {
  const [eventsMap, setEventsMap] = React.useState<any>({});
  const h = useEventForm({
    todayISO: '2026-08-25', userEmail: 'teacher@aivorah.test', students: STUDENTS,
    setEventsMap, removeEvent,
  });
  return (
    <View>
      <Text testID="modalVisible">{String(h.modalVisible)}</Text>
      <Text testID="newTitle">{h.newTitle}</Text>
      <Text testID="newTag">{h.newTag}</Text>
      <Text testID="isAllDay">{String(h.isAllDay)}</Text>
      <Text testID="newStartTime">{h.newStartTime}</Text>
      <Text testID="newEndTime">{h.newEndTime}</Text>
      <Text testID="saveError">{h.saveError}</Text>
      <Text testID="saving">{String(h.saving)}</Text>
      <Text testID="editingEventId">{String(h.editingEventId)}</Text>
      <Text testID="eventsMap">{JSON.stringify(eventsMap)}</Text>
      <TouchableOpacity testID="open-modal" onPress={() => h.openModal()} />
      <TouchableOpacity testID="open-modal-preset-time" onPress={() => h.openModal('2026-08-26', '14:00')} />
      <TouchableOpacity testID="open-modal-allday" onPress={() => h.openModal('2026-08-26', undefined, true, 'Holidays and vacations')} />
      <TouchableOpacity testID="open-edit-modal" onPress={() => h.openEditModal({ id: 'ev1', date: '2026-08-25', title: 'Existing', startTime: '11:00', endTime: '12:00', tag: 'Live Class / Lesson', studentId: 'all' })} />
      <TouchableOpacity testID="open-edit-modal-specific-student" onPress={() => h.openEditModal({ id: 'ev2', date: '2026-08-25', title: 'One-on-one', startTime: '11:00', endTime: '12:00', tag: 'Live Class / Lesson', studentId: 's1' })} />
      <TouchableOpacity testID="close-modal" onPress={h.closeModal} />
      <TouchableOpacity testID="set-title" onPress={() => h.setNewTitle('My New Event')} />
      <TouchableOpacity testID="save-event" onPress={h.saveEvent} />
      <TouchableOpacity testID="confirm-delete" onPress={() => h.confirmDeleteEvent({ id: 'ev1', title: 'Existing', date: '2026-08-25' })} />
    </View>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useEventForm', () => {
  test('openModal with no args opens with defaults (09:00-10:00, Live Class / Lesson)', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-modal'));
    expect(screen.getByTestId('modalVisible').props.children).toBe('true');
    expect(screen.getByTestId('newStartTime').props.children).toBe('09:00');
    expect(screen.getByTestId('newEndTime').props.children).toBe('10:00');
    expect(screen.getByTestId('newTag').props.children).toBe('Live Class / Lesson');
    expect(screen.getByTestId('isAllDay').props.children).toBe('false');
  });

  test('openModal with a preset time snaps to the hour and sets a +1hr end time', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-modal-preset-time'));
    expect(screen.getByTestId('newStartTime').props.children).toBe('14:00');
    expect(screen.getByTestId('newEndTime').props.children).toBe('15:00');
  });

  test('openModal with presetAllDay sets 23:59-23:59 and isAllDay true', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-modal-allday'));
    expect(screen.getByTestId('isAllDay').props.children).toBe('true');
    expect(screen.getByTestId('newStartTime').props.children).toBe('23:59');
    expect(screen.getByTestId('newEndTime').props.children).toBe('23:59');
  });

  test('openEditModal pre-fills fields from the passed event and marks editingEventId', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-edit-modal'));
    expect(screen.getByTestId('editingEventId').props.children).toBe('ev1');
    expect(screen.getByTestId('newStartTime').props.children).toBe('11:00');
    expect(screen.getByTestId('modalVisible').props.children).toBe('true');
  });

  test('openEditModal on an event with a specific studentId resolves it from the students list', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-edit-modal-specific-student'));
    expect(screen.getByTestId('editingEventId').props.children).toBe('ev2');
  });

  test('closeModal hides the modal and clears editingEventId', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-edit-modal'));
    await user.press(screen.getByTestId('close-modal'));
    expect(screen.getByTestId('modalVisible').props.children).toBe('false');
    expect(screen.getByTestId('editingEventId').props.children).toBe('null');
  });

  test('saveEvent with an empty title sets a validation error and does not call createEvent', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-modal'));
    await user.press(screen.getByTestId('save-event'));
    expect(screen.getByTestId('saveError').props.children).toBe('Please enter an event title.');
    expect(createEvent).not.toHaveBeenCalled();
  });

  test('saveEvent (create path) posts the payload and adds the new event into eventsMap on success', async () => {
    (createEvent as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new1', title: 'My New Event' }) });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-modal'));
    await user.press(screen.getByTestId('set-title'));
    await user.press(screen.getByTestId('save-event'));

    await waitFor(() => expect(screen.getByTestId('modalVisible').props.children).toBe('false'));
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My New Event', studentId: 'all', createdBy: 'teacher', creatorEmail: 'teacher@aivorah.test',
    }));
    expect(screen.getByTestId('eventsMap').props.children).toContain('new1');
  });

  test('saveEvent (create path) surfaces a server error and keeps the modal open', async () => {
    (createEvent as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Conflict' }) });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-modal'));
    await user.press(screen.getByTestId('set-title'));
    await user.press(screen.getByTestId('save-event'));

    await waitFor(() => expect(screen.getByTestId('saveError').props.children).toBe('Conflict'));
    expect(screen.getByTestId('modalVisible').props.children).toBe('true');
  });

  test('saveEvent (create path) on a network throw sets a fallback error message', async () => {
    (createEvent as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-modal'));
    await user.press(screen.getByTestId('set-title'));
    await user.press(screen.getByTestId('save-event'));

    await waitFor(() => expect(screen.getByTestId('saveError').props.children).toBe('boom'));
  });

  test('saveEvent (edit path) PATCHes and merges into eventsMap keyed by modalDate', async () => {
    (updateEvent as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'ev1', title: 'My New Event' }) });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-edit-modal'));
    await user.press(screen.getByTestId('set-title'));
    await user.press(screen.getByTestId('save-event'));

    await waitFor(() => expect(screen.getByTestId('modalVisible').props.children).toBe('false'));
    expect(updateEvent).toHaveBeenCalledWith('ev1', expect.objectContaining({ title: 'My New Event' }));
  });

  test('saveEvent (edit path) surfaces a server error and keeps the modal open', async () => {
    (updateEvent as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Edit conflict' }) });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('open-edit-modal'));
    await user.press(screen.getByTestId('set-title'));
    await user.press(screen.getByTestId('save-event'));

    await waitFor(() => expect(screen.getByTestId('saveError').props.children).toBe('Edit conflict'));
    expect(screen.getByTestId('modalVisible').props.children).toBe('true');
  });

  test('confirmDeleteEvent calls removeEvent with the event id and date', async () => {
    const removeEvent = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<Harness removeEvent={removeEvent} />);
    await user.press(screen.getByTestId('confirm-delete'));
    await waitFor(() => expect(removeEvent).toHaveBeenCalledWith('ev1', '2026-08-25'));
  });
});
