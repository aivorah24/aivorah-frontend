jest.mock('../../../../../config/serverUrl', () => 'https://server.test');
jest.mock('../../../../../config/schoolAdminServerUrl', () => 'https://school-admin.test');
import { schoolAdminParentsService, CreateParentError } from '../../services/schoolAdminParentsService';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; jest.clearAllMocks(); });

describe('schoolAdminParentsService.getParents', () => {
  test('requests the parent list scoped to the admin, and returns the array', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 'p1', name: 'A', email: 'a@x.com', linkedStudents: [] }]) }) as any;
    const result = await schoolAdminParentsService.getParents('admin@x.com');
    expect(global.fetch).toHaveBeenCalledWith('https://school-admin.test/school-admin/parents?adminEmail=admin%40x.com');
    expect(result).toHaveLength(1);
  });

  test('returns an empty array when the response body is not an array', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }) as any;
    expect(await schoolAdminParentsService.getParents('admin@x.com')).toEqual([]);
  });

  test('throws with the server error message on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'No access' }) }) as any;
    await expect(schoolAdminParentsService.getParents('admin@x.com')).rejects.toThrow('No access');
  });

  test('a network-level failure gets the friendly connection message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(schoolAdminParentsService.getParents('admin@x.com')).rejects.toThrow('Failed to load parents. Check your connection.');
  });
});

describe('schoolAdminParentsService.createParent', () => {
  const payload = { firstName: 'E2E', lastName: 'Test' };

  test('POSTs to /school-admin/parents and returns the created parent', async () => {
    const created = { id: 'p9', name: 'E2E Test', email: 'e2e@x.com', password: 'abc123', status: 'invited' };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(created) }) as any;
    const result = await schoolAdminParentsService.createParent('admin@x.com', payload);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://school-admin.test/school-admin/parents?adminEmail=admin%40x.com',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) })
    );
    expect(result).toEqual(created);
  });

  test('throws a CreateParentError carrying the unresolved child rows on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, json: () => Promise.resolve({ error: 'Could not match a child', unresolved: [{ index: 0, reason: 'No student found' }] }),
    }) as any;
    await expect(schoolAdminParentsService.createParent('admin@x.com', payload)).rejects.toThrow(CreateParentError);
    try {
      await schoolAdminParentsService.createParent('admin@x.com', payload);
    } catch (e: any) {
      expect(e.unresolved).toEqual([{ index: 0, reason: 'No student found' }]);
    }
  });

  test('a network-level failure gets the friendly connection message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(schoolAdminParentsService.createParent('admin@x.com', payload)).rejects.toThrow('Failed to add parent. Check your connection.');
  });
});

describe('schoolAdminParentsService.getGradeSectionOptions', () => {
  test('flattens grades/sections into sectionsByGrade + allSections, and reads the curriculum base', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ grades: [{ name: 'Grade 3', sections: [{ name: 'A' }, { name: 'B', archived: true }] }] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ school: { curriculum: 'CBSE' } }) }) as any;

    const result = await schoolAdminParentsService.getGradeSectionOptions('admin@x.com');

    expect(result).toEqual({ sectionsByGrade: { 'Grade 3': ['A'] }, allSections: ['A'], schoolCurriculumBase: 'CBSE' });
  });
});
