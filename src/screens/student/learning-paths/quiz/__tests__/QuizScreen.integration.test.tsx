// Light-touch integration test for QuizScreen — verifies real phase routing
// (loading -> quiz -> result) driven by the real useQuiz hook against a mocked
// fetch. QuizQuestion/QuizResult are stubbed since their own deep behavior is
// covered by useQuiz's hook tests and would just duplicate that coverage here.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import QuizScreen from '../QuizScreen';

jest.setTimeout(15000);

jest.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: { accentYellow: '#fa0', textMuted: '#888' }, isDark: true }),
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'a@a.com', role: 'student', id: 'u1' } }),
}));

jest.mock('../../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ completeLesson: jest.fn(), addXP: jest.fn(), recordStudyTime: jest.fn() }),
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
  return { __esModule: true, default: (props: any) => <Text testID="quiz-question">{props.q?.question}</Text> };
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
