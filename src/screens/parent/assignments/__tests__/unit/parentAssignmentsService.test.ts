import * as parentAssignmentsService from '../../services/parentAssignmentsService';
import SERVER_URL from '../../../../../config/serverUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../../config/learningPathsServerUrl';
import STUDENTS_SERVER_URL from '../../../../../config/studentsServerUrl';
import ASSIGNMENTS_SERVER_URL from '../../../../../config/assignmentsServerUrl';
import PARENT_SERVER_URL from '../../../../../config/parentServerUrl';

global.fetch = jest.fn();

describe('parentAssignmentsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchChildren', () => {
    it('calls students service and returns the list of children', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([{ id: 'c1', name: 'Kid 1' }]),
      });
      const res = await parentAssignmentsService.fetchChildren('parent@test.com');
      expect(fetch).toHaveBeenCalledWith(`${PARENT_SERVER_URL}/parent/parent%40test.com/children`);
      expect(res).toEqual([{ id: 'c1', name: 'Kid 1' }]);
    });

    it('returns an empty array when the payload is not an array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ error: 'not array' }),
      });
      const res = await parentAssignmentsService.fetchChildren('parent@test.com');
      expect(res).toEqual([]);
    });
  });

  describe('fetchAssignmentsAndStats', () => {
    it('returns assignments and stats on success', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce([{ id: 'a1' }]),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce({ id: 's1', score: 100 }),
        });

      const res = await parentAssignmentsService.fetchAssignmentsAndStats('child1');
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, `${ASSIGNMENTS_SERVER_URL}/assignments?studentId=child1&viewerRole=parent`);
      expect(fetch).toHaveBeenNthCalledWith(2, `${STUDENTS_SERVER_URL}/student/child1`);
      
      expect(res).toEqual({
        assignments: [{ id: 'a1' }],
        stats: { id: 's1', score: 100 },
      });
    });

    it('handles fetch failures gracefully and returns empty array and null', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const res = await parentAssignmentsService.fetchAssignmentsAndStats('child1');
      expect(res).toEqual({
        assignments: [],
        stats: null,
      });
    });

    it('handles non-array assignData by returning an empty array', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce({ error: 'not array' }),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce({ id: 's1' }),
        });

      const res = await parentAssignmentsService.fetchAssignmentsAndStats('child1');
      expect(res.assignments).toEqual([]);
      expect(res.stats).toEqual({ id: 's1' });
    });
  });

  describe('fetchCurriculumTopics', () => {
    it('filters topics by grade correctly', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          topics: [
            { subject: 'Math', topic: 'Algebra', grade: 'Grade 5' },
            { subject: 'Science', topic: 'Biology', grade: 'Grade 6' },
          ],
        }),
      });

      const res = await parentAssignmentsService.fetchCurriculumTopics('Grade 5');
      expect(res).toEqual([{ subject: 'Math', topic: 'Algebra', grade: 'Grade 5' }]);
    });

    it('returns empty array if topics is missing', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({}),
      });

      const res = await parentAssignmentsService.fetchCurriculumTopics('Grade 5');
      expect(res).toEqual([]);
    });
  });

  describe('fetchSubjectOptions', () => {
    it('routes CBSE to LEARNING_PATHS_SERVER_URL', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ subjects: ['Math'] }),
      });
      await parentAssignmentsService.fetchSubjectOptions('CBSE', 'Grade 5');
      expect(fetch).toHaveBeenCalledWith(`${LEARNING_PATHS_SERVER_URL}/curriculum/subjects?grade=Grade%205&curriculum=CBSE`);
    });

    it('routes IB DP/MYP to LEARNING_PATHS_SERVER_URL', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ subjects: ['Math'] }),
      });
      await parentAssignmentsService.fetchSubjectOptions('IB DP', 'Grade 11');
      expect(fetch).toHaveBeenCalledWith(`${LEARNING_PATHS_SERVER_URL}/curriculum/subjects?grade=Grade%2011&curriculum=IB%20DP`);
    });

    it('routes Cambridge grade >= 6 to LEARNING_PATHS_SERVER_URL', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ subjects: ['Math'] }),
      });
      await parentAssignmentsService.fetchSubjectOptions('Cambridge', 'Grade 6');
      expect(fetch).toHaveBeenCalledWith(`${LEARNING_PATHS_SERVER_URL}/curriculum/subjects?grade=Grade%206&curriculum=Cambridge`);
    });

    it('routes IB PYP to SERVER_URL', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ subjects: ['Math'] }),
      });
      await parentAssignmentsService.fetchSubjectOptions('IB PYP', 'Grade 3');
      expect(fetch).toHaveBeenCalledWith(`${SERVER_URL}/curriculum/subjects?grade=Grade%203&curriculum=IB%20PYP`);
    });

    it('falls back to IB_PYP_SUBJECTS if subjects is missing', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({}),
      });
      const res = await parentAssignmentsService.fetchSubjectOptions('IB PYP', 'Grade 3');
      expect(res).toEqual(parentAssignmentsService.IB_PYP_SUBJECTS);
    });

    it('returns subjects as string array handling objects with name', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ subjects: ['Math', { name: 'Science' }, { invalid: 'test' }] }),
      });
      const res = await parentAssignmentsService.fetchSubjectOptions('CBSE', 'Grade 5');
      expect(res).toEqual(['Math', 'Science']);
    });

    it('falls back to IB_PYP_SUBJECTS when subjects array is empty', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ subjects: [] }),
      });
      const res = await parentAssignmentsService.fetchSubjectOptions('CBSE', 'Grade 5');
      expect(res).toEqual(parentAssignmentsService.IB_PYP_SUBJECTS);
    });
  });

  describe('generateWithAI', () => {
    const mockPayload: parentAssignmentsService.GenerateAIPayload = {
      prompt: 'test prompt',
      subject: 'Math',
      count: 3,
      type: 'assignment',
    };

    it('POSTs correct payload and returns data', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      });
      const res = await parentAssignmentsService.generateWithAI(mockPayload);
      
      expect(fetch).toHaveBeenCalledWith(`${ASSIGNMENTS_SERVER_URL}/assignments/ai-generate`, expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'test prompt',
          subject: 'Math',
          grade: undefined,
          curriculum: 'IB PYP',
          count: 3,
          type: 'assignment',
        }),
      }));
      expect(res).toEqual({ success: true });
    });

    it('throws with server error message', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Server AI error' }),
      });
      await expect(parentAssignmentsService.generateWithAI(mockPayload)).rejects.toThrow('Server AI error');
    });

    it('falls back to generic error when body is unreadable', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockRejectedValueOnce(new Error('unreadable')),
      });
      await expect(parentAssignmentsService.generateWithAI(mockPayload)).rejects.toThrow('AI generation failed');
    });
  });

  describe('createAssignment', () => {
    const mockPayload: parentAssignmentsService.CreateAssignmentPayload = {
      title: 'T1',
      subject: 'Math',
      chapter: 'C1',
      dueDate: '2025-01-01',
      type: 'assignment',
      note: 'Note',
      studentId: 'child1',
      studentName: 'Kid One',
      parentEmail: 'parent@test.com',
      curriculum: 'CBSE',
      questions: ['q1'],
      quizQuestions: [{ q: 'q1' }],
    };

    it('POSTs correct payload for assignment type', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      });
      const res = await parentAssignmentsService.createAssignment(mockPayload);

      expect(fetch).toHaveBeenCalledWith(`${ASSIGNMENTS_SERVER_URL}/assignments`, expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'T1',
          subject: 'Math',
          chapter: 'C1',
          dueDate: '2025-01-01',
          type: 'assignment',
          note: 'Note',
          studentId: 'child1',
          studentName: 'Kid One',
          createdById: 'parent@test.com',
          createdByRole: 'parent',
          grade: undefined,
          curriculum: 'CBSE',
          questions: ['q1'],
          quizQuestions: [], // empty for 'assignment' type
        }),
      }));
      expect(res).toEqual({ success: true });
    });

    it('sends quizQuestions only for quiz type', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ success: true }),
      });
      await parentAssignmentsService.createAssignment({ ...mockPayload, type: 'quiz' });

      expect(fetch).toHaveBeenCalledWith(`${ASSIGNMENTS_SERVER_URL}/assignments`, expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(JSON.stringify([{ q: 'q1' }])), // quizQuestions is populated
      }));
    });

    it('throws with server error message', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'Creation failed' }),
      });
      await expect(parentAssignmentsService.createAssignment(mockPayload)).rejects.toThrow('Creation failed');
    });

    it('falls back to generic error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockRejectedValueOnce(new Error('unreadable')),
      });
      await expect(parentAssignmentsService.createAssignment(mockPayload)).rejects.toThrow('Failed to create assignment');
    });
  });
});
