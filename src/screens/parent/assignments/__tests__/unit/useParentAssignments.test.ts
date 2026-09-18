import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useParentAssignments } from '../../hooks/useParentAssignments';
import * as parentAssignmentsService from '../../services/parentAssignmentsService';

jest.mock('../../services/parentAssignmentsService', () => ({
  __esModule: true,
  fetchChildren: jest.fn(),
  fetchAssignmentsAndStats: jest.fn(),
  fetchCurriculumTopics: jest.fn(),
  fetchSubjectOptions: jest.fn(),
  generateWithAI: jest.fn(),
  createAssignment: jest.fn(),
  IB_PYP_SUBJECTS: ['Mathematics', 'Science', 'English', 'Social Studies', 'Arts', 'Physical Education', 'ICT'],
}));

const mockUseFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (...args: any[]) => mockUseFocusEffect(...args),
}));

jest.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'parent@test.com' } }),
}));
jest.mock('../../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    clearUnreadAssignments: jest.fn(),
  }),
}));

const mockedService = parentAssignmentsService as jest.Mocked<typeof parentAssignmentsService>;

const MOCK_CHILDREN = [
  { id: 'c1', name: 'Child 1', curriculum: 'IB PYP', grade: 'Grade 3' },
  { id: 'c2', name: 'Child 2', curriculum: 'CBSE', grade: 'Grade 10' },
];

// Includes 'Mathematics' (not just 'Math') because useParentAssignments'
// resetForm() hardcodes 'Mathematics' as the default subject - a mock
// subjectOptions list that doesn't contain it would make the hook's own
// "reset subject if invalid for curriculum" effect immediately override it.
const MOCK_SUBJECT_OPTIONS = ['Mathematics', 'Science'];

const MOCK_ASSIGNMENTS = [
  {
    id: 'a1', title: 'Math HW', subject: 'Mathematics', dueDate: '2099-12-31',
    type: 'assignment', status: 'pending' as const, score: null, note: '', createdBy: 'teacher',
  },
  {
    id: 'a2', title: 'Science Quiz', subject: 'Science', dueDate: '2099-12-31',
    type: 'quiz', status: 'pending' as const, score: null, note: '', createdBy: 'parent',
  },
  {
    id: 'a3', title: 'English Essay', subject: 'English', dueDate: '2020-01-01',
    type: 'assignment', status: 'completed' as const, score: 90, note: '', createdBy: 'parent',
  },
];

let currentUnmount: (() => void) | null = null;

async function renderAndSettle(serviceOverrides?: {
  children?: any[];
  assignments?: any[];
  stats?: any;
  subjectOptions?: string[];
}) {
  const children = serviceOverrides?.children ?? MOCK_CHILDREN;
  const assignments = serviceOverrides?.assignments ?? [];
  const stats = serviceOverrides?.stats ?? null;
  const subjectOptions = serviceOverrides?.subjectOptions ?? MOCK_SUBJECT_OPTIONS;

  mockedService.fetchChildren.mockResolvedValue(children as any);
  mockedService.fetchAssignmentsAndStats.mockResolvedValue({ assignments, stats } as any);
  mockedService.fetchSubjectOptions.mockResolvedValue(subjectOptions as any);
  mockedService.fetchCurriculumTopics.mockResolvedValue([] as any);

  const { result, unmount } = await renderHook(() => useParentAssignments());

  // useFocusEffect callbacks run once (to trigger the initial data fetch)
  // and their cleanup runs immediately after, in the same act() - the hook
  // sets a real setInterval(fetchAssignments, 30000) inside one of them,
  // and letting that persist past this render was leaking a live timer
  // into later tests (each additional test added one more background
  // fetchAssignments() call racing against jest.resetAllMocks() in the
  // next test's beforeEach, corrupting its render). Running cleanup
  // immediately means every test only ever gets the one initial fetch.
  await act(async () => {
    const calls = mockUseFocusEffect.mock.calls;
    for (let i = 0; i < calls.length; i++) {
      const cb = calls[i][0];
      if (typeof cb === 'function') {
        const cleanup = cb();
        if (typeof cleanup === 'function') cleanup();
      }
    }
    mockUseFocusEffect.mockClear();
  });

  await waitFor(() => expect(result.current.loading).toBe(false));

  currentUnmount = unmount;

  return { result };
}

describe('useParentAssignments', () => {
  beforeEach(() => {
    // resetAllMocks (not clearAllMocks) so a mockResolvedValue/
    // mockRejectedValue set in one test can't leak its implementation
    // into the next test - clearAllMocks only clears call history, it
    // keeps implementations, which was silently corrupting later tests
    // in this suite when it used clearAllMocks.
    jest.resetAllMocks();
  });

  afterEach(() => {
    if (currentUnmount) {
      currentUnmount();
      currentUnmount = null;
    }
  });

  it('loads children and selects the first child', async () => {
    const { result } = await renderAndSettle();

    expect(mockedService.fetchChildren).toHaveBeenCalledWith('parent@test.com');
    expect(result.current.selectedIdx).toBe(0);
    expect(result.current.child).toEqual(MOCK_CHILDREN[0]);
  });

  it('sets loading to false when no children exist', async () => {
    const { result } = await renderAndSettle({ children: [] });

    expect(result.current.loading).toBe(false);
    expect(result.current.children).toEqual([]);
    expect(result.current.child).toBeUndefined();
  });

  it('fetches assignments and stats when child is set', async () => {
    const { result } = await renderAndSettle({
      assignments: MOCK_ASSIGNMENTS,
      stats: { studyTimeMinutes: 120 },
    });

    await waitFor(() => expect(result.current.assignments.length).toBe(3));

    expect(mockedService.fetchAssignmentsAndStats).toHaveBeenCalledWith('c1');
    expect(result.current.totalStudyMins).toBe(120);
  });

  it('fetches subject options for child curriculum', async () => {
    const { result } = await renderAndSettle();

    await waitFor(() => expect(result.current.subjectOptions).toEqual(MOCK_SUBJECT_OPTIONS));

    expect(mockedService.fetchSubjectOptions).toHaveBeenCalledWith('IB PYP', 'Grade 3');
  });

  it('handles fetchAssignments error and sets loading to false', async () => {
    (mockedService.fetchAssignmentsAndStats as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const { result } = await renderAndSettle({ assignments: [] });
    expect(result.current.loading).toBe(false);
  });

  it('handles fetchSubjectOptions error and falls back', async () => {
    (mockedService.fetchSubjectOptions as jest.Mock).mockRejectedValueOnce(new Error('Error'));
    const { result } = await renderAndSettle();
    expect(result.current.subjectOptions).toEqual(['Mathematics', 'Science', 'English', 'Social Studies', 'Arts', 'Physical Education', 'ICT']);
  });

  it('computes filtered assignments based on activeFilter', async () => {
    const { result } = await renderAndSettle({ assignments: MOCK_ASSIGNMENTS });

    await waitFor(() => expect(result.current.filtered.length).toBe(3));

    await act(async () => { result.current.setActiveFilter('School'); });
    await waitFor(() => expect(result.current.filtered.length).toBe(1));
    expect(result.current.filtered[0].createdBy).toBe('teacher');

    await act(async () => { result.current.setActiveFilter('Parent'); });
    await waitFor(() => expect(result.current.filtered.length).toBe(2));

    await act(async () => { result.current.setActiveFilter('Done'); });
    await waitFor(() => expect(result.current.filtered.length).toBe(1));
    expect(result.current.filtered[0].status).toBe('completed');
    
    await act(async () => { result.current.setActiveFilter('All'); });
    await waitFor(() => expect(result.current.filtered.length).toBe(3));
  });

  it('computes stats (completed, pending, overdue, completionPct)', async () => {
    const pastDate = '2020-01-01';
    const futureDate = '2099-12-31';

    const assignments = [
      { id: 'a1', status: 'completed' as const, dueDate: pastDate, title: '', subject: '', type: 'assignment', score: null, note: '', createdBy: 'parent' },
      { id: 'a2', status: 'pending' as const, dueDate: futureDate, title: '', subject: '', type: 'assignment', score: null, note: '', createdBy: 'parent' },
      { id: 'a3', status: 'pending' as const, dueDate: pastDate, title: '', subject: '', type: 'assignment', score: null, note: '', createdBy: 'parent' },
    ];

    const { result } = await renderAndSettle({ assignments });

    await waitFor(() => expect(result.current.assignments.length).toBe(3));

    expect(result.current.completed).toBe(1);
    expect(result.current.pending).toBe(2);
    expect(result.current.overdue).toBe(1);
    expect(result.current.completionPct).toBe(33);
  });

  it('createAssignment validates title is required', async () => {
    const { result } = await renderAndSettle();

    await act(async () => {
      await result.current.createAssignment();
    });

    expect(result.current.formError).toBe('Title is required');
    expect(mockedService.createAssignment).not.toHaveBeenCalled();
  });

  it('createAssignment validates dueDate is required', async () => {
    const { result } = await renderAndSettle();

    await act(async () => {
      result.current.setTitle('Test Title');
    });

    await act(async () => {
      await result.current.createAssignment();
    });

    expect(result.current.formError).toBe('Due date is required (YYYY-MM-DD)');
    expect(mockedService.createAssignment).not.toHaveBeenCalled();
  });

  it('createAssignment calls service and prepends result', async () => {
    const created = {
      id: 'new1', title: 'New Assignment', subject: 'Mathematics',
      dueDate: '2099-12-31', type: 'assignment', status: 'pending' as const,
      score: null, note: '', createdBy: 'parent',
    };
    mockedService.createAssignment.mockResolvedValue(created as any);

    const { result } = await renderAndSettle();

    await act(async () => {
      result.current.setTitle('New Assignment');
      result.current.setDueDate('2099-12-31');
    });
    await waitFor(() => expect(result.current.dueDate).toBe('2099-12-31'));

    await act(async () => {
      await result.current.createAssignment();
    });

    expect(mockedService.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Assignment',
        dueDate: '2099-12-31',
        studentId: 'c1',
        parentEmail: 'parent@test.com',
      })
    );
    expect(result.current.assignments[0]).toEqual(created);
    expect(result.current.formError).toBe('');
    expect(result.current.showModal).toBe(false);
  });

  it('handles createAssignment error', async () => {
    mockedService.createAssignment.mockRejectedValue(new Error('Server error'));
    const { result } = await renderAndSettle();

    await act(async () => {
      result.current.setTitle('New Assignment');
      result.current.setDueDate('2099-12-31');
    });

    await act(async () => {
      await result.current.createAssignment();
    });

    expect(result.current.formError).toBe('Server error');
  });

  it('generateWithAI calls service and populates form', async () => {
    mockedService.generateWithAI.mockResolvedValue({
      title: 'AI Title',
      chapter: 'AI Chapter',
      note: 'AI Note',
      type: 'quiz',
      questions: ['q1', 'q2'],
      quizQuestions: [{ q: 'q1', options: ['a', 'b'], a: 'a' }],
    } as any);

    const { result } = await renderAndSettle();

    await act(async () => { result.current.setAiPrompt('generate math quiz'); });
    await waitFor(() => expect(result.current.aiPrompt).toBe('generate math quiz'));

    await act(async () => {
      await result.current.generateWithAI();
    });

    expect(mockedService.generateWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'generate math quiz',
        subject: 'Mathematics',
        grade: 'Grade 3',
        curriculum: 'IB PYP',
      })
    );
    expect(result.current.title).toBe('AI Title');
    expect(result.current.chapter).toBe('AI Chapter');
    expect(result.current.note).toBe('AI Note');
    expect(result.current.type).toBe('quiz');
    expect(result.current.questions).toEqual(['q1', 'q2']);
    expect(result.current.quizQuestions).toEqual([{ q: 'q1', options: ['a', 'b'], a: 'a' }]);
    expect(result.current.aiGenerated).toBe(true);
  });

  it('generateWithAI skips when prompt is empty', async () => {
    const { result } = await renderAndSettle();

    await act(async () => {
      await result.current.generateWithAI();
    });

    expect(mockedService.generateWithAI).not.toHaveBeenCalled();
  });

  it('generateWithAI handles errors and sets formError', async () => {
    mockedService.generateWithAI.mockRejectedValue(new Error('AI failed'));

    const { result } = await renderAndSettle();

    await act(async () => { result.current.setAiPrompt('test'); });
    await waitFor(() => expect(result.current.aiPrompt).toBe('test'));

    await act(async () => {
      await result.current.generateWithAI();
    });

    expect(result.current.formError).toBe('AI failed');
    expect(result.current.aiGenerating).toBe(false);
  });

  it('resetForm clears all form fields', async () => {
    const { result } = await renderAndSettle();

    await act(async () => {
      result.current.setTitle('Test');
      result.current.setChapter('Ch1');
      result.current.setNote('Note');
      result.current.setDueDate('2099-01-01');
    });
    await waitFor(() => expect(result.current.title).toBe('Test'));

    await act(async () => { result.current.resetForm(); });

    expect(result.current.title).toBe('');
    expect(result.current.chapter).toBe('');
    expect(result.current.note).toBe('');
    expect(result.current.dueDate).toBe('');
    expect(result.current.type).toBe('assignment');
    expect(result.current.subject).toBe('Mathematics');
  });
});
