jest.mock('../../../../../config/schoolAdminServerUrl', () => 'https://server.test');
import { schoolAdminClassesService } from '../schoolAdminClassesService';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; jest.clearAllMocks(); });

describe('schoolAdminClassesService.getClasses', () => {
  test('requests the classes list scoped to the admin, and returns the array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ classes: [{ grade: 'Grade 1', section: 'A', studentCount: 3, classTeacherEmail: null, classTeacherName: null }] }),
    }) as any;

    const result = await schoolAdminClassesService.getClasses('admin@x.com');

    expect(global.fetch).toHaveBeenCalledWith('https://server.test/school-admin/classes?adminEmail=admin%40x.com');
    expect(result).toHaveLength(1);
  });

  test('returns an empty array when the response has no classes field, rather than throwing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }) as any;
    expect(await schoolAdminClassesService.getClasses('admin@x.com')).toEqual([]);
  });

  test('throws with the server error message on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'No access' }) }) as any;
    await expect(schoolAdminClassesService.getClasses('admin@x.com')).rejects.toThrow('No access');
  });

  test('throws a generic message when the error body is unparsable', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.reject(new Error('bad json')) }) as any;
    await expect(schoolAdminClassesService.getClasses('admin@x.com')).rejects.toThrow('Failed to load classes');
  });

  test('a network-level failure (fetch rejecting) gets the friendly connection message, not the raw error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as any;
    await expect(schoolAdminClassesService.getClasses('admin@x.com')).rejects.toThrow('Failed to load classes. Check your connection.');
  });
});

describe('schoolAdminClassesService.getTeachers', () => {
  test('requests the teacher list scoped to the admin, and returns the array', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: 't1', name: 'A', email: 'a@x.com', teaches: [] }]) }) as any;

    const result = await schoolAdminClassesService.getTeachers('admin@x.com');

    expect(global.fetch).toHaveBeenCalledWith('https://server.test/school-admin/teachers?adminEmail=admin%40x.com');
    expect(result).toHaveLength(1);
  });

  test('returns an empty array when the response body is not an array', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }) as any;
    expect(await schoolAdminClassesService.getTeachers('admin@x.com')).toEqual([]);
  });

  test('throws on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Server error' }) }) as any;
    await expect(schoolAdminClassesService.getTeachers('admin@x.com')).rejects.toThrow('Server error');
  });
});

describe('schoolAdminClassesService.assignClassTeacher', () => {
  test('PATCHes the grade/section endpoint with the teacher email', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }) as any;

    await schoolAdminClassesService.assignClassTeacher('Grade 6', 'A', 'admin@x.com', 'teacher@x.com');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://server.test/school-admin/grades/Grade%206/sections/A/class-teacher?adminEmail=admin%40x.com',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherEmail: 'teacher@x.com' }),
      })
    );
  });

  test('sends teacherEmail: null to unassign', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }) as any;

    await schoolAdminClassesService.assignClassTeacher('Grade 6', 'A', 'admin@x.com', null);

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ teacherEmail: null });
  });

  test('throws with the server error message on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Teacher not found' }) }) as any;
    await expect(schoolAdminClassesService.assignClassTeacher('Grade 6', 'A', 'admin@x.com', 'x@x.com')).rejects.toThrow('Teacher not found');
  });

  test('a network-level failure gets the friendly connection message, not the raw error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as any;
    await expect(schoolAdminClassesService.assignClassTeacher('Grade 6', 'A', 'admin@x.com', 'x@x.com'))
      .rejects.toThrow('Failed to assign class teacher. Check your connection.');
  });
});
