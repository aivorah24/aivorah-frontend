import { syncUser, saveProfile, fetchChildrenActivity } from '../../services/parentProfileService';
import SERVER_URL from '../../../../../config/serverUrl';
import PROFILE_SERVER_URL from '../../../../../config/profileServerUrl';
import AUTH_SERVER_URL from '../../../../../config/authServerUrl';
import STUDENTS_SERVER_URL from '../../../../../config/studentsServerUrl';

global.fetch = jest.fn();

describe('parentProfileService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncUser', () => {
    it('calls sync endpoint and returns data', async () => {
      const mockData = { phone: '123', location: 'City' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce(mockData),
      });

      const res = await syncUser('test@test.com');
      expect(fetch).toHaveBeenCalledWith(`${AUTH_SERVER_URL}/user/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com' }),
      });
      expect(res).toEqual(mockData);
    });
  });

  describe('saveProfile', () => {
    it('calls patch profile endpoint', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      const payload = { email: 't@t.com', name: 'Name', location: 'City', phone: '123', role: 'parent' };
      await saveProfile(payload);
      expect(fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    });
  });

  describe('fetchChildrenActivity', () => {
    it('returns empty if no children', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce([]),
      });

      const res = await fetchChildrenActivity('test@test.com');
      expect(res).toEqual({ children: [], weeklyActivity: [0, 0, 0, 0, 0, 0, 0] });
    });

    it('aggregates activity correctly for multiple children', async () => {
      // 1. Fetch children
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }]),
      });
      // 2. Fetch weekly for c1
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          days: [{ day: 'Mon', studyMinutes: 10 }, { day: 'Tue', studyMinutes: 5 }],
        }),
      });
      // 3. Fetch weekly for c2
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          days: [{ day: 'Mon', studyMinutes: 20 }, { day: 'Wed', studyMinutes: 15 }],
        }),
      });

      const res = await fetchChildrenActivity('test@test.com');
      
      expect(fetch).toHaveBeenCalledWith(`${STUDENTS_SERVER_URL}/parent/test%40test.com/children`);
      expect(fetch).toHaveBeenCalledWith(`${SERVER_URL}/student/c1/weekly`);
      expect(fetch).toHaveBeenCalledWith(`${SERVER_URL}/student/c2/weekly`);

      // Mon = 10+20=30
      // Tue = 5
      // Wed = 15
      // assuming WEEK_DAYS is [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
      expect(res.children).toEqual([{ id: 'c1' }, { id: 'c2' }]);
      expect(res.weeklyActivity).toEqual([30, 5, 15, 0, 0, 0, 0]);
    });

    it('handles failures gracefully in child fetch', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce([{ id: 'c1' }]),
      });
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const res = await fetchChildrenActivity('test@test.com');
      expect(res.weeklyActivity).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });
  });
});
