import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { useWorldData } from '../useWorldData';

jest.setTimeout(15000);

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function Harness({ grade = 'Grade 4' }: any) {
  const hook = useWorldData(grade);
  return (
    <>
      <Text testID="loading">{String(hook.loading)}</Text>
      <Text testID="error">{hook.error}</Text>
      <Text testID="showAnswer">{String(hook.showAnswer)}</Text>
      <Text testID="funChallengeAnswer">{hook.worldData?.funChallenge?.answer ?? ''}</Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useWorldData — successful fetch', () => {
  test('loads real daily content for the given grade', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({
      onThisDay: [{ year: 1969, fact: 'Moon landing.' }],
      funChallenge: { question: 'Why is the sky blue?', answer: 'Light scattering.' },
      date: 'August 18',
    })) as any;

    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('funChallengeAnswer').props.children).toBe('Light scattering.');
    expect(screen.getByTestId('error').props.children).toBe('');
  });

  test('encodes the grade in the real request URL', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({})) as any;
    await render(<Harness grade="Grade 5 & Beyond" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent('Grade 5 & Beyond'))));
  });
});

describe('useWorldData — error handling', () => {
  test('a JSON payload with an error field sets the real friendly error message', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ error: 'Groq is down' })) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe("Could not load today's content. Please try again.");
  });

  test('a network failure sets the same real friendly error message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('error').props.children).toBe("Could not load today's content. Please try again.");
  });
});

describe('useWorldData — refetch on grade change', () => {
  test('changing the grade resets showAnswer and re-fetches', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ funChallenge: { answer: 'A1' } })) as any;
    const { rerender } = await render(<Harness grade="Grade 3" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    (global.fetch as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockResolvedValue(jsonRes({ funChallenge: { answer: 'A2' } }));

    await rerender(<Harness grade="Grade 4" />);

    await waitFor(() => expect(screen.getByTestId('funChallengeAnswer').props.children).toBe('A2'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('Grade%204'));
  });
});
