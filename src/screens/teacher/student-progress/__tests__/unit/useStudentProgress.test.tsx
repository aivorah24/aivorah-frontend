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
      <Text testID="availableSubjects">{JSON.stringify(h.availableSubjects)}</Text>
      <Text testID="availableGrades">{JSON.stringify(h.availableGrades)}</Text>
      <Text testID="availableSections">{JSON.stringify(h.availableSections)}</Text>
      <TouchableOpacity testID="setSubjectMath" onPress={() => h.setFilters((f) => ({ ...f, subject: 'Mathematics' }))}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setGrade3" onPress={() => h.setFilters((f) => ({ ...f, grade: 'Grade 3' }))}><Text>x</Text></TouchableOpacity>
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
      students: [{ id: 's1', name: 'Aarav', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', photoUrl: null, scopedSubjects: [], topicStatus: {} }],
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
        { id: 's1', name: 'A', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', photoUrl: null, scopedSubjects: [], topicStatus: {} },
        { id: 's2', name: 'B', grade: 'Grade 6', curriculum: 'IB PYP', section: 'B', photoUrl: null, scopedSubjects: [], topicStatus: {} },
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

  // The heatmap route has no curriculum query param, so it can't disambiguate
  // the "Grade 3 IB + Grade 4 CBSE" edge case server-side — the hook now does
  // exactly one unfiltered fetch, and every filter change is applied
  // client-side without triggering another network call.
  test('changing filters does NOT re-fetch — filtering is applied client-side to the one loaded dataset', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonRes({
      students: [
        { id: 's1', name: 'A', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', photoUrl: null, scopedSubjects: ['Mathematics'], topicStatus: {} },
        { id: 's2', name: 'B', grade: 'Grade 6', curriculum: 'IB PYP', section: 'B', photoUrl: null, scopedSubjects: ['English'], topicStatus: {} },
      ],
      topics: [{ topic: 'Fractions', subject: 'Mathematics' }],
    }));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();

    await render(<Harness teacherEmail="teacher@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('studentCount').props.children).toBe(2);
    fetchMock.mockClear();

    await user.press(screen.getByTestId('setSubjectMath'));

    await waitFor(() => expect(screen.getByTestId('studentCount').props.children).toBe(1));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Regression test for the reported bug: "when I tap on grade 3, grade 4
  // is missing — I need to go back to All then tap grade 4." RCA (now moot
  // for network calls since there's only one unfiltered fetch, but the
  // option-list-derived-from-filtered-data class of bug is worth guarding):
  // availableGrades must stay derived from the full unfiltered dataset even
  // while a grade filter narrows `students`.
  test('selecting a grade filter does NOT remove the other grades from availableGrades (the reported bug)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonRes({
      students: [
        { id: 's1', name: 'A', grade: 'Grade 3', curriculum: 'CBSE', section: 'A', photoUrl: null, scopedSubjects: [], topicStatus: {} },
        { id: 's2', name: 'B', grade: 'Grade 4', curriculum: 'CBSE', section: 'A', photoUrl: null, scopedSubjects: [], topicStatus: {} },
      ],
      topics: [{ topic: 'Fractions', subject: 'Mathematics' }],
    }));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();

    await render(<Harness teacherEmail="teacher@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(JSON.parse(screen.getByTestId('availableGrades').props.children)).toEqual(['Grade 3', 'Grade 4']);

    await user.press(screen.getByTestId('setGrade3')); // the exact reported repro step

    // The DISPLAYED list correctly narrows to the Grade-3-only student...
    await waitFor(() => expect(screen.getByTestId('studentCount').props.children).toBe(1));
    // ...but the bug was that availableGrades ALSO collapsed to just
    // ['Grade 3'], removing Grade 4 as a selectable option entirely.
    expect(JSON.parse(screen.getByTestId('availableGrades').props.children)).toEqual(['Grade 3', 'Grade 4']);
  });

  // Section filter — new for the "grade and section teacher handles" edge
  // case. availableSections is scoped to the current grade+curriculum only,
  // since section isn't part of the teacher's own class assignment.
  test('availableSections is real, derived from the current grade+curriculum\'s students only', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      students: [
        { id: 's1', name: 'A', grade: 'Grade 4', curriculum: 'IB PYP', section: 'A', photoUrl: null, scopedSubjects: [], topicStatus: {} },
        { id: 's2', name: 'B', grade: 'Grade 4', curriculum: 'IB PYP', section: 'B', photoUrl: null, scopedSubjects: [], topicStatus: {} },
        { id: 's3', name: 'C', grade: 'Grade 6', curriculum: 'IB PYP', section: 'Z', photoUrl: null, scopedSubjects: [], topicStatus: {} },
      ],
      topics: [],
    })) as any;

    await render(<Harness teacherEmail="teacher@test.com" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    // No grade filter yet -> every real section across all students.
    expect(JSON.parse(screen.getByTestId('availableSections').props.children)).toEqual(['A', 'B', 'Z']);

    await userEvent.setup().press(screen.getByTestId('setGrade3')); // narrows to grade='Grade 3', which has no students

    expect(JSON.parse(screen.getByTestId('availableSections').props.children)).toEqual([]);
  });

  test('no teacherEmail -> resolves loading=false without ever calling fetch', async () => {
    global.fetch = jest.fn() as any;

    await render(<Harness teacherEmail={undefined as any} />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
