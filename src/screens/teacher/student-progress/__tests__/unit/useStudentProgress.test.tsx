import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { useStudentProgress } from '../../hooks/useStudentProgress';

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function Harness({ teacherEmail }: { teacherEmail: string | undefined }) {
  const h = useStudentProgress(teacherEmail);
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{String(h.error)}</Text>
      <Text testID="studentCount">{h.students.length}</Text>
      <Text testID="topicCount">{h.topics.length}</Text>
      <Text testID="subjectFilter">{h.subjectFilter ?? '(none)'}</Text>
      <Text testID="availableSubjects">{JSON.stringify(h.availableSubjects)}</Text>
      <Text testID="availableGrades">{JSON.stringify(h.availableGrades)}</Text>
      <TouchableOpacity testID="setSubjectMath" onPress={() => h.setSubjectFilter('Mathematics')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setGrade3" onPress={() => h.setGradeFilter('Grade 3')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="refresh" onPress={() => h.refresh()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useStudentProgress', () => {
  test('loads real heatmap data on mount', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      students: [{ id: 's1', name: 'Aarav', grade: 'Grade 4', curriculum: 'IB PYP', photoUrl: null, scopedSubjects: [], topicStatus: {} }],
      topics: [{ topic: 'Fractions', subject: 'Mathematics' }],
    })) as any;

    await render(<Harness teacherEmail="teacher@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('studentCount').props.children).toBe(1);
    expect(screen.getByTestId('topicCount').props.children).toBe(1);
  });

  test('derives available subjects/grades from the real fetched data, not a hardcoded list', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      students: [
        { id: 's1', name: 'A', grade: 'Grade 4', curriculum: 'IB PYP', photoUrl: null, scopedSubjects: [], topicStatus: {} },
        { id: 's2', name: 'B', grade: 'Grade 6', curriculum: 'IB PYP', photoUrl: null, scopedSubjects: [], topicStatus: {} },
      ],
      topics: [{ topic: 'Fractions', subject: 'Mathematics' }, { topic: 'Grammar', subject: 'English' }],
    })) as any;

    await render(<Harness teacherEmail="teacher@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    expect(JSON.parse(screen.getByTestId('availableSubjects').props.children)).toEqual(['English', 'Mathematics']);
    expect(JSON.parse(screen.getByTestId('availableGrades').props.children)).toEqual(['Grade 4', 'Grade 6']);
  });

  test('a network failure sets error=true and an empty (not stale/undefined) dataset', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;

    await render(<Harness teacherEmail="teacher@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe('true');
    expect(screen.getByTestId('studentCount').props.children).toBe(0);
  });

  test('changing the subject filter re-fetches with the new subject in the request', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonRes({ students: [], topics: [] }));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();

    await render(<Harness teacherEmail="teacher@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    fetchMock.mockClear();

    await user.press(screen.getByTestId('setSubjectMath'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('subject=Mathematics')));
  });

  // Regression test for the reported bug: "when I tap on grade 3, grade 4
  // is missing — I need to go back to All then tap grade 4." RCA: the
  // filter pill OPTIONS were derived from the filtered response itself, so
  // filtering to Grade 3 collapsed the option list down to just Grade 3.
  test('selecting a grade filter does NOT remove the other grades from availableGrades (the reported bug)', async () => {
    const fetchMock = jest.fn((url: string) => {
      // The real backend: an unfiltered request returns both grades; a
      // grade=Grade%203-filtered request returns only that grade's student.
      if (url.includes('grade=Grade')) {
        return jsonRes({
          students: [{ id: 's1', name: 'A', grade: 'Grade 3', curriculum: 'CBSE', photoUrl: null, scopedSubjects: [], topicStatus: {} }],
          topics: [{ topic: 'Fractions', subject: 'Mathematics' }],
        });
      }
      return jsonRes({
        students: [
          { id: 's1', name: 'A', grade: 'Grade 3', curriculum: 'CBSE', photoUrl: null, scopedSubjects: [], topicStatus: {} },
          { id: 's2', name: 'B', grade: 'Grade 4', curriculum: 'CBSE', photoUrl: null, scopedSubjects: [], topicStatus: {} },
        ],
        topics: [{ topic: 'Fractions', subject: 'Mathematics' }],
      });
    });
    global.fetch = fetchMock as any;
    const user = userEvent.setup();

    await render(<Harness teacherEmail="teacher@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(JSON.parse(screen.getByTestId('availableGrades').props.children)).toEqual(['Grade 3', 'Grade 4']);

    await user.press(screen.getByTestId('setGrade3')); // the exact reported repro step

    // The DISPLAYED list correctly narrows to the Grade-3-only response...
    await waitFor(() => expect(screen.getByTestId('studentCount').props.children).toBe(1));
    // ...but the bug was that availableGrades ALSO collapsed to just
    // ['Grade 3'], removing Grade 4 as a selectable option entirely.
    expect(JSON.parse(screen.getByTestId('availableGrades').props.children)).toEqual(['Grade 3', 'Grade 4']);
  });

  test('no teacherEmail -> resolves loading=false without ever calling fetch', async () => {
    global.fetch = jest.fn() as any;

    await render(<Harness teacherEmail={undefined as any} />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
