import { fetchImportHistory } from '../../services/importHistoryService';

describe('importHistoryService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('fetches and returns import runs for the given admin', async () => {
    const runs = [{ id: '1', type: 'students', fileName: 'a.csv', runByEmail: 'a@x.com', importedCount: 5, skippedCount: 0, status: 'Completed', createdAt: '2026-01-01' }];
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => runs });

    const result = await fetchImportHistory('admin@x.com');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/school-admin/import-history?adminEmail=admin%40x.com'));
    expect(result).toEqual(runs);
  });

  it('returns an empty array when the response body is not an array', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
    const result = await fetchImportHistory('admin@x.com');
    expect(result).toEqual([]);
  });

  it('throws with the server error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'schoolId required' }) });
    await expect(fetchImportHistory('admin@x.com')).rejects.toThrow('schoolId required');
  });
});
