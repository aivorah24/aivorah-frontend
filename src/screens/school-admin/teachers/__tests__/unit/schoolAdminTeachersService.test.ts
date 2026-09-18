jest.mock('../../../../../config/serverUrl', () => 'https://server.test');
jest.mock('../../../../../config/schoolAdminServerUrl', () => 'https://school-admin.test');
import { schoolAdminTeachersService } from '../../services/schoolAdminTeachersService';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; jest.clearAllMocks(); });

describe('schoolAdminTeachersService.getTeachers', () => {
  test('requests the teacher list scoped to the admin, and returns the array', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 't1', name: 'A', email: 'a@x.com', teaches: [] }]) }) as any;

    const result = await schoolAdminTeachersService.getTeachers('admin@x.com');

    expect(global.fetch).toHaveBeenCalledWith('https://school-admin.test/school-admin/teachers?adminEmail=admin%40x.com');
    expect(result).toHaveLength(1);
  });

  test('returns an empty array when the response body is not an array', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }) as any;
    expect(await schoolAdminTeachersService.getTeachers('admin@x.com')).toEqual([]);
  });

  test('throws with the server error message on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'No access' }) }) as any;
    await expect(schoolAdminTeachersService.getTeachers('admin@x.com')).rejects.toThrow('No access');
  });

  test('a network-level failure gets the friendly connection message, not the raw error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(schoolAdminTeachersService.getTeachers('admin@x.com')).rejects.toThrow('Failed to load teachers. Check your connection.');
  });
});
