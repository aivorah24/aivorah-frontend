import * as parentProgressService from '../../services/parentProgressService';
import STUDENTS_SERVER_URL from '../../../../../config/studentsServerUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../../config/learningPathsServerUrl';
import PARENT_SERVER_URL from '../../../../../config/parentServerUrl';

global.fetch = jest.fn();

describe('parentProgressService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchChildren', () => {
    it('calls aivorah-students-service children endpoint and returns list', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([{ id: 'c1', name: 'Kid' }]),
      });
      const res = await parentProgressService.fetchChildren('parent@test.com');
      expect(fetch).toHaveBeenCalledWith(`${PARENT_SERVER_URL}/parent/parent%40test.com/children`);
      expect(res).toEqual([{ id: 'c1', name: 'Kid' }]);
    });

    it('returns an empty array when payload is not an array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ error: 'invalid' }),
      });
      const res = await parentProgressService.fetchChildren('parent@test.com');
      expect(res).toEqual([]);
    });
  });

  describe('fetchProgressData', () => {
    const mockChild = { id: 'c1', curriculum: 'CBSE', grade: 'Grade 5' };

    it('fetches stats, weekly, trends, and topic-count', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ xpPoints: 100 }) }) // stats
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ days: [{ day: 'Mon', studyMinutes: 30 }] }) }) // weekly
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ topics: [] }) }) // trends
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ totalTopics: 42 }) }); // topic-count

      const res = await parentProgressService.fetchProgressData(mockChild);
      
      expect(fetch).toHaveBeenCalledTimes(4);
      expect(fetch).toHaveBeenNthCalledWith(1, `${STUDENTS_SERVER_URL}/student/c1`);
      expect(fetch).toHaveBeenNthCalledWith(2, `${STUDENTS_SERVER_URL}/student/c1/weekly`);
      expect(fetch).toHaveBeenNthCalledWith(3, `${STUDENTS_SERVER_URL}/student/c1/mistake-trends`);
      expect(fetch).toHaveBeenNthCalledWith(4, `${LEARNING_PATHS_SERVER_URL}/curriculum/topic-count?curriculum=CBSE&grade=Grade%205`);

      expect(res.stats).toEqual({ xpPoints: 100, totalTopics: 42 });
      expect(res.weekly).toEqual([30, 0, 0, 0, 0, 0, 0]);
      expect(res.practiceInsights).toEqual({ topics: [] });
    });

    it('handles missing weekly data and errors gracefully', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error')) // stats
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({}) }) // weekly empty
        .mockRejectedValueOnce(new Error('Network Error')) // trends
        .mockRejectedValueOnce(new Error('Network Error')); // topic-count

      const res = await parentProgressService.fetchProgressData(mockChild);
      
      expect(res.stats).toBeNull();
      expect(res.weekly).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(res.practiceInsights).toBeNull();
    });

    it('handles non-ok responses for optional endpoints', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ xpPoints: 50 }) }) // stats
        .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ days: [] }) }) // weekly
        .mockResolvedValueOnce({ ok: false }) // trends
        .mockResolvedValueOnce({ ok: false }); // topic-count

      const res = await parentProgressService.fetchProgressData(mockChild);
      
      expect(res.stats).toEqual({ xpPoints: 50 });
      expect(res.weekly).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(res.practiceInsights).toBeNull();
    });
  });
});
