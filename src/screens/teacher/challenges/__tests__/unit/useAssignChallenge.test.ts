import { renderHook, act } from '@testing-library/react-native';
import { useAssignChallenge } from '../../hooks/useAssignChallenge';
import * as service from '../../services/teacherChallengesService';

jest.mock('../../services/teacherChallengesService', () => ({
  __esModule: true,
  assignChallenge: jest.fn(),
}));

const CH = { id: 'c1', title: 'Quiz', description: 'A quick quiz', grade: 'Grade 3', curriculum: 'CBSE', subject: 'Math', chapterId: 1, topic: 'x', difficulty: 'Easy' as const, xpReward: 10, questionCount: 5, timeLimitMinutes: 10, type: 'quiz', category: 'Chapter Quiz' };
const STUDENT = { id: 's1', name: 'Alice', grade: 'Grade 3' };

describe('useAssignChallenge', () => {
  let currentUnmount: (() => void) | null = null;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    if (currentUnmount) currentUnmount();
    currentUnmount = null;
  });

  const setup = async () => {
    const { result, unmount } = await renderHook(() => useAssignChallenge('t@x.com'));
    currentUnmount = unmount;
    return result;
  };

  it('openAssign sets the challenge, resets state, and defaults due date to +7 days', async () => {
    const result = await setup();
    await act(async () => result.current.openAssign(CH));
    expect(result.current.assignModal).toBe(true);
    expect(result.current.assignChallengeItem).toEqual(CH);
    const expected = new Date(); expected.setDate(expected.getDate() + 7);
    expect(result.current.assignDueDate).toBe(expected.toISOString().split('T')[0]);
  });

  it('closeAssign resets all modal state', async () => {
    const result = await setup();
    await act(async () => result.current.openAssign(CH));
    await act(async () => result.current.setSelectedStudent(STUDENT));
    await act(async () => result.current.closeAssign());
    expect(result.current.assignModal).toBe(false);
    expect(result.current.assignChallengeItem).toBeNull();
    expect(result.current.selectedStudent).toBeNull();
  });

  it('doAssign requires a selected student', async () => {
    const result = await setup();
    await act(async () => result.current.openAssign(CH));
    await act(async () => result.current.doAssign());
    expect(result.current.assignError).toBe('Please select a student.');
    expect(service.assignChallenge).not.toHaveBeenCalled();
  });

  it('doAssign requires a due date', async () => {
    const result = await setup();
    await act(async () => result.current.openAssign(CH));
    await act(async () => result.current.setSelectedStudent(STUDENT));
    await act(async () => result.current.setAssignDueDate(''));
    await act(async () => result.current.doAssign());
    expect(result.current.assignError).toBe('Please select a due date.');
  });

  it('doAssign succeeds and sets a success message', async () => {
    (service.assignChallenge as jest.Mock).mockResolvedValueOnce({ ok: true });
    const result = await setup();
    await act(async () => result.current.openAssign(CH));
    await act(async () => result.current.setSelectedStudent(STUDENT));
    await act(async () => result.current.doAssign());
    expect(service.assignChallenge).toHaveBeenCalledWith({
      challengeId: 'c1', studentId: 's1', teacherEmail: 't@x.com',
      dueDate: result.current.assignDueDate,
    });
    expect(result.current.assignSuccess).toBe('"Quiz" assigned to Alice!');
  });

  it('doAssign surfaces a server error', async () => {
    (service.assignChallenge as jest.Mock).mockResolvedValueOnce({ ok: false, error: 'Grade mismatch' });
    const result = await setup();
    await act(async () => result.current.openAssign(CH));
    await act(async () => result.current.setSelectedStudent(STUDENT));
    await act(async () => result.current.doAssign());
    expect(result.current.assignError).toBe('Grade mismatch');
    expect(result.current.assignSuccess).toBe('');
  });

  it('doAssign surfaces a network error', async () => {
    (service.assignChallenge as jest.Mock).mockRejectedValueOnce(new Error('network'));
    const result = await setup();
    await act(async () => result.current.openAssign(CH));
    await act(async () => result.current.setSelectedStudent(STUDENT));
    await act(async () => result.current.doAssign());
    expect(result.current.assignError).toBe('Network error. Please try again.');
  });
});
