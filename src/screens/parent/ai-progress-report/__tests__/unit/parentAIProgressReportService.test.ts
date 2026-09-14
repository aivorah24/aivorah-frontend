import * as service from '../../services/parentAIProgressReportService';
import STUDENTS_SERVER_URL from '../../../../../config/studentsServerUrl';
import PARENT_SERVER_URL from '../../../../../config/parentServerUrl';

global.fetch = jest.fn();

describe('parentAIProgressReportService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchChildren', () => {
    it('calls the monolith and returns mapped children', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce([{ id: 'c1', name: 'Kid 1', grade: 'Grade 3', extra: 'ignored' }]),
      });
      const res = await service.fetchChildren('parent@test.com');
      expect(fetch).toHaveBeenCalledWith(`${PARENT_SERVER_URL}/parent/parent%40test.com/children`);
      expect(res).toEqual([{ id: 'c1', name: 'Kid 1', grade: 'Grade 3' }]);
    });

    it('returns an empty array when the payload is not an array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ error: 'not array' }),
      });
      const res = await service.fetchChildren('parent@test.com');
      expect(res).toEqual([]);
    });
  });

  describe('generateAIReport', () => {
    it('calls aivorah-students-service and returns the report', async () => {
      const payload = { student: { name: 'Kid 1' }, metrics: { xp: 100 }, report: {} };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(payload),
      });
      const res = await service.generateAIReport('parent@test.com', 'child-1');
      expect(fetch).toHaveBeenCalledWith(
        `${STUDENTS_SERVER_URL}/parent/parent%40test.com/children/child-1/ai-report`,
      );
      expect(res).toEqual(payload);
    });

    it('throws with the server error message on failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValueOnce({ error: 'model_not_found' }),
      });
      await expect(service.generateAIReport('parent@test.com', 'child-1')).rejects.toThrow('model_not_found');
    });

    it('falls back to a generic error when the failure body has no error field', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockRejectedValueOnce(new Error('bad json')),
      });
      await expect(service.generateAIReport('parent@test.com', 'child-1')).rejects.toThrow('Failed to generate report');
    });
  });
});
