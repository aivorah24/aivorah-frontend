import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useMapToTeacher } from '../../hooks/useMapToTeacher';

jest.mock('../../services/mapToTeacherService', () => ({
  fetchAdminStudents: jest.fn(), fetchAdminTeachers: jest.fn(), assignStudentsToTeacher: jest.fn(),
}));
import { fetchAdminStudents, fetchAdminTeachers, assignStudentsToTeacher } from '../../services/mapToTeacherService';

const STUDENTS = [
  { id: 's1', name: 'Asha', email: 'a@x', grade: 'Grade 5', curriculum: 'CBSE', school: 'TSRA', section: 'A', created_at: '', teacher_student: [] },
  { id: 's2', name: 'Ben', email: 'b@x', grade: 'Grade 5', curriculum: 'CBSE', school: 'TSRA', section: 'A', created_at: '', teacher_student: [{ teacher_id: 't1', subject: 'Maths', teacher: { id: 't1', name: 'Ms Rao', email: 'rao@x' } }] },
];

function Harness() {
  const h = useMapToTeacher();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { h.load(); }, []);
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="visibleCount">{h.visibleStudents.length}</Text>
      <Text testID="assignedCount">{h.assignedCount}</Text>
      <Text testID="assignError">{h.assignError}</Text>
      <TouchableOpacity testID="toggleUnassigned" onPress={() => h.setOnlyUnassigned((v) => !v)}><Text>f</Text></TouchableOpacity>
      <TouchableOpacity testID="selectS1" onPress={() => h.toggleStudent('s1')}><Text>sel</Text></TouchableOpacity>
      <TouchableOpacity testID="setTeacher" onPress={() => h.setTeacherEmail('rao@x')}><Text>t</Text></TouchableOpacity>
      <TouchableOpacity testID="setSubjects" onPress={() => h.setSubjectsText('Maths, Science')}><Text>subj</Text></TouchableOpacity>
      <TouchableOpacity testID="assign" onPress={() => h.assign()}><Text>assign</Text></TouchableOpacity>
    </>
  );
}

describe('useMapToTeacher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchAdminStudents as jest.Mock).mockResolvedValue(STUDENTS);
    (fetchAdminTeachers as jest.Mock).mockResolvedValue([]);
  });

  it('loads students and filters to unassigned only when toggled', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('visibleCount').props.children).toBe(2);
    await user.press(screen.getByTestId('toggleUnassigned'));
    expect(screen.getByTestId('visibleCount').props.children).toBe(1);
  });

  it('requires a teacher and at least one selected student before assigning', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    await user.press(screen.getByTestId('assign'));
    expect(screen.getByTestId('assignError').props.children).toBe('Select a teacher.');
    expect(assignStudentsToTeacher).not.toHaveBeenCalled();
  });

  it('calls assignStudentsToTeacher once per subject, then clears the selection', async () => {
    (assignStudentsToTeacher as jest.Mock).mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    await user.press(screen.getByTestId('selectS1'));
    await user.press(screen.getByTestId('setTeacher'));
    await user.press(screen.getByTestId('setSubjects'));
    await user.press(screen.getByTestId('assign'));
    await waitFor(() => expect(screen.getByTestId('assignedCount').props.children).toBe(1));
    expect(assignStudentsToTeacher).toHaveBeenCalledTimes(2);
    expect(assignStudentsToTeacher).toHaveBeenNthCalledWith(1, { studentIds: ['s1'], teacherEmail: 'rao@x', subject: 'Maths' });
    expect(assignStudentsToTeacher).toHaveBeenNthCalledWith(2, { studentIds: ['s1'], teacherEmail: 'rao@x', subject: 'Science' });
  });
});
