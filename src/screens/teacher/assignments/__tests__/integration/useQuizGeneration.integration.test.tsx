// Integration test: exercises useQuizGeneration's real multi-branch question
// normalization (MCQ option/correct-answer resolution, fill_blank shape) and
// its NCERT-fallback recovery path together, via a harness component — this
// is real business logic (letter->option mapping, invalid-correct-answer
// recovery), not just wiring, so it belongs at this layer rather than a
// trivial unit test per branch.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useQuizGeneration } from '../../hooks/useQuizGeneration';

jest.mock('../../../../../config/serverUrl', () => 'https://server.test');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

function Harness() {
  const [quizQuestions, setQuizQuestions] = React.useState<any[]>([]);
  const [questions, setQuestions] = React.useState<string[]>([]);
  const [formError, setFormError] = React.useState('');
  const h = useQuizGeneration({
    chapter: 'Fractions', subject: 'Maths', grade: 'Grade 4', curriculum: 'IB PYP',
    quizDifficulty: 'medium', quizCount: 5, quizType: 'mixed', teacherNotes: '', selectedLanguage: '',
    setQuizQuestions, setQuestions, setFormError,
  });
  return (
    <View>
      <Text testID="generating">{String(h.generatingQuiz)}</Text>
      <Text testID="error">{formError}</Text>
      <Text testID="count">{String(quizQuestions.length)}</Text>
      <Text testID="q0-type">{quizQuestions[0]?.type ?? ''}</Text>
      <Text testID="q0-correct">{quizQuestions[0]?.correct ?? ''}</Text>
      <TouchableOpacity testID="generate" onPress={() => h.generateQuiz()} />
    </View>
  );
}

describe('useQuizGeneration integration', () => {
  test('a letter-form correct answer ("B") resolves to the matching option text, not the raw letter', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        questions: [{ question: 'What is 1/2 + 1/2?', options: ['A. 0', 'B. 1', 'C. 2', 'D. 3'], correct: 'B' }],
      }),
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('1'));
    expect(screen.getByTestId('q0-correct').props.children).toBe('1');
    expect(screen.getByTestId('q0-type').props.children).toBe('mcq');
  });

  test('an unmatchable correct answer falls back to the first option rather than dropping the question', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        questions: [{ question: 'Pick one', options: ['Red', 'Blue'], correct: 'Green (not an option)' }],
      }),
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('1'));
    expect(screen.getByTestId('q0-correct').props.children).toBe('Red');
  });

  test('a fill_blank question keeps its type and skips option resolution entirely', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ questions: [{ question: 'The capital of France is ___', type: 'fill_blank', correct: 'Paris' }] }),
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('1'));
    expect(screen.getByTestId('q0-type').props.children).toBe('fill_blank');
    expect(screen.getByTestId('q0-correct').props.children).toBe('Paris');
  });

  test('a question with fewer than 2 real options is dropped entirely', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ questions: [{ question: 'Bad question', options: ['A. Only one'], correct: 'A' }] }),
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toMatch(/Could not generate/));
    expect(screen.getByTestId('count').props.children).toBe('0');
  });

  test('a 404 from generate-quiz falls back to the NCERT quiz endpoint and still populates questions', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/assignments/generate-quiz')) {
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
      }
      if (String(url).includes('/ncert/quiz')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ questions: [{ question: 'NCERT Q1', options: ['X', 'Y'], correct: 0 }] }),
        });
      }
      throw new Error('unexpected url: ' + url);
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('count').props.children).toBe('1'));
    expect(screen.getByTestId('q0-correct').props.children).toBe('X');
  });

  test('empty chapter and subject blocks generation before any network call', async () => {
    global.fetch = jest.fn();
    function EmptyHarness() {
      const [quizQuestions, setQuizQuestions] = React.useState<any[]>([]);
      const [formError, setFormError] = React.useState('');
      const h = useQuizGeneration({
        chapter: '', subject: '', grade: 'Grade 4', curriculum: 'IB PYP',
        quizDifficulty: 'medium', quizCount: 5, quizType: 'mixed', teacherNotes: '', selectedLanguage: '',
        setQuizQuestions, setQuestions: () => {}, setFormError,
      });
      return (
        <View>
          <Text testID="error">{formError}</Text>
          <TouchableOpacity testID="generate" onPress={() => h.generateQuiz()} />
        </View>
      );
    }
    const user = userEvent.setup();
    await render(<EmptyHarness />);
    await user.press(screen.getByTestId('generate'));
    await waitFor(() => expect(screen.getByTestId('error').props.children).toMatch(/Enter a chapter/));
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
