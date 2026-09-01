import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useTopicAttempts } from '../../hooks/useTopicAttempts';

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function Harness({ studentId, topic }: { studentId: string | undefined; topic: string | undefined }) {
  const h = useTopicAttempts(studentId, topic);
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="error">{String(h.error)}</Text>
      <Text testID="attemptCount">{h.attempts.length}</Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useTopicAttempts', () => {
  test('loads the real attempt history for the given student+topic', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      attempts: [{ attemptNumber: 1, score: 85, passed: true, totalQuestions: 10, correctAnswers: 9, mistakes: 1, timeSpentSeconds: 300, date: '2026-08-20' }],
    })) as any;

    await render(<Harness studentId="s1" topic="Fractions" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('attemptCount').props.children).toBe(1);
  });

  test('missing studentId or topic -> never calls fetch, stays empty', async () => {
    global.fetch = jest.fn() as any;

    await render(<Harness studentId={undefined} topic="Fractions" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByTestId('attemptCount').props.children).toBe(0);
  });

  test('a network failure sets error=true, not a crash', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;

    await render(<Harness studentId="s1" topic="Fractions" />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe('true');
  });
});
