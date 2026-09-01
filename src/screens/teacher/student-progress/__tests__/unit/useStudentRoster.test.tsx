import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useStudentRoster } from '../../hooks/useStudentRoster';

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function Harness({ teacherEmail }: { teacherEmail: string | undefined }) {
  const h = useStudentRoster(teacherEmail);
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="studentCount">{h.students.length}</Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useStudentRoster', () => {
  test('loads the real roster (with quiz stats) on mount', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([
      { id: 's1', name: 'A', grade: 'Grade 4', curriculum: 'IB PYP', photoUrl: null, studyTime: 60, learningPathTime: 30, assignmentTime: 20, challengeTime: 10, progressPct: 50, quizAttempts: 2, quizBestScore: 85, lastActive: '2026-08-20', needsAttention: false },
    ])) as any;

    await render(<Harness teacherEmail="teacher@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('studentCount').props.children).toBe(1);
  });

  test('a non-array response (e.g. an error object) degrades to an empty roster, not a crash', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ error: 'oops' })) as any;

    await render(<Harness teacherEmail="teacher@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('studentCount').props.children).toBe(0);
  });

  test('a network failure degrades to an empty roster, not a crash', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;

    await render(<Harness teacherEmail="teacher@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('studentCount').props.children).toBe(0);
  });
});
