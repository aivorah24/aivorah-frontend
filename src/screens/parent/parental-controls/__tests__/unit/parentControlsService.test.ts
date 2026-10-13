import * as parentControlsService from '../../services/parentControlsService';
import STUDENTS_SERVER_URL from '../../../../../config/studentsServerUrl';
import PARENTAL_CONTROLS_SERVER_URL from '../../../../../config/parentalControlsServerUrl';
import type { Controls } from '../../types';

global.fetch = jest.fn();

const CTRL: Controls = {
  isEnabled: true, dailyLimitMinutes: 60, lockWhenReached: false, todayUsageMinutes: 0, weeklyUsageMinutes: 0,
  weeklyCapEnabled: false, weeklyCapMinutes: 300,
  allowedHoursEnabled: false, allowedHoursStart: 14, allowedHoursEnd: 21,
  breakEnforcerEnabled: false, breakIntervalMinutes: 25, breakDurationMinutes: 5,
  homeworkFirstEnabled: false,
  subjectFilterEnabled: false, blockedSubjects: [],
};

describe('parentControlsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchChildren', () => {
    it('calls aivorah-students-service\'s children endpoint', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce([{ id: 'c1', name: 'Kid' }]),
      });

      const res = await parentControlsService.fetchChildren('parent@test.com');
      expect(fetch).toHaveBeenCalledWith(`${STUDENTS_SERVER_URL}/parent/parent%40test.com/children`);
      expect(res).toEqual([{ id: 'c1', name: 'Kid' }]);
    });

    it('returns an empty array when the payload is not an array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValueOnce({}) });
      const res = await parentControlsService.fetchChildren('parent@test.com');
      expect(res).toEqual([]);
    });
  });

  describe('fetchScreenTime', () => {
    it('calls the parental-controls service GET endpoint', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true, json: jest.fn().mockResolvedValueOnce({ isEnabled: true }),
      });

      const res = await parentControlsService.fetchScreenTime('parent@test.com', 'c1');
      expect(fetch).toHaveBeenCalledWith(
        `${PARENTAL_CONTROLS_SERVER_URL}/parent/parent%40test.com/children/c1/screen-time`,
      );
      expect(res).toEqual({ isEnabled: true });
    });
  });

  describe('saveScreenTime', () => {
    it('POSTs the full control payload to the parental-controls service', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true, json: jest.fn().mockResolvedValueOnce({ success: true }),
      });

      const res = await parentControlsService.saveScreenTime('parent@test.com', 'c1', CTRL);

      expect(fetch).toHaveBeenCalledWith(
        `${PARENTAL_CONTROLS_SERVER_URL}/parent/parent%40test.com/children/c1/screen-time`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dailyLimitMinutes: 60,
            enabled: true,
            lockWhenReached: false,
            weeklyCapEnabled: false,
            weeklyCapMinutes: 300,
            allowedHoursEnabled: false,
            allowedHoursStart: 14,
            allowedHoursEnd: 21,
            breakEnforcerEnabled: false,
            breakIntervalMinutes: 25,
            breakDurationMinutes: 5,
            homeworkFirstEnabled: false,
            subjectFilterEnabled: false,
            blockedSubjects: [],
          }),
        },
      );
      expect(res).toEqual({ success: true });
    });

    it('propagates a server-reported error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ success: false, error: 'boom' }),
      });

      const res = await parentControlsService.saveScreenTime('parent@test.com', 'c1', CTRL);
      expect(res).toEqual({ success: false, error: 'boom' });
    });
  });
});

describe('parentControlsService — server unreachable (parental controls RCA)', () => {
  afterEach(() => jest.clearAllMocks());

  it('fetchScreenTime throws on a non-OK response instead of handing back an error body as settings', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404, json: jest.fn().mockResolvedValue({ error: 'not found' }) });
    await expect(parentControlsService.fetchScreenTime('p@test.com', 'c1')).rejects.toThrow('404');
  });

  it('saveScreenTime returns a readable failure for a non-JSON 404 (no server behind the URL)', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404, json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token N')) });
    const res = await parentControlsService.saveScreenTime('p@test.com', 'c1', CTRL);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/couldn't reach|could not reach/i);
  });
});
