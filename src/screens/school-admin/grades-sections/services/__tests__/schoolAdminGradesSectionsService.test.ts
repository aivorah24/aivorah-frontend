import { fetchGradesSections, addGrade } from '../schoolAdminGradesSectionsService';
import SERVER_URL from '../../../../../config/schoolAdminServerUrl';

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('fetchGradesSections', () => {
  it('returns the grades array on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ grades: [{ name: 'Grade 6' }] }) });
    const result = await fetchGradesSections('admin@test.com');
    expect(result).toEqual([{ name: 'Grade 6' }]);
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/school-admin/grades-sections?adminEmail=admin%40test.com`);
  });

  it('returns an empty array when the response has no grades field', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const result = await fetchGradesSections('admin@test.com');
    expect(result).toEqual([]);
  });

  it('throws the server-provided error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'schoolId required' }) });
    await expect(fetchGradesSections('admin@test.com')).rejects.toThrow('schoolId required');
  });

  // Exercises the `.json().catch(() => ({}))` fallback — a non-JSON or
  // empty error response body shouldn't crash the caller, it should fall
  // back to the generic message instead of throwing a JSON-parse error.
  it('falls back to a generic error message when the failure response body is not JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('Unexpected token'); } });
    await expect(fetchGradesSections('admin@test.com')).rejects.toThrow('Failed to load grades & sections');
  });
});

describe('addGrade', () => {
  it('posts the name and returns the updated grades on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, grades: [{ name: 'Grade 7' }] }) });
    const result = await addGrade('admin@test.com', 'Grade 7');
    expect(result).toEqual([{ name: 'Grade 7' }]);
    expect(global.fetch).toHaveBeenCalledWith(
      `${SERVER_URL}/school-admin/grades?adminEmail=admin%40test.com`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Grade 7' }) })
    );
  });

  it('falls back to a generic error message when the failure response body is not JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('Unexpected token'); } });
    await expect(addGrade('admin@test.com', 'Grade 7')).rejects.toThrow('Something went wrong.');
  });
});
