import * as parentLearningService from '../../services/parentLearningService';
import SERVER_URL from '../../../../../config/serverUrl';
import STUDENTS_SERVER_URL from '../../../../../config/studentsServerUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../../config/learningPathsServerUrl';

global.fetch = jest.fn();

describe('parentLearningService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchChildren', () => {
    it('calls aivorah-students-service\'s children endpoint and returns the list', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce([{ id: 'c1', name: 'Kid' }]),
      });
      const res = await parentLearningService.fetchChildren('parent@test.com');
      expect(fetch).toHaveBeenCalledWith(`${STUDENTS_SERVER_URL}/parent/parent%40test.com/children`);
      expect(res).toEqual([{ id: 'c1', name: 'Kid' }]);
    });

    it('returns an empty array when the payload is not an array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValueOnce({}) });
      const res = await parentLearningService.fetchChildren('parent@test.com');
      expect(res).toEqual([]);
    });
  });

  describe('fetchStudentStats', () => {
    it('returns completedTopics and topicsExplored from a real response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ completedTopics: ['t1', 't2'], topicsExplored: 5 }),
      });
      const res = await parentLearningService.fetchStudentStats('c1');
      expect(fetch).toHaveBeenCalledWith(`${STUDENTS_SERVER_URL}/student/c1`);
      expect(res).toEqual({ completedTopics: ['t1', 't2'], topicsExplored: 5 });
    });

    it('returns safe defaults when the response has an error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValueOnce({ error: 'boom' }) });
      const res = await parentLearningService.fetchStudentStats('c1');
      expect(res).toEqual({ completedTopics: [], topicsExplored: 0 });
    });

    it('returns safe defaults when the request itself fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));
      const res = await parentLearningService.fetchStudentStats('c1');
      expect(res).toEqual({ completedTopics: [], topicsExplored: 0 });
    });
  });

  describe('fetchChildReport', () => {
    it('returns the report on success', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ totalMinutes: 30, totalAIChats: 2 }),
      });
      const res = await parentLearningService.fetchChildReport('kid@test.com');
      expect(fetch).toHaveBeenCalledWith(`${SERVER_URL}/analytics/child-report?childEmail=kid%40test.com`);
      expect(res).toEqual({ totalMinutes: 30, totalAIChats: 2 });
    });

    it('returns null when the response has an error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValueOnce({ error: 'boom' }) });
      const res = await parentLearningService.fetchChildReport('kid@test.com');
      expect(res).toBeNull();
    });

    it('returns null when the request throws', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));
      const res = await parentLearningService.fetchChildReport('kid@test.com');
      expect(res).toBeNull();
    });
  });

  describe('fetchCurriculumSubjects', () => {
    it('calls the curriculum endpoint with grade and curriculum, returns subjects', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ subjects: [{ subject: 'Mathematics' }] }),
      });
      const res = await parentLearningService.fetchCurriculumSubjects('Grade 3', 'NCERT');
      expect(fetch).toHaveBeenCalledWith(`${LEARNING_PATHS_SERVER_URL}/curriculum/subjects?grade=Grade%203&curriculum=NCERT`);
      expect(res).toEqual([{ subject: 'Mathematics' }]);
    });

    it('returns an empty array when the request fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));
      const res = await parentLearningService.fetchCurriculumSubjects('Grade 3', 'NCERT');
      expect(res).toEqual([]);
    });
  });
});
