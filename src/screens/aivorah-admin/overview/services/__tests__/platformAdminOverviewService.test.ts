import { fetchChartsData, fetchPlatformOverview } from '../platformAdminOverviewService';
import SERVER_URL from '../../../../../config/platformAdminServerUrl';

jest.mock('../../../../../services/authHeader', () => ({
  authHeader: jest.fn(async () => ({ Authorization: 'Bearer tok' })),
}));

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('fetchPlatformOverview', () => {
  it('returns the overview payload on success, with the auth header attached', async () => {
    const payload = { counts: { users: 1, students: 1, teachers: 0, parents: 0, totalXP: 0, assignments: 0, assignmentsCompleted: 0 }, students: [], teachers: [], parents: [] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => payload });

    const result = await fetchPlatformOverview();

    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/overview`, { headers: { Authorization: 'Bearer tok' } });
  });

  it('throws the server-provided error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Unauthorized' }) });
    await expect(fetchPlatformOverview()).rejects.toThrow('Unauthorized');
  });

  it('falls back to a generic error message when the failure response body is not JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('bad json'); } });
    await expect(fetchPlatformOverview()).rejects.toThrow('Failed to load platform overview');
  });
});

describe('fetchChartsData', () => {
  it('returns the charts payload on success, with the auth header attached', async () => {
    const payload = {
      roleCounts: { student: 1, teacher: 0, parent: 0 },
      curriculumMap: {}, gradeMap: {},
      onboarding: { student: { done: 0, total: 1 }, teacher: { done: 0, total: 0 }, parent: { done: 0, total: 0 } },
      topXP: [], assignmentStats: { total: 0, completed: 0, pending: 0, byType: {} }, assignmentsLast7: [],
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => payload });

    const result = await fetchChartsData();

    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/charts-data`, { headers: { Authorization: 'Bearer tok' } });
  });

  it('throws the server-provided error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Unauthorized' }) });
    await expect(fetchChartsData()).rejects.toThrow('Unauthorized');
  });
});
