import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useGradesSections } from '../../hooks/useGradesSections';
import SERVER_URL from '../../../../../config/schoolAdminServerUrl';

const SAMPLE_GRADES = [
  { name: 'Grade 6', archived: false, unassignedCount: 1, totalStudents: 5, sections: [{ name: 'A', archived: false, studentCount: 5 }] },
];

function Harness({ email }: { email: string }) {
  const h = useGradesSections(email);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time load on mount, matching the screen's own useFocusEffect(load) pattern
  React.useEffect(() => { h.load(); }, []);

  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{h.error}</Text>
      <Text testID="gradeCount">{h.grades.length}</Text>
      <Text testID="showArchived">{String(h.showArchived)}</Text>
      <Text testID="promptKind">{h.prompt?.kind || ''}</Text>
      <Text testID="promptValue">{h.promptValue}</Text>
      <Text testID="promptError">{h.promptError}</Text>
      <Text testID="promptBusy">{String(h.promptBusy)}</Text>
      <Text testID="assignFor">{h.assignFor ? `${h.assignFor.grade} · ${h.assignFor.section}` : ''}</Text>
      <Text testID="assignBusy">{String(h.assignBusy)}</Text>
      <Text testID="assignError">{h.assignError}</Text>
      <Text testID="assignTeacherCount">{h.assignTeachers.length}</Text>

      <TouchableOpacity testID="openAddGrade" onPress={() => h.openPrompt({ kind: 'addGrade' })}><Text>open</Text></TouchableOpacity>
      <TouchableOpacity testID="openAddSection" onPress={() => h.openPrompt({ kind: 'addSection', grade: 'Grade 6' })}><Text>open-section</Text></TouchableOpacity>
      <TouchableOpacity testID="openRename" onPress={() => h.openPrompt({ kind: 'renameGrade', grade: 'Grade 6' }, 'Grade 6')}><Text>rename</Text></TouchableOpacity>
      <TouchableOpacity testID="submit" onPress={() => h.submitPrompt()}><Text>submit</Text></TouchableOpacity>
      <TouchableOpacity testID="close" onPress={() => h.closePrompt()}><Text>close</Text></TouchableOpacity>
      <TouchableOpacity testID="setValueGrade7" onPress={() => h.setPromptValue('Grade 7')}><Text>setval</Text></TouchableOpacity>
      <TouchableOpacity testID="setValueC" onPress={() => h.setPromptValue('C')}><Text>setval-c</Text></TouchableOpacity>
      <TouchableOpacity testID="toggleArchive" onPress={() => h.toggleArchiveGrade(SAMPLE_GRADES[0] as any)}><Text>archive</Text></TouchableOpacity>
      <TouchableOpacity testID="toggleShowArchived" onPress={() => h.setShowArchived((v) => !v)}><Text>show</Text></TouchableOpacity>
      <TouchableOpacity testID="assignTeacher" onPress={() => h.assignTeacherNow('t1@school.test')}><Text>assign</Text></TouchableOpacity>
      <TouchableOpacity testID="closeAssign" onPress={() => h.closeAssignTeacher()}><Text>close-assign</Text></TouchableOpacity>
    </>
  );
}

global.fetch = jest.fn();

describe('useGradesSections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads grades successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ grades: SAMPLE_GRADES }) });

    await render(<Harness email="admin@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/school-admin/grades-sections?adminEmail=admin%40test.com`);
    expect(screen.getByTestId('gradeCount').props.children).toBe(1);
    expect(screen.getByTestId('error').props.children).toBe('');
  });

  it('surfaces a load error message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Failed to load grades & sections' }) });

    await render(<Harness email="admin@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe('Failed to load grades & sections');
  });

  it('validates an empty name before submitting', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ grades: [] }) });
    const user = userEvent.setup();
    await render(<Harness email="admin@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('openAddGrade'));
    expect(screen.getByTestId('promptKind').props.children).toBe('addGrade');

    await user.press(screen.getByTestId('submit'));
    expect(screen.getByTestId('promptError').props.children).toBe('Please enter a name.');
    // No mutation call was made — only the initial load fetch happened.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('adds a grade successfully and closes the prompt', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ grades: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, grades: SAMPLE_GRADES }) });
    const user = userEvent.setup();
    await render(<Harness email="admin@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('openAddGrade'));
    await user.press(screen.getByTestId('setValueGrade7'));
    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(screen.getByTestId('promptKind').props.children).toBe(''));
    expect(screen.getByTestId('gradeCount').props.children).toBe(1);
    expect(global.fetch).toHaveBeenLastCalledWith(
      `${SERVER_URL}/school-admin/grades?adminEmail=admin%40test.com`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Grade 7' }) })
    );
  });

  it('keeps the prompt open and shows the server error on a failed mutation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ grades: [] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'That grade already exists' }) });
    const user = userEvent.setup();
    await render(<Harness email="admin@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('openAddGrade'));
    await user.press(screen.getByTestId('setValueGrade7'));
    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(screen.getByTestId('promptError').props.children).toBe('That grade already exists'));
    expect(screen.getByTestId('promptKind').props.children).toBe('addGrade'); // still open
  });

  it('pre-fills the rename prompt value', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ grades: SAMPLE_GRADES }) });
    const user = userEvent.setup();
    await render(<Harness email="admin@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('openRename'));
    expect(screen.getByTestId('promptKind').props.children).toBe('renameGrade');
    expect(screen.getByTestId('promptValue').props.children).toBe('Grade 6');
  });

  it('toggles archive state via the archive API and silently ignores failure', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ grades: SAMPLE_GRADES }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'boom' }) });
    const user = userEvent.setup();
    await render(<Harness email="admin@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('toggleArchive'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(global.fetch).toHaveBeenLastCalledWith(
      `${SERVER_URL}/school-admin/grades/Grade%206/archive?adminEmail=admin%40test.com`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ archived: true }) })
    );
    // Failure is silent: state is unchanged, no error surfaced.
    expect(screen.getByTestId('gradeCount').props.children).toBe(1);
    expect(screen.getByTestId('error').props.children).toBe('');
  });

  it('adding a section opens the assign-class-teacher prompt, pre-fetches teachers, and assigning calls the API', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ grades: SAMPLE_GRADES }) }) // initial load
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, grades: SAMPLE_GRADES }) }) // POST add section
      .mockResolvedValueOnce({ ok: true, json: async () => ([{ id: 't1', name: 'Asha', email: 't1@school.test', teaches: [] }]) }) // GET teachers
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) }); // PATCH assign
    const user = userEvent.setup();
    await render(<Harness email="admin@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('openAddSection'));
    await user.press(screen.getByTestId('setValueC'));
    await user.press(screen.getByTestId('submit'));

    // Prompt closes, assign-teacher step opens scoped to the new section.
    await waitFor(() => expect(screen.getByTestId('promptKind').props.children).toBe(''));
    await waitFor(() => expect(screen.getByTestId('assignFor').props.children).toBe('Grade 6 · C'));
    await waitFor(() => expect(screen.getByTestId('assignTeacherCount').props.children).toBe(1));

    await user.press(screen.getByTestId('assignTeacher'));
    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(
      `${SERVER_URL}/school-admin/grades/Grade%206/sections/C/class-teacher?adminEmail=admin%40test.com`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ teacherEmail: 't1@school.test' }) })
    ));
    await waitFor(() => expect(screen.getByTestId('assignFor').props.children).toBe(''));
  });

  it('closing the assign-teacher prompt without picking anyone does not call the API', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ grades: SAMPLE_GRADES }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, grades: SAMPLE_GRADES }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ([]) });
    const user = userEvent.setup();
    await render(<Harness email="admin@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('openAddSection'));
    await user.press(screen.getByTestId('setValueC'));
    await user.press(screen.getByTestId('submit'));
    await waitFor(() => expect(screen.getByTestId('assignFor').props.children).toBe('Grade 6 · C'));

    await user.press(screen.getByTestId('closeAssign'));
    expect(screen.getByTestId('assignFor').props.children).toBe('');
    expect(global.fetch).toHaveBeenCalledTimes(3); // load + add-section + teachers — no class-teacher PATCH
  });

  it('a failed teacher load shows an error in the assign prompt instead of an empty, silent list', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ grades: SAMPLE_GRADES }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, grades: SAMPLE_GRADES }) })
      .mockRejectedValueOnce(new Error('Network down')); // GET teachers
    const user = userEvent.setup();
    await render(<Harness email="admin@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('openAddSection'));
    await user.press(screen.getByTestId('setValueC'));
    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(screen.getByTestId('assignFor').props.children).toBe('Grade 6 · C'));
    await waitFor(() => expect(String(screen.getByTestId('assignError').props.children)).not.toBe(''));
  });

  it('toggles showArchived', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ grades: [] }) });
    const user = userEvent.setup();
    await render(<Harness email="admin@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    expect(screen.getByTestId('showArchived').props.children).toBe('false');
    await user.press(screen.getByTestId('toggleShowArchived'));
    expect(screen.getByTestId('showArchived').props.children).toBe('true');
  });
});
