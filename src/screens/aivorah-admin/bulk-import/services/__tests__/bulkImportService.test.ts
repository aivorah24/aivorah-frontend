import { bulkCreateStudents, importSpreadsheet } from '../bulkImportService';
import SERVER_URL from '../../../../../config/platformAdminServerUrl';

jest.mock('../../../../../services/authHeader', () => ({
  authHeader: jest.fn(async () => ({ Authorization: 'Bearer tok' })),
}));

beforeEach(() => { global.fetch = jest.fn(); });

describe('bulkCreateStudents', () => {
  it('posts the payload with the auth header', async () => {
    const payload = { students: ['Cam'], grade: 'Grade 5', schoolId: 'sch1', school: 'TSRA' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ created: [], errors: [], total: 0 }) });
    await bulkCreateStudents(payload);
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/students/bulk-create`, {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('throws the server-provided error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'School name is required' }) });
    await expect(bulkCreateStudents({ students: [], grade: '', schoolId: '', school: '' })).rejects.toThrow('School name is required');
  });
});

describe('importSpreadsheet', () => {
  it('posts the reviewed rows for the chosen school with the auth header', async () => {
    const payload = { schoolId: 'sch1', fileName: 'g4.xlsx', rows: [{ studentName: 'Asha' }] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ school: 'TSRA', created: 1, skipped: [], errors: [], credentials: [] }) });
    expect((await importSpreadsheet(payload)).created).toBe(1);
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/students/bulk-import`, {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('throws the server message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'At most 500 rows per import' }) });
    await expect(importSpreadsheet({ schoolId: 's', fileName: 'f', rows: [] })).rejects.toThrow('At most 500 rows per import');
  });
});
