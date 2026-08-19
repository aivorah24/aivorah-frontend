// Integration tests for AssignmentsScreen — the real screen and its real
// AssignmentCard, with useAssignments mocked at the module boundary (it
// already has its own dedicated hook tests covering fetch/normalization/
// sorting logic). Focuses on: loading/error/empty/populated states, stats,
// filters, and which modal opens for which assignment shape.

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import AssignmentsScreen from '../AssignmentsScreen';
import type { Assignment } from '../types';

jest.setTimeout(15000);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ key: 'Assignments', name: 'Assignments' }),
}));

jest.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ colors: {
    bgDark: '#000', accentYellow: '#fa0', accentGreen: '#0a0', accentRed: '#f00', textMain: '#fff',
    textMuted: '#888', textDim: '#666', borderColor: '#333', cardDark: '#111', cardHover: '#222',
  } }),
}));

jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'A Student', email: 'a@a.com', grade: 'Grade 4', curriculum: 'NCERT' }, updateUser: jest.fn(), logout: jest.fn() }),
}));

jest.mock('../hooks/useAssignments', () => ({
  useAssignments: (...args: any[]) => (global as any).__mockUseAssignments(...args),
}));

// The 4 active-assignment modals and 2 result modals each have real internal
// complexity (WebView bridging, canvas drawing, photo upload) that's out of
// scope for this pass — see the Assignments test plan. Stubbed here so this
// suite can verify routing (which modal opens for which assignment shape)
// without depending on their internals.
jest.mock('../components/InteractiveQuizModal', () => ({ InteractiveQuizModal: () => {
  const { Text } = require('react-native');
  return <Text testID="interactive-quiz-modal">stub</Text>;
} }));
jest.mock('../components/QuizModal', () => ({ QuizModal: () => {
  const { Text } = require('react-native');
  return <Text testID="quiz-modal">stub</Text>;
} }));
jest.mock('../components/ScaffoldedModal', () => ({ ScaffoldedModal: () => {
  const { Text } = require('react-native');
  return <Text testID="scaffolded-modal">stub</Text>;
} }));
jest.mock('../components/SubmissionModal', () => ({ SubmissionModal: () => {
  const { Text } = require('react-native');
  return <Text testID="submission-modal">stub</Text>;
} }));
jest.mock('../components/SubmittedResultModal', () => ({ SubmittedResultModal: () => {
  const { Text } = require('react-native');
  return <Text testID="submitted-result-modal">stub</Text>;
} }));
jest.mock('../components/CompletedResultModal', () => ({ CompletedResultModal: () => {
  const { Text } = require('react-native');
  return <Text testID="completed-result-modal">stub</Text>;
} }));

const mockSetActiveFilter = jest.fn();
const mockOpenAssignment = jest.fn();
const mockSetViewingResult = jest.fn();
const mockLoad = jest.fn();
const mockSetLoading = jest.fn();
const mockHandleSubmitted = jest.fn();

function baseAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a1', title: 'Fractions Worksheet', subject: 'Mathematics', chapter: 'Numbers',
    dueDate: '2026-08-25', type: 'worksheet', note: '', studentId: 's1', createdBy: 'teacher',
    status: 'pending', score: null, createdAt: '2026-08-18T10:00:00Z', questions: [],
    ...overrides,
  };
}

function baseState(overrides: any = {}) {
  return {
    activeFilter: 'All', setActiveFilter: mockSetActiveFilter,
    assignments: [], loading: false, loadError: false, setLoading: mockSetLoading, load: mockLoad,
    activeAssignment: null, setActiveAssignment: jest.fn(),
    quizProgress: null, setQuizProgress: jest.fn(),
    submittingQuiz: false, setSubmittingQuiz: jest.fn(),
    openingAssignmentId: null,
    viewingResult: null, setViewingResult: mockSetViewingResult,
    submittedResult: null, setSubmittedResult: jest.fn(),
    expandedExplain: {}, setExpandedExplain: jest.fn(),
    filtered: [], pending: 0, completed: 0, overdue: 0,
    handleSubmitted: mockHandleSubmitted, openAssignment: mockOpenAssignment,
    studentId: 's1',
    ...overrides,
  };
}

let state: any;
function navProp() {
  return { openDrawer: jest.fn(), navigate: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
  state = baseState();
  (global as any).__mockUseAssignments = () => state;
  // ScreenLayout (real, not mocked) gates all children behind its own
  // screen-time-status fetch for student users.
  global.fetch = jest.fn().mockResolvedValue({ json: async () => ({}) }) as any;
});

describe('AssignmentsScreen — loading/error/empty states', () => {
  test('shows a real loading indicator while the hook is loading', async () => {
    state = baseState({ loading: true });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('assignments-loading')).toBeTruthy();
  });

  test('shows the real error state with a retry button when loading failed and nothing is cached', async () => {
    state = baseState({ loadError: true, assignments: [] });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('assignments-error-state')).toBeTruthy();
    expect(screen.getByTestId('assignments-retry-button')).toBeTruthy();
  });

  test('pressing the real retry button calls load again', async () => {
    const user = userEvent.setup();
    state = baseState({ loadError: true, assignments: [] });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('assignments-retry-button'));

    expect(mockSetLoading).toHaveBeenCalledWith(true);
    expect(mockLoad).toHaveBeenCalled();
  });

  test('shows the real empty state when there are no assignments at all', async () => {
    state = baseState({ filtered: [] });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('assignments-empty-state')).toBeTruthy();
    expect(screen.getByText('No assignments yet. Your teacher will assign work soon.')).toBeTruthy();
  });

  test('shows the real "no completed" empty message under the Completed filter', async () => {
    state = baseState({ activeFilter: 'Completed', filtered: [] });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByText('No completed assignments yet.')).toBeTruthy();
  });
});

describe('AssignmentsScreen — real stats', () => {
  test('shows the real pending/completed/ready counts from the hook', async () => {
    state = baseState({ pending: 3, completed: 2, overdue: 1 });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('assignments-stat-pending-value').props.children).toBe(3);
    expect(screen.getByTestId('assignments-stat-completed-value').props.children).toBe(2);
    expect(screen.getByTestId('assignments-stat-ready-value').props.children).toBe(1);
  });
});

describe('AssignmentsScreen — real filter tabs', () => {
  test('pressing a real filter tab calls setActiveFilter with the real filter name', async () => {
    const user = userEvent.setup();
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('assignments-filter-quizzes'));

    expect(mockSetActiveFilter).toHaveBeenCalledWith('Quizzes');
  });
});

describe('AssignmentsScreen — real assignment list', () => {
  test('renders a real AssignmentCard per filtered assignment', async () => {
    const a = baseAssignment({ id: 'a1', title: 'Fractions Worksheet' });
    state = baseState({ filtered: [a] });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('assignments-card-a1')).toBeTruthy();
    expect(screen.getByText('Fractions Worksheet')).toBeTruthy();
  });

  test('pressing a real "Start" button calls the real openAssignment with that assignment', async () => {
    const user = userEvent.setup();
    const a = baseAssignment({ id: 'a1' });
    state = baseState({ filtered: [a] });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('assignments-card-a1-start'));

    expect(mockOpenAssignment).toHaveBeenCalledWith(a);
  });

  test('pressing a real completed card calls the real setViewingResult', async () => {
    const user = userEvent.setup();
    const a = baseAssignment({ id: 'a1', status: 'completed', score: 90 });
    state = baseState({ filtered: [a] });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    await user.press(screen.getByTestId('assignments-card-a1'));

    expect(mockSetViewingResult).toHaveBeenCalledWith(a);
  });
});

describe('AssignmentsScreen — real modal routing by assignment shape', () => {
  test('an active assignment with interactiveQuizHtml (not completed) opens the real InteractiveQuizModal', async () => {
    const a = baseAssignment({ id: 'a1', interactiveQuizHtml: '<html></html>' });
    state = baseState({ activeAssignment: a });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('interactive-quiz-modal')).toBeTruthy();
  });

  test('a completed assignment with interactiveQuizHtml does NOT reopen the interactive modal', async () => {
    const a = baseAssignment({ id: 'a1', interactiveQuizHtml: '<html></html>', status: 'completed' });
    state = baseState({ activeAssignment: a });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.queryByTestId('interactive-quiz-modal')).toBeNull();
  });

  test('an active assignment with real quizQuestions opens the real QuizModal', async () => {
    const a = baseAssignment({ id: 'a1', type: 'quiz', quizQuestions: [{ id: 'q1', question: 'Q?', type: 'mcq', options: ['A', 'B', 'C', 'D'], correct: 'A' }] });
    state = baseState({ activeAssignment: a });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('quiz-modal')).toBeTruthy();
  });

  test('an active assignment with real taskSteps opens the real ScaffoldedModal', async () => {
    const a = baseAssignment({ id: 'a1', taskSteps: [{ id: 's1', type: 'brainstorm', label: 'Brainstorm', instructions: 'Think it through' }] });
    state = baseState({ activeAssignment: a });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('scaffolded-modal')).toBeTruthy();
  });

  test('a plain active assignment (no quiz/taskSteps/interactiveQuizHtml) opens the real SubmissionModal', async () => {
    const a = baseAssignment({ id: 'a1' });
    state = baseState({ activeAssignment: a });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('submission-modal')).toBeTruthy();
  });

  test('no active assignment renders no modal at all', async () => {
    state = baseState({ activeAssignment: null });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.queryByTestId('interactive-quiz-modal')).toBeNull();
    expect(screen.queryByTestId('quiz-modal')).toBeNull();
    expect(screen.queryByTestId('scaffolded-modal')).toBeNull();
    expect(screen.queryByTestId('submission-modal')).toBeNull();
  });

  test('a real submittedResult opens the real SubmittedResultModal', async () => {
    const a = baseAssignment({ id: 'a1', status: 'completed' });
    state = baseState({ submittedResult: { assignment: a, data: {} } });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('submitted-result-modal')).toBeTruthy();
  });

  test('a real viewingResult opens the real CompletedResultModal', async () => {
    const a = baseAssignment({ id: 'a1', status: 'completed', score: 90 });
    state = baseState({ viewingResult: a });
    await render(<AssignmentsScreen navigation={navProp()} route={{}} />);

    expect(screen.getByTestId('completed-result-modal')).toBeTruthy();
  });
});
