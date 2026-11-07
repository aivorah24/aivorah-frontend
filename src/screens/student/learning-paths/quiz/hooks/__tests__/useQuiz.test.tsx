import React from 'react';
import { clearQuizResults } from '../../resultCache';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import { useQuiz } from '../useQuiz';

jest.setTimeout(15000);

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

const mcqQuestions = [
  { type: 'mcq', question: 'Q1', options: ['A', 'B', 'C', 'D'], correct: 1, hint: 'h1', explanation: 'e1' },
  { type: 'mcq', question: 'Q2', options: ['A', 'B', 'C', 'D'], correct: 0, hint: 'h2', explanation: 'e2' },
];

// POST /ibpyp/evaluate-explanation for the spoken last question
const GOOD_EVAL = { score: 8, outOf: 10, passed: true, verdict: 'excellent', covered: ['the main idea'], missing: [], mistakes: [], feedback: 'Well explained!' };
const LOW_EVAL = { ...GOOD_EVAL, score: 3, passed: false, verdict: 'partial', feedback: 'Add the main idea next time.' };
const SPOKEN = 'Tenali Rama used his clever wit to make the king and queen friends again';

const fillQuestion = [
  { type: 'fill_blank', question: 'The cat sat on the ___', correct: 'mat', hint: 'h', explanation: 'e' },
];

function mockFetchRoutes(overrides: Record<string, any> = {}) {
  global.fetch = jest.fn((url: string, opts?: any) => {
    if (url.includes('/ibpyp/quiz')) return jsonRes(overrides.quiz ?? { questions: mcqQuestions });
    if (url.includes('/assignments/validate-fill-blank')) {
      const body = JSON.parse(opts.body);
      if (overrides.fillValidate) return overrides.fillValidate(body);
      return jsonRes({ correct: body.studentAnswer === 'mat' });
    }
    if (url.includes('/ibpyp/explain-wrong')) return jsonRes({ explanation: 'explained' });
    if (url.includes('/ibpyp/evaluate-explanation')) {
      if (overrides.evaluate) return overrides.evaluate(JSON.parse(opts.body));
      return jsonRes(GOOD_EVAL);
    }
    if (url.includes('/ibpyp/track-result')) return jsonRes({});
    if (url.includes('/student/track-attempt')) return jsonRes({});
    return jsonRes({});
  }) as any;
}

function Harness({ questions, studentId, practiceQuiz, keyPoints, autoStart = true }: { questions?: any; studentId?: string; practiceQuiz?: any[]; keyPoints?: string[]; autoStart?: boolean } = {}) {
  const completeLesson = React.useMemo(() => jest.fn(), []);
  const addXP = React.useMemo(() => jest.fn(), []);
  const recordStudySeconds = React.useMemo(() => jest.fn(), []);
  const recordQuizResult = React.useMemo(() => jest.fn(), []);
  const navigation = React.useMemo(() => ({ goBack: jest.fn(), navigate: jest.fn() }), []);
  React.useEffect(() => {
    (globalThis as any).__lastMocks = { completeLesson, addXP, recordStudySeconds, recordQuizResult, navigation };
  }, [completeLesson, addXP, recordStudySeconds, recordQuizResult, navigation]);

  const h = useQuiz({
    topic: 'Topic', grade: 'Grade 6', subject: 'English', curriculum: 'CBSE',
    // Default here matches the REAL StudentDataContext.studentId shape (a
    // resolved id string) — distinct from AuthContext's user.id, which the
    // real app never populates (B004's root cause). studentId is explicitly
    // undefined-able per-test to cover that missing case.
    userEmail: 'a@a.com', userRole: 'student', studentId, practiceQuiz, keyPoints,
    navigation,
    completeLesson,
    addXP,
    recordStudySeconds,
    recordQuizResult,
  });

  // The screen starts a test from the Practice start page ("Take a Test").
  const started = React.useRef(false);
  React.useEffect(() => {
    if (autoStart && !started.current && h.phase === 'hub') { started.current = true; h.startTest(); }
  });

  return (
    <>
      <Text testID="phase">{h.phase}</Text>
      <Text testID="currentQ">{h.currentQ}</Text>
      <Text testID="score">{h.score}</Text>
      <Text testID="mcqSelected">{String(h.mcqSelected)}</Text>
      <Text testID="mcqDone">{String(h.mcqDone)}</Text>
      <Text testID="showMcqHint">{String(h.showMcqHint)}</Text>
      <Text testID="fillFeedback">{h.fillFeedback}</Text>
      <Text testID="explanation">{h.explanation}</Text>
      <TouchableOpacity testID="answer0" onPress={() => h.handleMcqAnswer(0)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="answer1" onPress={() => h.handleMcqAnswer(1)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setFillMat" onPress={() => h.setFillInput('mat')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setFillWrong" onPress={() => h.setFillInput('wrong')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="submitFill" onPress={() => h.handleFillSubmit()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="goNextCorrect" onPress={() => h.goNext(true)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="goNextWrong" onPress={() => h.goNext(false)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="goPrev" onPress={() => h.goPrev()}><Text>x</Text></TouchableOpacity>
      <Text testID="qType">{h.questions[h.currentQ]?.type}</Text>
      <Text testID="qCount">{h.questions.length}</Text>
      <Text testID="spokenStatus">{h.spokenStatus}</Text>
      <Text testID="spokenError">{h.spokenError}</Text>
      <Text testID="results">{JSON.stringify(h.perQuestionResultsRef.current)}</Text>
      <TouchableOpacity testID="setSpoken" onPress={() => h.setSpokenText(SPOKEN)}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setSpokenShort" onPress={() => h.setSpokenText('um ok')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="submitSpoken" onPress={() => h.submitSpoken()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

async function answerSpoken(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.getByTestId('qType').props.children).toBe('spoken'));
  await user.press(screen.getByTestId('setSpoken'));
  await user.press(screen.getByTestId('submitSpoken'));
}

beforeEach(() => {
  clearQuizResults();
  jest.clearAllMocks();
  mockFetchRoutes();
});

describe('useQuiz — start page', () => {
  test('opens on the start page and generates nothing until a test is started', async () => {
    await render(<Harness autoStart={false} />);
    expect(screen.getByTestId('phase').props.children).toBe('hub');
    await new Promise((r) => setTimeout(r, 50));
    expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => url.includes('/ibpyp/quiz'))).toHaveLength(0);
  });
});

describe('useQuiz — fetching', () => {
  test('loads real questions from the server and moves to the real quiz phase', async () => {
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));
  });

  test('a real fetch failure alerts and navigates back, never gets stuck loading', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<Harness />);
    await waitFor(() => expect((globalThis as any).__lastMocks.navigation.goBack).toHaveBeenCalled());
  });

  test('a real empty-questions response is treated as an error (alert + goBack)', async () => {
    mockFetchRoutes({ quiz: { questions: [] } });
    await render(<Harness />);
    await waitFor(() => expect((globalThis as any).__lastMocks.navigation.goBack).toHaveBeenCalled());
  });
});

describe('useQuiz — teacher-authored practiceQuiz (preset path)', () => {
  test('when practiceQuiz is provided, it is used directly and /ibpyp/quiz is never called', async () => {
    const preset = [{ type: 'mcq', question: 'Preset Q', options: ['A', 'B', 'C', 'D'], correct: 2, hint: 'h', explanation: 'e' }];
    await render(<Harness practiceQuiz={preset} />);

    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/ibpyp/quiz'), expect.anything());
  });
});

describe('useQuiz — MCQ flow', () => {
  test('a real correct first answer locks the question and fetches its real explanation', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('answer1')); // correct index for Q1

    await waitFor(() => expect(screen.getByTestId('mcqDone').props.children).toBe('true'));
    await waitFor(() => expect(screen.getByTestId('explanation').props.children).not.toBe(''));
  });

  test('a real first wrong answer unlocks for retry and shows the hint, does not lock yet', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('answer0')); // wrong for Q1

    await waitFor(() => expect(screen.getByTestId('showMcqHint').props.children).toBe('true'));
    expect(screen.getByTestId('mcqDone').props.children).toBe('false');
    expect(screen.getByTestId('mcqSelected').props.children).toBe('null');
    jest.useRealTimers();
  });

  test('a real second wrong answer locks the question and fetches a real wrong-answer explanation', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('answer0')); // 1st wrong
    await waitFor(() => expect(screen.getByTestId('showMcqHint').props.children).toBe('true'));
    await user.press(screen.getByTestId('answer0')); // 2nd wrong

    await waitFor(() => expect(screen.getByTestId('mcqDone').props.children).toBe('true'));
    jest.useRealTimers();
  });
});

describe('useQuiz — fill-blank flow', () => {
  test('a real correct answer sets fillFeedback to "correct" with a real explanation', async () => {
    const user = userEvent.setup();
    await render(<Harness questions={fillQuestion} />);
    mockFetchRoutes({ quiz: { questions: fillQuestion } });
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('setFillMat'));
    await user.press(screen.getByTestId('submitFill'));

    await waitFor(() => expect(screen.getByTestId('fillFeedback').props.children).toBe('correct'));
  });

  test('a real 1st wrong answer sets "wrong1", a real 2nd sets "wrong2", a real 3rd reveals it', async () => {
    mockFetchRoutes({ quiz: { questions: fillQuestion } });
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('setFillWrong'));
    await user.press(screen.getByTestId('submitFill'));
    await waitFor(() => expect(screen.getByTestId('fillFeedback').props.children).toBe('wrong1'));

    await user.press(screen.getByTestId('submitFill'));
    await waitFor(() => expect(screen.getByTestId('fillFeedback').props.children).toBe('wrong2'));

    await user.press(screen.getByTestId('submitFill'));
    await waitFor(() => expect(screen.getByTestId('fillFeedback').props.children).toBe('revealed'));
  });

  test('a real network failure on validation gives the student the real benefit of the doubt ("correct")', async () => {
    mockFetchRoutes({ quiz: { questions: fillQuestion }, fillValidate: () => Promise.reject(new Error('down')) });
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('setFillWrong'));
    await user.press(screen.getByTestId('submitFill'));

    await waitFor(() => expect(screen.getByTestId('fillFeedback').props.children).toBe('correct'));
  });
});

describe('useQuiz — navigation between questions', () => {
  test('goNext on a real non-final question advances currentQ and resets per-question state', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('goNextCorrect'));

    expect(screen.getByTestId('currentQ').props.children).toBe(1);
    expect(screen.getByTestId('phase').props.children).toBe('quiz');
  });

  // Regression test for Bug #22's "XP inconsistent between pages" report.
  // RCA: finishQuiz() called BOTH completeLesson() (real, server-persisted,
  // flat 150 XP, only once per topic — see aivorah-leaderboard-service's
  // completeLesson()) AND addXP() (a SEPARATE, purely local-only bump —
  // never sent to any server) for the exact same quiz-completion event.
  // Effects: (1) a first-time pass showed 150+60/100 XP locally but only
  // 150 was ever persisted — the extra addXP() amount vanished the moment
  // any other screen refetched real stats; (2) a REPEAT pass of an
  // already-completed topic still called addXP() every single time (no
  // idempotency, unlike completeLesson()'s server-side check), so local XP
  // kept climbing on every retry while the server total never moved; (3) a
  // failing attempt (pct<60) showed +30 XP that was 100% fake — completeLesson
  // isn't even called below 60%, so nothing was ever persisted for it.
  // Fix: addXP() is no longer called here at all — completeLesson()'s real,
  // idempotent, server-persisted XP is now the ONLY source for this event,
  // so what's shown always matches what a fresh page load will show too.
  test('goNext on the real final question finishes the quiz: records real XP via completeLesson only, NOT a separate local-only addXP bump', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('goNextCorrect')); // Q1 -> Q2
    await user.press(screen.getByTestId('goNextCorrect')); // Q2 -> Q3 (spoken)
    await answerSpoken(user); // Q3 (spoken) -> finish

    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('result'));
    expect((globalThis as any).__lastMocks.completeLesson).toHaveBeenCalled();
    expect((globalThis as any).__lastMocks.addXP).not.toHaveBeenCalled();
  });

  // Dashboard sync: the finished score is recorded locally right away, so the
  // dashboard shows it even before the fire-and-forget track-result write is
  // visible through GET /performance.
  test('finishing the quiz records the score locally for the dashboard (topic name + subject)', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('goNextCorrect'));
    await user.press(screen.getByTestId('goNextWrong'));
    await answerSpoken(user); // Q3 (spoken) -> finish

    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('result'));
    expect((globalThis as any).__lastMocks.recordQuizResult).toHaveBeenCalledTimes(1);
    // Q1 right, Q2 wrong, spoken explanation passed (8/10) -> 2 of 3
    expect((globalThis as any).__lastMocks.recordQuizResult).toHaveBeenCalledWith('Topic', 67, 'English');
  });

  test('goPrev on the real first question is a real no-op', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('goPrev'));

    expect(screen.getByTestId('currentQ').props.children).toBe(0);
  });

  // B004 regression — RCA: track-attempt was gated on AuthContext's user.id,
  // which the real app never populates (only StudentDataContext.studentId is
  // ever resolved). The attempt POST silently never fired; completeLesson()
  // still ran (it already used the correct id), so XP/score looked fine
  // while topic_attempts stayed empty. Fix: use the resolved studentId.
  test('a real finished quiz sends track-attempt with the resolved studentId, not a user.id-shaped field', async () => {
    const user = userEvent.setup();
    await render(<Harness studentId="real-resolved-student-id" />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('goNextCorrect')); // Q1 -> Q2
    await user.press(screen.getByTestId('goNextCorrect')); // Q2 -> Q3 (spoken)
    await answerSpoken(user); // Q3 (spoken) -> finish
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('result'));

    const trackAttemptCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url.includes('/student/track-attempt'));
    expect(trackAttemptCall).toBeDefined();
    const body = JSON.parse(trackAttemptCall![1].body);
    expect(body.studentId).toBe('real-resolved-student-id');
  });

  test('a missing studentId at finish time does not send track-attempt and does not throw', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    await render(<Harness studentId={undefined} />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('goNextCorrect'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await answerSpoken(user); // Q3 (spoken) -> finish
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('result'));

    const trackAttemptCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url.includes('/student/track-attempt'));
    expect(trackAttemptCall).toBeUndefined();
    // completeLesson/XP must still work — tracking being skipped must not
    // block the rest of the real finish-quiz behavior.
    expect((globalThis as any).__lastMocks.completeLesson).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('a real finished quiz sends exactly one track-attempt call, never duplicated', async () => {
    const user = userEvent.setup();
    await render(<Harness studentId="real-resolved-student-id" />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('goNextCorrect'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await answerSpoken(user); // Q3 (spoken) -> finish
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('result'));

    const trackAttemptCalls = (global.fetch as jest.Mock).mock.calls.filter(([url]) => url.includes('/student/track-attempt'));
    expect(trackAttemptCalls.length).toBe(1);
  });

  test('goPrev restores a real previously-answered MCQ in a locked review state', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));

    await user.press(screen.getByTestId('answer1')); // correct answer for Q1
    await waitFor(() => expect(screen.getByTestId('mcqDone').props.children).toBe('true'));
    await user.press(screen.getByTestId('goNextCorrect')); // move to Q2

    await user.press(screen.getByTestId('goPrev')); // back to Q1

    expect(screen.getByTestId('currentQ').props.children).toBe(0);
    await waitFor(() => expect(screen.getByTestId('mcqDone').props.children).toBe('true'));
    expect(screen.getByTestId('mcqSelected').props.children).toBe('1');
  });
});

describe('useQuiz — the spoken last question', () => {
  test('every practice test ends with a spoken question after the generated ones', async () => {
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));
    expect(screen.getByTestId('qCount').props.children).toBe(3);
  });

  test('teacher-authored practice questions get it too', async () => {
    await render(<Harness practiceQuiz={[{ type: 'mcq', question: 'T1', options: ['a', 'b'], correct: 0 }]} />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));
    expect(screen.getByTestId('qCount').props.children).toBe(2);
  });

  test('submitting sends what was said, with the topic\'s key points, and records the evaluation', async () => {
    const user = userEvent.setup();
    await render(<Harness studentId="s1" keyPoints={['Tenali Rama used wit']} />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await answerSpoken(user);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('result'));

    const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => url.includes('/ibpyp/evaluate-explanation'));
    expect(JSON.parse(call[1].body)).toMatchObject({ topic: 'Topic', subject: 'English', grade: 'Grade 6', transcript: SPOKEN, keyPoints: ['Tenali Rama used wit'] });
    const results = JSON.parse(screen.getByTestId('results').props.children);
    expect(results).toHaveLength(3);
    expect(results[2]).toMatchObject({ type: 'spoken', studentAnswer: SPOKEN, isCorrect: true, evaluation: GOOD_EVAL });
    expect(screen.getByTestId('score').props.children).toBe(3);
    // the attempt saved for the dashboard carries the spoken answer and its evaluation
    const attempt = JSON.parse((global.fetch as jest.Mock).mock.calls.find(([url]) => url.includes('/student/track-attempt'))[1].body);
    expect(attempt.totalQuestions).toBe(3);
    expect(attempt.perQuestionResults[2].evaluation.score).toBe(8);
  });

  test('a low-scoring explanation counts as wrong and gets no extra "explain-wrong" call', async () => {
    mockFetchRoutes({ evaluate: () => jsonRes(LOW_EVAL) });
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await answerSpoken(user);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('result'));
    expect(screen.getByTestId('score').props.children).toBe(2);
    expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => url.includes('/ibpyp/explain-wrong'))).toHaveLength(0);
  });

  test('a grading failure keeps the student on the question with their text and a message', async () => {
    mockFetchRoutes({ evaluate: () => jsonRes({ error: 'Could not check your explanation. Please try again.' }, false) });
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await answerSpoken(user);
    await waitFor(() => expect(screen.getByTestId('spokenStatus').props.children).toBe('error'));
    expect(screen.getByTestId('spokenError').props.children).toMatch(/Could not check your explanation/);
    expect(screen.getByTestId('phase').props.children).toBe('quiz');
    expect(screen.getByTestId('qType').props.children).toBe('spoken');
  });

  test('too little said is not sent', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await user.press(screen.getByTestId('goNextCorrect'));
    await waitFor(() => expect(screen.getByTestId('qType').props.children).toBe('spoken'));
    await user.press(screen.getByTestId('setSpokenShort'));
    await user.press(screen.getByTestId('submitSpoken'));
    expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => url.includes('/ibpyp/evaluate-explanation'))).toHaveLength(0);
  });

  test('going Previous and Next again never counts a question twice', async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('quiz'));
    await user.press(screen.getByTestId('answer1'));
    await user.press(screen.getByTestId('goNextCorrect')); // Q1 right
    await user.press(screen.getByTestId('goPrev'));
    await user.press(screen.getByTestId('goNextCorrect')); // Q1 again
    await user.press(screen.getByTestId('goNextWrong'));   // Q2 wrong
    await answerSpoken(user);
    await waitFor(() => expect(screen.getByTestId('phase').props.children).toBe('result'));
    expect(JSON.parse(screen.getByTestId('results').props.children)).toHaveLength(3);
    expect(screen.getByTestId('score').props.children).toBe(2);
  });
});
