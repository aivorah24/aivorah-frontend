// Integration test for QuizScreen: the Practice start page (Take a Test /
// History), the History list and a past test's report, and the live test
// flow (loading -> question), driven by the real useQuiz / usePracticeHistory
// hooks against a mocked fetch. QuizQuestion/QuizResult are stubbed: their own
// behaviour is covered by useQuiz's hook tests and QuizResult's tests.

import React from 'react';
import { clearQuizResults } from '../resultCache';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';
import QuizScreen from '../QuizScreen';

jest.setTimeout(15000);

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#fa0', textMuted: '#888', textMain: '#fff', textDim: '#666', cardDark: '#111', bgDark: '#000', borderColor: '#333' }, isDark: true }),
}));

// B004 regression: the real AuthContext user object never has an `id` field
// — only StudentDataContext.studentId is ever resolved.
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

jest.mock('../../../../../components/common/Header', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ title, onBack }: any) => (
      <TouchableOpacity testID="header-back" onPress={onBack}><Text>{title}</Text></TouchableOpacity>
    ),
  };
});

jest.mock('../components/QuizResult', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => (
      <>
        <Text testID="quiz-result">score:{props.score}/{props.questions.length}{props.review ? ' review' : ''}</Text>
        {!!props.takenAt && <Text testID="taken-at">{props.takenAt}</Text>}
        <Text testID="spoken-in-report">{String(props.perQuestionResults.some((q: any) => q.type === 'spoken'))}</Text>
        <TouchableOpacity testID="result-history" onPress={props.onHistory}><Text>history</Text></TouchableOpacity>
        <TouchableOpacity testID="result-retry" onPress={props.onRetry}><Text>retry</Text></TouchableOpacity>
      </>
    ),
  };
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

const ATTEMPTS = [
  // out of order on purpose: the list must show newest first
  { id: 'old', topic: 'Fractions', attemptNumber: 1, score: 33, passed: false, totalQuestions: 3, correctAnswers: 1, timeSpentSeconds: 50,
    createdAt: '2026-11-05T09:15:00', questions: [
      { question: 'Q1', studentAnswer: '1', correctAnswer: '1', isCorrect: true },
      { question: 'Q2', studentAnswer: '3', correctAnswer: '2', isCorrect: false },
      { question: 'Explain', studentAnswer: 'halves', correctAnswer: '', isCorrect: false, type: 'spoken', evaluation: { score: 4 } },
    ] },
  { id: 'new', topic: 'Fractions', attemptNumber: 2, score: 100, passed: true, totalQuestions: 2, correctAnswers: 2, timeSpentSeconds: 65,
    createdAt: '2026-11-07T14:40:00', questions: [
      { question: 'Q1', studentAnswer: '1', correctAnswer: '1', isCorrect: true },
      { question: 'Q2', studentAnswer: '2', correctAnswer: '2', isCorrect: true },
    ] },
  { id: 'other', topic: 'Decimals', attemptNumber: 1, score: 50, passed: false, totalQuestions: 2, correctAnswers: 1, timeSpentSeconds: 20,
    createdAt: '2026-11-06T10:00:00', questions: [{ question: 'D1', isCorrect: true }] },
];

const quizCalls = () => (global.fetch as jest.Mock).mock.calls.filter(([u]) => String(u).includes('/ibpyp/quiz')).length;

function mockFetch({ attempts = [] as any[], quiz = true } = {}) {
  global.fetch = jest.fn((url: string) => {
    if (url.includes('/attempts')) return jsonRes({ attempts });
    if (url.includes('/ibpyp/quiz')) {
      return quiz ? jsonRes({ questions: [
        { type: 'mcq', question: 'What is 1/2 + 1/2?', options: ['1', '2', '3', '4'], correct: 0, hint: 'h', explanation: 'e' },
      ] }) : new Promise(() => {});
    }
    if (url.includes('/ibpyp/explain-wrong')) return jsonRes({ explanation: 'because' });
    return jsonRes({});
  }) as any;
}

beforeEach(() => {
  clearQuizResults();
  mockFetch();
});

describe('QuizScreen — start page', () => {
  test('opens on Take a Test / History, without generating a test', async () => {
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    expect(await screen.findByTestId('practice-take-test')).toBeTruthy();
    expect(screen.getByTestId('practice-history')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('No tests yet. Your results will be saved here.')).toBeTruthy());
    expect(quizCalls()).toBe(0);
  });

  test('Take a Test generates questions (loading first)', async () => {
    mockFetch({ quiz: false });
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    fireEvent.press(await screen.findByTestId('practice-take-test'));
    expect(await screen.findByText('Preparing your practice test…')).toBeTruthy();
  });

  test('Take a Test -> the first question', async () => {
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    fireEvent.press(await screen.findByTestId('practice-take-test'));
    expect(await screen.findByText('What is 1/2 + 1/2?')).toBeTruthy();
    expect(quizCalls()).toBe(1);
  });

  test('the History card summarises past tests', async () => {
    mockFetch({ attempts: ATTEMPTS });
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    expect(await screen.findByText(/^2 past tests · last 100% on 7 Nov 2026, 2:40 pm$/)).toBeTruthy();
  });
});

describe('QuizScreen — history', () => {
  test('lists this topic\'s past tests, newest first, with date, time and score', async () => {
    mockFetch({ attempts: ATTEMPTS });
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    fireEvent.press(await screen.findByTestId('practice-history'));
    await waitFor(() => expect(screen.getAllByTestId('history-row')).toHaveLength(2));
    const rows = screen.getAllByTestId('history-row');
    expect(rows[0].props.accessibilityLabel).toBe('Test from 7 Nov 2026, 2:40 pm, 100 percent');
    expect(rows[1].props.accessibilityLabel).toBe('Test from 5 Nov 2026, 9:15 am, 33 percent');
    expect(screen.queryByText(/Decimals/)).toBeNull();
  });

  test('tapping a past test opens its report (with the spoken answer); back returns to the list', async () => {
    mockFetch({ attempts: ATTEMPTS });
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    fireEvent.press(await screen.findByTestId('practice-history'));
    await waitFor(() => expect(screen.getAllByTestId('history-row')).toHaveLength(2));
    fireEvent.press(screen.getAllByTestId('history-row')[1]);

    expect(await screen.findByText('score:1/3 review')).toBeTruthy();
    expect(screen.getByTestId('taken-at').props.children).toBe('5 Nov 2026, 9:15 am');
    expect(screen.getByTestId('spoken-in-report').props.children).toBe('true');
    // Aivorah's explanation is fetched for the wrong (non-spoken) answer only
    await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.filter(([u]) => String(u).includes('/explain-wrong'))).toHaveLength(1));

    fireEvent.press(screen.getByTestId('result-history'));
    expect(await screen.findAllByTestId('history-row')).toHaveLength(2);
  });

  test('no past tests -> a message and a way to take one', async () => {
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    fireEvent.press(await screen.findByTestId('practice-history'));
    expect(await screen.findByText('No tests for this topic yet.')).toBeTruthy();
    fireEvent.press(screen.getByText('Take a Test'));
    expect(await screen.findByText('What is 1/2 + 1/2?')).toBeTruthy();
  });

  test('a new test from History is numbered after the past ones', async () => {
    mockFetch({ attempts: ATTEMPTS });
    await render(<QuizScreen navigation={navProp()} route={routeProp()} />);
    await waitFor(() => expect(screen.getByText(/2 past tests/)).toBeTruthy());
    fireEvent.press(screen.getByTestId('practice-take-test'));
    expect(await screen.findByText('What is 1/2 + 1/2?')).toBeTruthy();
  });
});

describe('QuizScreen — revisiting', () => {
  test('coming back after leaving shows the start page again (fresh session)', async () => {
    const listeners: Record<string, () => void> = {};
    const nav = { ...navProp(), addListener: jest.fn((evt: string, cb: () => void) => { listeners[evt] = cb; return () => {}; }) };
    await render(<QuizScreen navigation={nav} route={routeProp()} />);
    fireEvent.press(await screen.findByTestId('practice-take-test'));
    expect(await screen.findByTestId('quiz-question')).toBeTruthy();

    await act(async () => { listeners.blur(); listeners.focus(); });
    expect(await screen.findByTestId('practice-take-test')).toBeTruthy();
    expect(quizCalls()).toBe(1);
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
    fireEvent.press(await screen.findByTestId('header-back'));

    expect(nav.goBack).toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  test('navigates to the origin when it is not the previous history entry', async () => {
    const nav = navWithHistory('Dashboard');
    await render(<QuizScreen navigation={nav} route={routeProp(lessonParams)} />);
    fireEvent.press(await screen.findByTestId('header-back'));

    expect(nav.navigate).toHaveBeenCalledWith('LessonScreen', { topicId: 't1' });
    expect(nav.goBack).not.toHaveBeenCalled();
  });

  test('back from the questions also returns to the origin', async () => {
    const nav = navWithHistory('LessonScreen');
    await render(<QuizScreen navigation={nav} route={routeProp(lessonParams)} />);
    fireEvent.press(await screen.findByTestId('practice-take-test'));
    fireEvent.press(await screen.findByTestId('quiz-question'));
    expect(nav.goBack).toHaveBeenCalled();
  });
});
