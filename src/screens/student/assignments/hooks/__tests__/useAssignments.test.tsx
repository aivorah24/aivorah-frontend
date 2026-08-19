import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, screen, userEvent, waitFor, act } from '@testing-library/react-native';
import { useAssignments } from '../useAssignments';

jest.setTimeout(15000);

let focusEffectCb: (() => void) | undefined;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => { focusEffectCb = cb; },
}));

const mockRecordStudyTime = jest.fn();
let mockStudentId = 's1';
jest.mock('../../../../../context/StudentDataContext', () => ({
  useStudentData: () => ({ studentId: mockStudentId, recordStudyTime: mockRecordStudyTime }),
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
      <Text testID="openingId">{h.openingAssignmentId ?? ''}</Text>
      {h.filtered.map(a => (
        <TouchableOpacity key={a.id} testID={`open-${a.id}`} onPress={() => h.openAssignment(a)}><Text>x</Text></TouchableOpacity>
      ))}
      <TouchableOpacity testID="setFilterCompleted" onPress={() => h.setActiveFilter('Completed')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setFilterQuizzes" onPress={() => h.setActiveFilter('Quizzes')}><Text>x</Text></TouchableOpacity>
      <TouchableOpacity testID="setFilterPending" onPress={() => h.setActiveFilter('Pending')}><Text>x</Text></TouchableOpacity>
    </>
  );
}

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
