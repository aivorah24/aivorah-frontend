import { fetchMyClasses } from '../classesApi';
import SERVER_URL from '../../../../config/attendanceServerUrl';

jest.mock('../../../../services/authHeader', () => ({
  authHeader: jest.fn(async () => ({ Authorization: 'Bearer tok' })),
}));

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('fetchMyClasses', () => {
  it('calls aivorah-attendance-service with the Firebase auth header, no email param', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ classes: [{ grade: 'Grade 5', section: 'A' }] }) });
    const result = await fetchMyClasses();
    expect(result).toEqual([{ grade: 'Grade 5', section: 'A' }]);
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/classes/mine`, { headers: { Authorization: 'Bearer tok' } });
  });

  it('returns an empty array when the response has no classes field', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    expect(await fetchMyClasses()).toEqual([]);
  });

  it('throws the server-provided error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'No Aivorah account for this sign-in' }) });
    await expect(fetchMyClasses()).rejects.toThrow('No Aivorah account for this sign-in');
  });
});
