import { bulkCreateStudents } from '../bulkImportService';
import SERVER_URL from '../../../../../config/platformAdminServerUrl';

jest.mock('../../../../../services/authHeader', () => ({
  authHeader: jest.fn(async () => ({ Authorization: 'Bearer tok' })),
}));

beforeEach(() => { global.fetch = jest.fn(); });

describe('bulkCreateStudents', () => {
  it('posts the payload with the auth header', async () => {
    const payload = { students: ['Cam'], grade: 'Grade 5', school: 'TSRA', curriculum: 'CBSE' };
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
    await expect(bulkCreateStudents({ students: [], grade: '', school: '', curriculum: '' })).rejects.toThrow('School name is required');
  });
});
