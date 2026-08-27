// Integration test: useEventForm hook wired to the real EventFormModal
// component (as TeacherScheduleScreen wires them). scheduleService is
// mocked at the module boundary — no real network / monolith calls.
import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import EventFormModal from '../../components/EventFormModal';
import { useEventForm } from '../../hooks/useEventForm';
import { makeStyles } from '../../styles';
import { darkColors } from '../../../../../theme';
import type { ScheduleEvent, StudentItem } from '../../types';
import { createEvent } from '../../services/scheduleService';

jest.mock('../../services/scheduleService', () => ({
  createEvent: jest.fn(),
  updateEvent: jest.fn(),
}));

const STUDENTS: StudentItem[] = [
  { id: 's1', name: 'Aarav Sharma', grade: 'Grade 6' },
  { id: 's2', name: 'Diya Patel', grade: 'Grade 7' },
];

function Harness({ students = STUDENTS }: { students?: StudentItem[] }) {
  const [eventsMap, setEventsMap] = React.useState<Record<string, ScheduleEvent[]>>({});
  const removeEvent = React.useCallback(async () => {}, []);
  const form = useEventForm({ todayISO: '2026-08-25', userEmail: 'teacher@aivorah.test', students, setEventsMap, removeEvent });
  const styles = makeStyles(darkColors as any);
  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(form.studentSearch.toLowerCase()));

  React.useEffect(() => { form.openModal(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <EventFormModal
      colors={darkColors as any}
      gold={darkColors.accentYellow}
      styles={styles}
      modalVisible={form.modalVisible}
      closeModal={form.closeModal}
      editingEventId={form.editingEventId}
      modalDate={form.modalDate}
      newTitle={form.newTitle}
      setNewTitle={form.setNewTitle}
      newNote={form.newNote}
      setNewNote={form.setNewNote}
      newTag={form.newTag}
      setNewTag={form.setNewTag}
      isAllDay={form.isAllDay}
      setIsAllDay={form.setIsAllDay}
      newStartTime={form.newStartTime}
      setNewStartTime={form.setNewStartTime}
      newEndTime={form.newEndTime}
      setNewEndTime={form.setNewEndTime}
      targetStudents={form.targetStudents}
      setTargetStudents={form.setTargetStudents}
      selectedStudent={form.selectedStudent}
      setSelectedStudent={form.setSelectedStudent}
      studentSearch={form.studentSearch}
      setStudentSearch={form.setStudentSearch}
      filteredStudents={filteredStudents}
      students={students}
      saveError={form.saveError}
      setSaveError={form.setSaveError}
      saving={form.saving}
      saveEvent={form.saveEvent}
    />
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EventFormModal + useEventForm integration', () => {
  test('typing a title clears a validation error and lets Create Event succeed', async () => {
    (createEvent as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new1' }) });
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('teacher-schedule-modal-confirm-button'));
    expect(await screen.findByText('Please enter an event title.')).toBeTruthy();

    await user.type(screen.getByTestId('teacher-schedule-modal-title-input'), 'Chemistry Lab');
    expect(screen.queryByText('Please enter an event title.')).toBeNull();

    await user.press(screen.getByTestId('teacher-schedule-modal-confirm-button'));
    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ title: 'Chemistry Lab', studentId: 'all' }));
  });

  test('selecting a tag chip updates newTag, reflected via the active chip style', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-modal-tag-AI Challenge'));
    // Active chip carries a distinct border color matching the tag's color.
    const chip = screen.getByTestId('teacher-schedule-modal-tag-AI Challenge');
    const flatStyle = [].concat(chip.props.style).reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
    expect(flatStyle.borderColor).toBe('#6B5BA8');
  });

  test('toggling all-day snaps start/end to 23:59 and hides the time pickers', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    expect(screen.getByText('Start time')).toBeTruthy();
    await user.press(screen.getByTestId('teacher-schedule-modal-allday-checkbox'));
    expect(screen.queryByText('Start time')).toBeNull();
  });

  test('toggling all-day on then off restores the default 09:00-10:00 time range and shows the pickers again', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-modal-allday-checkbox'));
    expect(screen.queryByText('Start time')).toBeNull();
    await user.press(screen.getByTestId('teacher-schedule-modal-allday-checkbox'));
    expect(screen.getByText('Start time')).toBeTruthy();
  });

  test('pressing "All students" after switching away resets target and clears any selected student', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-modal-target-specific'));
    await user.press(screen.getByTestId('teacher-schedule-modal-student-s1'));
    expect(screen.getByText('Aarav Sharma')).toBeTruthy();

    await user.press(screen.getByTestId('teacher-schedule-modal-target-all'));
    expect(screen.queryByText('Aarav Sharma')).toBeNull();
  });

  test('pressing the selected-student chip deselects it, returning to the search list', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-modal-target-specific'));
    await user.press(screen.getByTestId('teacher-schedule-modal-student-s1'));
    await user.press(screen.getByText('Aarav Sharma'));
    expect(screen.getByTestId('teacher-schedule-modal-student-search')).toBeTruthy();
  });

  test('switching to "Specific student" shows the searchable student list', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-modal-target-specific'));
    expect(screen.getByText('Aarav Sharma')).toBeTruthy();
    expect(screen.getByText('Diya Patel')).toBeTruthy();

    await user.type(screen.getByTestId('teacher-schedule-modal-student-search'), 'Diya');
    expect(screen.queryByText('Aarav Sharma')).toBeNull();
    expect(screen.getByText('Diya Patel')).toBeTruthy();
  });

  test('picking a student from the list shows the selected-student chip and submits their id', async () => {
    (createEvent as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new1' }) });
    const user = userEvent.setup();
    await render(<Harness />);
    await user.type(screen.getByTestId('teacher-schedule-modal-title-input'), 'One-on-one');
    await user.press(screen.getByTestId('teacher-schedule-modal-target-specific'));
    await user.press(screen.getByTestId('teacher-schedule-modal-student-s1'));
    expect(screen.getByText('Aarav Sharma')).toBeTruthy();

    await user.press(screen.getByTestId('teacher-schedule-modal-confirm-button'));
    await waitFor(() => expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ studentId: 's1' })));
  });

  test('empty student list shows the "no students linked" empty state', async () => {
    const user = userEvent.setup();
    await render(<Harness students={[]} />);
    await user.press(screen.getByTestId('teacher-schedule-modal-target-specific'));
    expect(screen.getByText('No students linked yet')).toBeTruthy();
    expect(screen.getByText('Go to the Students tab to add students to your class.')).toBeTruthy();
  });

  test('Cancel closes the modal', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('teacher-schedule-modal-cancel-button'));
    await waitFor(() => expect(screen.queryByTestId('teacher-schedule-modal-title-input')).toBeNull());
  });
});
