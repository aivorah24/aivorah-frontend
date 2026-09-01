import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useSubjectSummary } from '../../hooks/useSubjectSummary';

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function Harness({ teacherEmail }: { teacherEmail: string | undefined }) {
  const h = useSubjectSummary(teacherEmail);
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="subjectCount">{h.subjects.length}</Text>
      <Text testID="combined">{h.combined ? JSON.stringify(h.combined) : '(none)'}</Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSubjectSummary', () => {
  test('loads real per-subject summary data on mount', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      subjects: [{ subject: 'Mathematics', avgScorePct: 70, avgAttemptSeconds: 600, attemptCount: 2 }],
      combined: { avgScorePct: 70, avgAttemptSeconds: 600, attemptCount: 2 },
    })) as any;

    await render(<Harness teacherEmail="teacher@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('subjectCount').props.children).toBe(1);
    expect(screen.getByTestId('combined').props.children).not.toBe('(none)');
  });

  test('a network failure degrades to empty, not a crash', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;

    await render(<Harness teacherEmail="teacher@test.com" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('subjectCount').props.children).toBe(0);
    expect(screen.getByTestId('combined').props.children).toBe('(none)');
  });

  test('no teacherEmail -> never calls fetch', async () => {
    global.fetch = jest.fn() as any;

    await render(<Harness teacherEmail={undefined} />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
