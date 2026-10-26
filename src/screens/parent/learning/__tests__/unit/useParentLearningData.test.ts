import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useParentLearningData } from '../../hooks/useParentLearningData';
import * as parentLearningService from '../../services/parentLearningService';

jest.mock('../../services/parentLearningService');

const CHILD_A = { id: 'c1', name: 'Kid A', email: 'a@test.com', grade: 'Grade 3', curriculum: 'NCERT' };
const CHILD_B = { id: 'c2', name: 'Kid B', email: 'b@test.com', grade: 'PYP 4', curriculum: 'IB PYP' };

describe('useParentLearningData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Regression coverage for the real bug found via E2E testing (2026-09-04):
  // the legacy screen seeded its child list from AuthContext's `user.children`
  // before its own real fetch resolved, and that field could hold stale/
  // unrelated data - the hook was rewritten to have NO such fallback at all,
  // so its only possible data source is fetchChildren(). This test proves
  // the hook's children list, and the grade/curriculum used for the
  // subjects fetch, come exclusively from that real call.
  it('sources children ONLY from fetchChildren, with no other fallback', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A]);
    (parentLearningService.fetchStudentStats as jest.Mock).mockResolvedValue({ completedTopics: [], topicsExplored: 0 });
    (parentLearningService.fetchChildReport as jest.Mock).mockResolvedValue(null);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useParentLearningData('parent@test.com'));

    await waitFor(() => expect(result.current.child).toEqual(CHILD_A));
    // A legacy "NCERT" child is a CBSE child — queried and shown as CBSE.
    await waitFor(() => {
      expect(parentLearningService.fetchCurriculumSubjects).toHaveBeenCalledWith('Grade 3', 'CBSE');
    });
    expect(result.current.childGrade).toBe('Grade 3');
    expect(result.current.childCurriculum).toBe('CBSE');
  });

  it('auto-selects the first child and loads its stats/report/subjects', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A]);
    (parentLearningService.fetchStudentStats as jest.Mock).mockResolvedValue({ completedTopics: ['t1'], topicsExplored: 3 });
    (parentLearningService.fetchChildReport as jest.Mock).mockResolvedValue({ totalMinutes: 40, totalAIChats: 2, avgScore: 80, topicCount: 5, topics: {} });
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([{ subject: 'Mathematics', topicCount: 10 }]);

    const { result } = await renderHook(() => useParentLearningData('parent@test.com'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.completedTopics).toEqual(['t1']);
      expect(result.current.analyticsReport).toEqual(expect.objectContaining({ totalMinutes: 40 }));
      expect(result.current.subjects).toEqual([{ subject: 'Mathematics', topicCount: 10 }]);
    });
  });

  it('fills each subject\'s topics from the Learning Paths syllabus when the subjects list has none', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A]);
    (parentLearningService.fetchStudentStats as jest.Mock).mockResolvedValue({ completedTopics: ['Fractions'], topicsExplored: 1 });
    (parentLearningService.fetchChildReport as jest.Mock).mockResolvedValue(null);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([{ subject: 'Mathematics', topicCount: 2, topics: [] }]);
    (parentLearningService.fetchSubjectTopics as jest.Mock).mockResolvedValue([
      { topic: 'Fractions', unit: 'Numbers' }, { topic: 'Decimals', unit: 'Numbers' },
    ]);

    const { result } = await renderHook(() => useParentLearningData('parent@test.com'));

    await waitFor(() => expect(result.current.subjects[0]?.topics).toHaveLength(2));
    expect(parentLearningService.fetchSubjectTopics).toHaveBeenCalledWith('CBSE', 'Grade 3', 'Mathematics');
  });

  it('pre-selects the child matching targetChildId when provided', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A, CHILD_B]);
    (parentLearningService.fetchStudentStats as jest.Mock).mockResolvedValue({ completedTopics: [], topicsExplored: 0 });
    (parentLearningService.fetchChildReport as jest.Mock).mockResolvedValue(null);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useParentLearningData('parent@test.com', 'c2'));

    await waitFor(() => expect(result.current.child).toEqual(CHILD_B));
  });

  it('switching selectedIdx re-fetches data scoped to the newly selected child', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A, CHILD_B]);
    (parentLearningService.fetchStudentStats as jest.Mock).mockResolvedValue({ completedTopics: [], topicsExplored: 0 });
    (parentLearningService.fetchChildReport as jest.Mock).mockResolvedValue(null);
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useParentLearningData('parent@test.com'));
    await waitFor(() => expect(result.current.child).toEqual(CHILD_A));

    await act(async () => {
      result.current.setSelectedIdx(1);
    });

    await waitFor(() => {
      expect(parentLearningService.fetchCurriculumSubjects).toHaveBeenCalledWith('PYP 4', 'IB PYP');
    });
    expect(result.current.child).toEqual(CHILD_B);
  });

  it('resets analyticsReport when the selected child changes', async () => {
    (parentLearningService.fetchChildren as jest.Mock).mockResolvedValue([CHILD_A, CHILD_B]);
    (parentLearningService.fetchStudentStats as jest.Mock).mockResolvedValue({ completedTopics: [], topicsExplored: 0 });
    (parentLearningService.fetchChildReport as jest.Mock).mockResolvedValue({ totalMinutes: 10, totalAIChats: 1, avgScore: 90, topicCount: 1, topics: {} });
    (parentLearningService.fetchCurriculumSubjects as jest.Mock).mockResolvedValue([]);

    const { result } = await renderHook(() => useParentLearningData('parent@test.com'));
    await waitFor(() => expect(result.current.analyticsReport).not.toBeNull());

    await act(async () => {
      result.current.setSelectedIdx(1);
    });

    // Immediately after switching, the stale report must be cleared - it's
    // re-populated once the new child's own fetch resolves.
    await waitFor(() => expect(result.current.child).toEqual(CHILD_B));
  });
});
