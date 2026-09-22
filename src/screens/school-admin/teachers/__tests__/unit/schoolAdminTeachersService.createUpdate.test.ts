jest.mock('../../../../../config/profileServerUrl', () => 'https://profile.test');
jest.mock('../../../../../config/schoolAdminServerUrl', () => 'https://school-admin.test');
import { schoolAdminTeachersService } from '../../services/schoolAdminTeachersService';

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; jest.clearAllMocks(); });

describe('schoolAdminTeachersService.getSchoolCurriculumBase', () => {
  test('returns the school curriculum from the overview endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ school: { curriculum: 'CBSE' } }) }) as any;
    expect(await schoolAdminTeachersService.getSchoolCurriculumBase('admin@x.com')).toBe('CBSE');
    expect(global.fetch).toHaveBeenCalledWith('https://school-admin.test/school-admin/overview?adminEmail=admin%40x.com');
  });

  test('returns null on a non-ok response instead of throwing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }) as any;
    expect(await schoolAdminTeachersService.getSchoolCurriculumBase('admin@x.com')).toBeNull();
  });
});

describe('schoolAdminTeachersService.createTeacher', () => {
  const payload = { firstName: 'E2E', lastName: 'Test', teaches: [] };

  test('POSTs to /school-admin/teachers and returns the created teacher', async () => {
    const created = { id: 't9', name: 'E2E Test', email: 'e2e.test@x.com', password: 'abc123', subjects: [], status: 'invited' };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(created) }) as any;

    const result = await schoolAdminTeachersService.createTeacher('admin@x.com', payload);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://school-admin.test/school-admin/teachers?adminEmail=admin%40x.com',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) })
    );
    expect(result).toEqual(created);
  });

  test('throws with the server error message on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Email already in use' }) }) as any;
    await expect(schoolAdminTeachersService.createTeacher('admin@x.com', payload)).rejects.toThrow('Email already in use');
  });

  test('a network-level failure gets the friendly connection message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(schoolAdminTeachersService.createTeacher('admin@x.com', payload)).rejects.toThrow('Failed to add teacher. Check your connection.');
  });
});

describe('schoolAdminTeachersService.updateTeacherTeaches', () => {
  test('PATCHes /user/profile with the email and teaches', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) }) as any;
    const teaches = [{ curriculum: 'CBSE', grade: 'Grade 3', subjects: ['Maths'] }];

    await schoolAdminTeachersService.updateTeacherTeaches('teacher@x.com', teaches);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://profile.test/user/profile',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ email: 'teacher@x.com', teaches }) })
    );
  });

  test('throws with the server error message on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Not found' }) }) as any;
    await expect(schoolAdminTeachersService.updateTeacherTeaches('teacher@x.com', [])).rejects.toThrow('Not found');
  });

  test('a network-level failure gets the friendly connection message', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(schoolAdminTeachersService.updateTeacherTeaches('teacher@x.com', [])).rejects.toThrow('Failed to save changes. Check your connection.');
  });
});
