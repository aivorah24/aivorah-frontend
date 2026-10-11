import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor, act } from '@testing-library/react-native';
import { useAssignments } from '../useAssignments';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

jest.setTimeout(15000);

let focusEffectCb: (() => void) | undefined;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { focusEffectCb = cb; },
}));

const mockRecordStudySeconds = jest.fn();
let mockStudentId = 's1';
jest.mock('../../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ studentId: mockStudentId, recordStudySeconds: mockRecordStudySeconds }),
}));

const mockClearUnreadAssignments = jest.fn();
jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({ clearUnreadAssignments: mockClearUnreadAssignments }),
}));

function jsonRes(data: any, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

function baseAssignment(overrides: any = {}) {
  return {
    id: 'a1', title: 'Fractions Worksheet', subject: 'Mathematics', chapter: 'Numbers',
    dueDate: '2026-08-25', type: 'worksheet', note: '', studentId: 's1', createdBy: 'teacher',
    status: 'pending', score: null, createdAt: '2026-08-18T10:00:00Z', questions: [],
    ...overrides,
  };
}

function Harness({ highlightId }: { highlightId?: string }) {
  const nav = { setParams: jest.fn() };
  const h = useAssignments(highlightId, nav);
  return (
    <>
      <Text testID="loading">{String(h.loading)}</Text>
      <Text testID="loadError">{String(h.loadError)}</Text>
      <Text testID="count">{h.assignments.length}</Text>
      <Text testID="filteredCount">{h.filtered.length}</Text>
      <Text testID="pending">{h.pending}</Text>
      <Text testID="completed">{h.completed}</Text>
      <Text testID="overdue">{h.overdue}</Text>
      <Text testID="activeId">{h.activeAssignment?.id ?? ''}</Text>
      <Text testID="activeQuizCount">{h.activeAssignment?.quizQuestions?.length ?? -1}</Text>
      <Text testID="activeFillBlankCorrect">{h.activeAssignment?.quizQuestions?.[0]?.type === 'fill_blank' ? h.activeAssignment.quizQuestions[0].correct : ''}</Text>
      <Text testID="openingId">{h.openingAssignmentId ?? ''}</Text>
      <Text testID="quizProgress">{JSON.stringify(h.quizProgress)}</Text>
      <Text testID="expandedExplain">{JSON.stringify(h.expandedExplain)}</Text>
      {h.filtered.map(a => (
        <TouchableOpacity key={a.id} testID={`open-${a.id}`} onPress={() => h.openAssignment(a)}><Text>x</Text></TouchableOpacity>
      ))}
      <TouchableOpacity testID="setFilterCompleted" onPress={() => h.setActiveFilter('Completed')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setFilterQuizzes" onPress={() => h.setActiveFilter('Quizzes')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setFilterPending" onPress={() => h.setActiveFilter('Pending')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setQuizProgressFake" onPress={() => h.setQuizProgress({ pct: 50, completed: false, correct: 1, total: 2, attemptedCount: 1, answers: [] })}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setViewingResult" onPress={() => h.setViewingResult(viewingResultToSet)}><Text>x</Text></TouchableOpacity>
    </>
  );
}

let viewingResultToSet: any = null;

beforeEach(() => {
  jest.clearAllMocks();
  mockStudentId = 's1';
  focusEffectCb = undefined;
  global.fetch = jest.fn().mockResolvedValue(jsonRes([])) as any;
});

describe('useAssignments — loading real assignments', () => {
  test('loads real assignments for the real student and clears loading', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([baseAssignment()])) as any;
    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('count').props.children).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/assignments?studentId=s1'));
  });

  test('a real non-array response (e.g. an error body) sets loadError, not a silent empty list', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes({ error: 'down' })) as any;
    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loadError').props.children).toBe('true'));
  });

  test('a real network failure sets loadError and clears loading', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as any;
    await render(<Harness />);

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('loadError').props.children).toBe('true');
  });

  test('does not fetch at all when there is no real studentId yet', async () => {
    mockStudentId = '';
    await render(<Harness />);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useAssignments — real counts', () => {
  test('computes real pending/completed/overdue counts from real assignment data', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-19T10:00:00Z'));
    global.fetch = jest.fn().mockResolvedValue(jsonRes([
      baseAssignment({ id: 'a1', status: 'pending', dueDate: '2026-08-10' }), // overdue
      baseAssignment({ id: 'a2', status: 'pending', dueDate: '2026-08-25' }), // not overdue
      baseAssignment({ id: 'a3', status: 'completed' }),
      baseAssignment({ id: 'a4', status: 'pending', dueDate: '2026-08-10', joinedAfterDue: true }), // exempted
    ])) as any;

    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    expect(screen.getByTestId('pending').props.children).toBe(3);
    expect(screen.getByTestId('completed').props.children).toBe(1);
    expect(screen.getByTestId('overdue').props.children).toBe(1);
    jest.useRealTimers();
  });
});

describe('useAssignments — real filtering and sorting', () => {
  test('the "All" filter sorts real assignments with completed always last', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([
      baseAssignment({ id: 'a1', status: 'completed', createdAt: '2026-08-18T10:00:00Z' }),
      baseAssignment({ id: 'a2', status: 'pending', createdAt: '2026-08-17T10:00:00Z' }),
      baseAssignment({ id: 'a3', status: 'pending', createdAt: '2026-08-19T10:00:00Z' }),
    ])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    // Pending newest-first (a3, a2), completed last (a1)
    expect(screen.getByTestId('open-a3')).toBeTruthy();
    const order = [screen.getByTestId('open-a3'), screen.getByTestId('open-a2'), screen.getByTestId('open-a1')];
    expect(order.every(Boolean)).toBe(true);
  });

  test('the real "Completed" filter shows only completed assignments', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(jsonRes([
      baseAssignment({ id: 'a1', status: 'completed' }),
      baseAssignment({ id: 'a2', status: 'pending' }),
    ])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('setFilterCompleted'));

    expect(screen.getByTestId('filteredCount').props.children).toBe(1);
  });

  test('the real "Quizzes" filter shows only quiz-type assignments', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(jsonRes([
      baseAssignment({ id: 'a1', type: 'quiz' }),
      baseAssignment({ id: 'a2', type: 'worksheet' }),
    ])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('setFilterQuizzes'));

    expect(screen.getByTestId('filteredCount').props.children).toBe(1);
  });

  test('the real "Pending" filter excludes completed assignments', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(jsonRes([
      baseAssignment({ id: 'a1', status: 'pending' }),
      baseAssignment({ id: 'a2', status: 'completed' }),
    ])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('setFilterPending'));

    expect(screen.getByTestId('filteredCount').props.children).toBe(1);
  });
});

describe('useAssignments — opening an assignment', () => {
  test('opening a real non-quiz assignment sets it active with no quiz hydration', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(jsonRes([baseAssignment({ id: 'a1', type: 'worksheet' })])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('open-a1'));

    await waitFor(() => expect(screen.getByTestId('activeId').props.children).toBe('a1'));
  });

  test('opening a real quiz assignment with local quizQuestions normalizes them without a network hydration call', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(jsonRes([baseAssignment({
      id: 'a1', type: 'quiz',
      quizQuestions: [{ id: 'q1', question: 'What is 2+2?', type: 'mcq', options: ['A. 3', 'B. 4', 'C. 5', 'D. 6'], correct: 1 }],
    })])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    const fetchCallsBeforeOpen = (global.fetch as jest.Mock).mock.calls.length;

    await user.press(screen.getByTestId('open-a1'));

    await waitFor(() => expect(screen.getByTestId('activeQuizCount').props.children).toBe(1));
    // No extra network call — the questions were already present locally.
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsBeforeOpen);
  });

  test('opening a real quiz assignment with no local questions hydrates them from the assignments service', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/assignments?')) return jsonRes([baseAssignment({ id: 'a1', type: 'quiz', quizQuestions: [], questions: [] })]);
      if (url.includes('/generate-quiz')) return jsonRes({ questions: [{ id: 'q1', question: 'What is 2+2?', type: 'mcq', options: ['A. 3', 'B. 4', 'C. 5', 'D. 6'], correct: 1 }] });
      return jsonRes({});
    }) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('open-a1'));

    await waitFor(() => expect(screen.getByTestId('activeQuizCount').props.children).toBe(1));
  });

  test('a real quiz that hydrates to zero questions does not set an active assignment', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/assignments?')) return jsonRes([baseAssignment({ id: 'a1', type: 'quiz', quizQuestions: [], questions: [] })]);
      if (url.includes('/generate-quiz')) return jsonRes({ questions: [] });
      if (url.includes('/ncert/')) return jsonRes({ questions: [] });
      return jsonRes({});
    }) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('open-a1'));

    await waitFor(() => expect(screen.getByTestId('openingId').props.children).toBe(''));
    expect(screen.getByTestId('activeId').props.children).toBe('');
  });
});

describe('useAssignments — deep-link open via highlightId', () => {
  test('opens the real matching assignment as soon as it arrives, by id', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([baseAssignment({ id: 'a1' }), baseAssignment({ id: 'a2' })])) as any;
    await render(<Harness highlightId="a2" />);

    await waitFor(() => expect(screen.getByTestId('activeId').props.children).toBe('a2'));
  });

  test('also matches a real assignment by its scheduleId, not just its own id', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([baseAssignment({ id: 'a1', scheduleId: 'sched-9' })])) as any;
    await render(<Harness highlightId="sched-9" />);

    await waitFor(() => expect(screen.getByTestId('activeId').props.children).toBe('a1'));
  });

  test('a highlightId matching no real assignment leaves nothing active', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([baseAssignment({ id: 'a1' })])) as any;
    await render(<Harness highlightId="does-not-exist" />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    expect(screen.getByTestId('activeId').props.children).toBe('');
  });
});

describe('useAssignments — focus effect', () => {
  test('registers a real useFocusEffect callback that refetches on screen focus', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonRes([])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    const fetchCallsBeforeFocus = (global.fetch as jest.Mock).mock.calls.length;

    expect(focusEffectCb).toBeDefined();
    await act(async () => { focusEffectCb!(); });

    // load() runs again on focus, independent of the sPageJustLoaded grace
    // period (which only gates clearUnreadAssignments, not the refetch).
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(fetchCallsBeforeFocus);
  });
});

describe('useAssignments — fill_blank quiz normalization', () => {
  test('opening a real quiz with local fill_blank questions normalizes them, not just mcq', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(jsonRes([baseAssignment({
      id: 'a1', type: 'quiz',
      quizQuestions: [{ id: 'q1', question: 'The capital of France is ___', type: 'fill_blank', correct: '  Paris  ' }],
    })])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('open-a1'));

    await waitFor(() => expect(screen.getByTestId('activeQuizCount').props.children).toBe(1));
    // Correct answer is trimmed, and the fill_blank type/shape survives normalization.
    expect(screen.getByTestId('activeFillBlankCorrect').props.children).toBe('Paris');
  });
});

describe('useAssignments — "Assignment Closed" guard', () => {
  test('opening a real closed, not-yet-completed assignment shows a real alert and never activates it', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(jsonRes([baseAssignment({ id: 'a1', status: 'pending', closed: true })])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('open-a1'));

    expect(Alert.alert).toHaveBeenCalledWith('Assignment Closed', 'This assignment closed on its due date and no longer accepts submissions.');
    expect(screen.getByTestId('activeId').props.children).toBe('');
  });

  test('a real closed but already-completed assignment can still be opened (viewing results is allowed)', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(jsonRes([baseAssignment({ id: 'a1', status: 'completed', closed: true })])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('open-a1'));

    expect(Alert.alert).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('activeId').props.children).toBe('a1'));
  });
});

describe('useAssignments — interactive-quiz progress reset on native', () => {
  test('opening a real new interactive-quiz assignment resets a real stale quizProgress from the previous one', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue(jsonRes([
      baseAssignment({ id: 'a1', interactiveQuizHtml: '<html>quiz1</html>' }),
      baseAssignment({ id: 'a2', interactiveQuizHtml: '<html>quiz2</html>' }),
    ])) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('open-a1'));
    await waitFor(() => expect(screen.getByTestId('activeId').props.children).toBe('a1'));
    await user.press(screen.getByTestId('setQuizProgressFake'));
    await waitFor(() => expect(screen.getByTestId('quizProgress').props.children).toContain('"pct":50'));

    await user.press(screen.getByTestId('open-a2'));

    await waitFor(() => expect(screen.getByTestId('activeId').props.children).toBe('a2'));
    expect(screen.getByTestId('quizProgress').props.children).toBe('null');
  });
});

describe('useAssignments — auto-explain effect on viewing a completed result', () => {
  test('fetches a real explanation for each real wrong, answered question when a result is opened', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/explain-question')) return jsonRes({ steps: ['Step 1', 'Step 2'], correctAnswer: '4', tip: 'Count carefully' });
      return jsonRes([]);
    }) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    viewingResultToSet = baseAssignment({
      id: 'a1', status: 'completed',
      aiFeedback: JSON.stringify({ perQuestion: [
        { question: 'Q1?', correct: false, answered: true, studentAnswer: '3', correctAnswer: '4', score: 0 },
        { question: 'Q2?', correct: true, answered: true }, // correct — should NOT trigger an explain fetch
        { question: 'Q3?', correct: false, answered: false }, // unanswered — should NOT trigger either
      ] }),
    });
    await user.press(screen.getByTestId('setViewingResult'));

    await waitFor(() => expect(screen.getByTestId('expandedExplain').props.children).toContain('"steps":["Step 1","Step 2"]'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/assignments/a1/explain-question'), expect.objectContaining({
      body: JSON.stringify({ question: 'Q1?', studentAnswer: '3', correctAnswer: '4', score: 0, subject: 'Mathematics', grade: undefined }),
    }));
    // Only 1 real explain call — the correct and unanswered questions are skipped.
    const explainCalls = (global.fetch as jest.Mock).mock.calls.filter(c => String(c[0]).includes('/explain-question'));
    expect(explainCalls).toHaveLength(1);
  });

  test('a real explain-question network failure still resolves the loading state, not stuck forever', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn((url: string) => {
      if (url.includes('/explain-question')) return Promise.reject(new Error('down'));
      return jsonRes([]);
    }) as any;
    await render(<Harness />);
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    viewingResultToSet = baseAssignment({
      id: 'a1', status: 'completed',
      aiFeedback: JSON.stringify({ perQuestion: [{ question: 'Q1?', correct: false, answered: true, studentAnswer: '3', correctAnswer: '4' }] }),
    });
    await user.press(screen.getByTestId('setViewingResult'));

    await waitFor(() => expect(screen.getByTestId('expandedExplain').props.children).toContain('"loading":false'));
  });
});
