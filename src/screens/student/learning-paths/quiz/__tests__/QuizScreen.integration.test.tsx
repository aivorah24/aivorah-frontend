// Light-touch integration test for QuizScreen — verifies real phase routing
// (loading -> quiz -> result) driven by the real useQuiz hook against a mocked
// fetch. QuizQuestion/QuizResult are stubbed since their own deep behavior is
// covered by useQuiz's hook tests and would just duplicate that coverage here.

import React from 'react';
import { clearQuizResults, saveQuizResult } from '../resultCache';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import QuizScreen from '../QuizScreen';

jest.setTimeout(15000);

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#fa0', textMuted: '#888' }, isDark: true }),
}));

// B004 regression: the real AuthContext user object never has an `id` field
// — only StudentDataContext.studentId is ever resolved. This mock matches
// that real shape (no id on user) so this test would have caught the bug.
jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'a@a.com', role: 'student' } }),
}));

jest.mock('../../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ studentId: 'real-resolved-student-id', completeLesson: jest.fn(), addXP: jest.fn(), recordStudySeconds: jest.fn() }),
}));

jest.mock('../../../../../components/common/ScreenLayout', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: ({ children }: any) => <View>{children}</View> };
});

jest.mock('../components/QuizResult', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: (props: any) => <Text testID="quiz-result">score:{props.score}</Text> };
});

jest.mock('../components/QuizQuestion', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: (props: any) => <Text testID="quiz-question" onPress={props.onBack}>{props.q?.question}</Text> };
});

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function navProp() {
  return { navigate: jest.fn(), openDrawer: jest.fn(), goBack: jest.fn() };
}

function routeProp(params: any = {}) {
  return { params: { topic: 'Fractions', grade: 'Grade 3', subject: 'Mathematics', curriculum: 'IB PYP', ...params } };
}

beforeEach(() => {
  clearQuizResults();
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/ibpyp/quiz')) return jsonRes({ questions: [
      { type: 'mcq', question: 'What is 1/2 + 1/2?', options: ['1', '2', '3', '4'], correct: 0, hint: 'h', explanation: 'e' },
    ] });
    return jsonRes({});
  }) as any;
});

describe('QuizScreen — phase routing', () => {
  test('shows a real loading state while the quiz is being generated', async () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as any;
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);

    expect(screen.getByText('Preparing your practice test…')).toBeTruthy();
  });

  test('renders the real quiz question view once questions load', async () => {
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);

    await waitFor(() => expect(screen.getByTestId('quiz-question')).toBeTruthy());
    expect(screen.getByText('What is 1/2 + 1/2?')).toBeTruthy();
  });
});

describe('QuizScreen — revisiting', () => {
  const quizCalls = () => (global.fetch as jest.Mock).mock.calls.filter(([u]) => String(u).includes('/ibpyp/quiz')).length;

  test('reopening Practice for a topic already tried shows its last result, not a new test', async () => {
    saveQuizResult('real-resolved-student-id', 'Mathematics', 'Fractions', {
      questions: [{ question: 'Q1' }, { question: 'Q2' }], perQuestionResults: [], score: 2,
      attemptNumber: 1, timeSpentSeconds: 30, explanations: {},
    });
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    expect(await screen.findByText('score:2')).toBeTruthy();
    expect(quizCalls()).toBe(0);
  });

  test('after a reload the last result comes from the server', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/attempts')) return jsonRes({ attempts: [
        { topic: 'Fractions', attemptNumber: 2, timeSpentSeconds: 40, questions: [
          { question: 'Q1', studentAnswer: '1', correctAnswer: '1', isCorrect: true },
          { question: 'Q2', studentAnswer: '3', correctAnswer: '2', isCorrect: false },
        ] },
      ] });
      return jsonRes({});
    }) as any;
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    expect(await screen.findByText('score:1')).toBeTruthy();
    expect(quizCalls()).toBe(0);
  });

  test('a topic never tried, revisited after leaving, starts a test', async () => {
    const listeners: Record<string, () => void> = {};
    const nav = { ...navProp(), addListener: jest.fn((evt: string, cb: () => void) => { listeners[evt] = cb; return () => {}; }) };
    const { act } = require('@testing-library/react-native');
    await render(<QuizScreen navigation={nav} route={routeProp()} />);
    await waitFor(() => expect(screen.getByTestId('quiz-question')).toBeTruthy());
    expect(quizCalls()).toBe(1);

    await act(async () => { listeners.focus(); }); // initial focus, never left: no refetch
    expect(quizCalls()).toBe(1);
    await act(async () => { listeners.blur(); listeners.focus(); }); // left, then came back
    await waitFor(() => expect(quizCalls()).toBe(2));
    expect(await screen.findByTestId('quiz-question')).toBeTruthy();
  });
});

describe('QuizScreen — back navigation', () => {
  const lessonParams = { returnTo: 'LessonScreen', returnParams: { topicId: 't1' } };
  const navWithHistory = (prevName: string) => ({
    ...navProp(),
    getState: () => ({
      routes: [{ key: 'a', name: prevName }, { key: 'q', name: 'Quiz' }],
      history: [{ type: 'route', key: 'a' }, { type: 'route', key: 'q' }],
    }),
  });

  test('pops back to the origin instead of pushing it, so origin back does not reopen the quiz', async () => {
    const nav = navWithHistory('LessonScreen');
    await render(<QuizScreen navigation={nav} route={routeProp(lessonParams)} />);
    fireEvent.press(await screen.findByTestId('quiz-question'));

    expect(nav.goBack).toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  test('navigates to the origin when it is not the previous history entry', async () => {
    const nav = navWithHistory('Dashboard');
    await render(<QuizScreen navigation={nav} route={routeProp(lessonParams)} />);
    fireEvent.press(await screen.findByTestId('quiz-question'));

    expect(nav.navigate).toHaveBeenCalledWith('LessonScreen', { topicId: 't1' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });
});
