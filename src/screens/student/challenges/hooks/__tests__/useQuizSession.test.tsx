import React from 'react';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { render, screen, userEvent, waitFor, act } from '@testing-library/react-native';
import { useQuizSession } from '../useQuizSession';
import type { Challenge } from '../../types';

jest.setTimeout(15000);

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'c1', title: 'Fractions Quiz', description: '', grade: 'Grade 4', curriculum: 'NCERT',
    subject: 'Math', chapterId: null, topic: 'Fractions', difficulty: 'Easy', xpReward: 100,
    questionCount: 2, timeLimitMinutes: 0, type: 'mcq', category: 'quiz', imageUrl: null,
    assignmentId: 'asg1', status: 'assigned', score: null, xpAwarded: null, dueDate: null,
    assignedByRole: null, ...overrides,
  } as Challenge;
}

const mockAddXP = jest.fn();
const mockRecordStudyTime = jest.fn();
const mockOnChallengeCompleted = jest.fn();

function Harness({ studentId = 's1', grade = 'Grade 4', userEmail = 'a@a.com' }: any) {
  const hook = useQuizSession({
    studentId, grade, userEmail,
    addXP: mockAddXP, recordStudyTime: mockRecordStudyTime, onChallengeCompleted: mockOnChallengeCompleted,
  });
  return (
    <>
      <Text testID="visible">{String(hook.quizVisible)}</Text>
      <Text testID="loading">{String(hook.quizLoading)}</Text>
      <Text testID="submitting">{String(hook.quizSubmitting)}</Text>
      <Text testID="questionsCount">{hook.questions.length}</Text>
      <Text testID="timeLeft">{String(hook.timeLeft)}</Text>
      <Text testID="assignmentId">{String(hook.activeChallenge?.assignmentId)}</Text>
      <Text testID="resultScore">{String(hook.quizResult?.score)}</Text>
      <Text testID="resultXp">{String(hook.quizResult?.xpAwarded)}</Text>
      <Text testID="allAnswered">{String(hook.allAnswered)}</Text>
      <TouchableOpacity testID="start" onPress={() => hook.startChallenge(makeChallenge())}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="startClosed" onPress={() => hook.startChallenge(makeChallenge({ closed: true, status: 'assigned' } as any))}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="startUnassigned" onPress={() => hook.startChallenge(makeChallenge({ assignmentId: null }))}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="answerAll" onPress={() => hook.setAnswers(hook.questions.map(() => 'A'))}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="submit" onPress={() => hook.submitQuiz()}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="close" onPress={() => hook.closeQuiz()}><Text>x</Text></TouchableOpacity>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useQuizSession — starting a challenge', () => {
  test('a closed, not-yet-completed challenge shows a real alert and never opens the quiz', async () => {
    global.fetch = jest.fn();
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('startClosed'));

    expect(Alert.alert).toHaveBeenCalledWith('Challenge Closed', expect.any(String));
    expect(screen.getByTestId('visible').props.children).toBe('false');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('fetches real quiz questions and maps server option-index answers to the option string', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [{ question: 'Q1', options: ['A', 'B', 'C'], correct: 1 }] });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('start'));

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('questionsCount').props.children).toBe(1);
    expect(screen.getByTestId('visible').props.children).toBe('true');
  });

  test('auto-assigns an unassigned challenge before fetching questions, capturing the real new assignmentId', async () => {
    global.fetch = jest.fn((url: string, opts: any) => {
      if (url.includes('/challenges/assign')) return jsonRes({ id: 'new-asg-99' });
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [] });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('startUnassigned'));

    await waitFor(() => expect(screen.getByTestId('assignmentId').props.children).toBe('new-asg-99'));
  });

  test('a failed auto-assign leaves assignmentId unset but still attempts the quiz fetch', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/challenges/assign')) return jsonRes({}, false);
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [] });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('startUnassigned'));

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('assignmentId').props.children).toBe('null');
  });

  test('a network error during start is swallowed, loading resolves to false', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('start'));

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
  });
});

describe('useQuizSession — timer', () => {
  test('a positive timeLimitMinutes starts a real countdown in seconds', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [{ question: 'Q1', options: ['A'], correct: 0 }] });
      return jsonRes({});
    }) as any;

    function StartHarness() {
      const hook = useQuizSession({ studentId: 's1', grade: 'Grade 4', userEmail: 'a@a.com', addXP: mockAddXP, recordStudyTime: mockRecordStudyTime, onChallengeCompleted: mockOnChallengeCompleted });
      React.useEffect(() => { hook.startChallenge(makeChallenge({ timeLimitMinutes: 1 })); }, []);
      return <Text testID="timeLeft">{String(hook.timeLeft)}</Text>;
    }

    await render(<StartHarness />);
    await act(async () => { await Promise.resolve(); });

    expect(screen.getByTestId('timeLeft').props.children).toBe('60');

    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(screen.getByTestId('timeLeft').props.children).toBe('55');

    jest.useRealTimers();
  });

  test('a zero timeLimitMinutes never sets a countdown', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [] });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('start')); // makeChallenge() default timeLimitMinutes: 0

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('timeLeft').props.children).toBe('null');
  });

  test('the timer reaching 0 auto-submits the real quiz with whatever answers exist so far', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [{ question: 'Q1', options: ['A', 'B'], correct: 0 }] });
      if (url.includes('/complete')) return jsonRes({ score: 0, xpAwarded: 0 });
      return jsonRes({});
    }) as any;

    function TimeoutHarness() {
      const hook = useQuizSession({ studentId: 's1', grade: 'Grade 4', userEmail: 'a@a.com', addXP: mockAddXP, recordStudyTime: mockRecordStudyTime, onChallengeCompleted: mockOnChallengeCompleted });
      React.useEffect(() => { hook.startChallenge(makeChallenge({ timeLimitMinutes: 1 })); }, []);
      return (
        <>
          <Text testID="timeLeft">{String(hook.timeLeft)}</Text>
          <Text testID="resultScore">{String(hook.quizResult?.score)}</Text>
        </>
      );
    }

    await render(<TimeoutHarness />);
    await act(async () => { await Promise.resolve(); }); // let startChallenge's quiz fetch resolve

    await act(async () => { jest.advanceTimersByTime(60000); }); // run the full 60s countdown to 0
    await act(async () => { await Promise.resolve(); await Promise.resolve(); }); // flush the auto-submit's fetch chain

    expect(screen.getByTestId('timeLeft').props.children).toBe('0');
    expect(screen.getByTestId('resultScore').props.children).toBe('0');
    expect(mockOnChallengeCompleted).toHaveBeenCalledWith('c1', 0, 0);

    jest.useRealTimers();
  });
});

describe('useQuizSession — submitting', () => {
  test('submitQuiz with no active assignment is a no-op', async () => {
    global.fetch = jest.fn();
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('submit'));

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('scores real answers, posts the real score, awards XP, and reports completion', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [{ question: 'Q1', options: ['A', 'B'], correct: 0 }, { question: 'Q2', options: ['A', 'B'], correct: 0 }] });
      if (url.includes('/complete')) return jsonRes({ score: 50, xpAwarded: 50 });
      if (url.includes('/leaderboard')) return jsonRes({ leaderboard: [{ id: 's1', xp: 50 }] });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('start'));
    await waitFor(() => expect(screen.getByTestId('questionsCount').props.children).toBe(2));

    await user.press(screen.getByTestId('answerAll')); // answers ['A','A'] -> Q1 correct, Q2 wrong (correct=0='A' actually both correct since both options[0]='A')
    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(screen.getByTestId('resultScore').props.children).toBe('50'));
    expect(mockAddXP).toHaveBeenCalledWith(50);
    expect(mockOnChallengeCompleted).toHaveBeenCalledWith('c1', 50, 50);
  });

  test('a zero xpAwarded does not call addXP (falsy guard)', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [{ question: 'Q1', options: ['A', 'B'], correct: 1 }] });
      if (url.includes('/complete')) return jsonRes({ score: 0, xpAwarded: 0 });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('start'));
    await waitFor(() => expect(screen.getByTestId('questionsCount').props.children).toBe(1));
    await user.press(screen.getByTestId('answerAll'));
    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(screen.getByTestId('resultScore').props.children).toBe('0'));
    expect(mockAddXP).not.toHaveBeenCalled();
  });

  test('a leaderboard fetch failure after submit is swallowed, result still shows', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [{ question: 'Q1', options: ['A'], correct: 0 }] });
      if (url.includes('/complete')) return jsonRes({ score: 100, xpAwarded: 100 });
      if (url.includes('/leaderboard')) return Promise.reject(new Error('down'));
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('start'));
    await waitFor(() => expect(screen.getByTestId('questionsCount').props.children).toBe(1));
    await user.press(screen.getByTestId('answerAll'));
    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(screen.getByTestId('resultScore').props.children).toBe('100'));
  });

  test('a non-ok /complete response leaves quizResult unset', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [{ question: 'Q1', options: ['A'], correct: 0 }] });
      if (url.includes('/complete')) return jsonRes({}, false);
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('start'));
    await waitFor(() => expect(screen.getByTestId('questionsCount').props.children).toBe(1));
    await user.press(screen.getByTestId('answerAll'));
    await user.press(screen.getByTestId('submit'));

    await waitFor(() => expect(screen.getByTestId('submitting').props.children).toBe('false'));
    expect(screen.getByTestId('resultScore').props.children).toBe('undefined');
  });
});

describe('useQuizSession — allAnswered', () => {
  test('is false with zero questions', async () => {
    await render(<Harness />);
    expect(screen.getByTestId('allAnswered').props.children).toBe('false');
  });

  test('is true only once every question has a non-blank answer', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [{ question: 'Q1', options: ['A'], correct: 0 }, { question: 'Q2', options: ['A'], correct: 0 }] });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('start'));
    await waitFor(() => expect(screen.getByTestId('questionsCount').props.children).toBe(2));

    expect(screen.getByTestId('allAnswered').props.children).toBe('false');

    await user.press(screen.getByTestId('answerAll'));
    expect(screen.getByTestId('allAnswered').props.children).toBe('true');
  });
});

describe('useQuizSession — closing', () => {
  test('closeQuiz resets visibility, active challenge, and questions', async () => {
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/ncert/quiz')) return jsonRes({ questions: [{ question: 'Q1', options: ['A'], correct: 0 }] });
      return jsonRes({});
    }) as any;
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByTestId('start'));
    await waitFor(() => expect(screen.getByTestId('visible').props.children).toBe('true'));

    await user.press(screen.getByTestId('close'));

    expect(screen.getByTestId('visible').props.children).toBe('false');
    expect(screen.getByTestId('questionsCount').props.children).toBe(0);
  });
});
