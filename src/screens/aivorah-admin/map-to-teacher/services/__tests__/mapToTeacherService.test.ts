import { fetchAdminStudents, fetchAdminTeachers, fetchAdminSchools, assignStudentsToTeacher } from '../mapToTeacherService';
import SERVER_URL from '../../../../../config/platformAdminServerUrl';

jest.mock('../../../../../services/authHeader', () => ({
  authHeader: jest.fn(async () => ({ Authorization: 'Bearer tok' })),
}));

beforeEach(() => { global.fetch = jest.fn(); });

describe('fetchAdminStudents', () => {
  it('fetches the plain list by default', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ students: [{ id: 's1' }] }) });
    const result = await fetchAdminStudents();
    expect(result).toEqual([{ id: 's1' }]);
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/students`, { headers: { Authorization: 'Bearer tok' } });
  });

  it('appends ?unassigned=true when requested', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ students: [] }) });
    await fetchAdminStudents({ unassigned: true });
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/students?unassigned=true`, { headers: { Authorization: 'Bearer tok' } });
  });

  it('throws on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'nope' }) });
    await expect(fetchAdminStudents()).rejects.toThrow('nope');
  });
});

describe('fetchAdminSchools', () => {
  it('returns schools with their board', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ([{ id: 'x', name: 'TSRA', curriculum: 'IB' }]) });
    expect(await fetchAdminSchools()).toEqual([{ id: 'x', name: 'TSRA', curriculum: 'IB' }]);
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/schools`, { headers: { Authorization: 'Bearer tok' } });
  });

  it('throws on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'nope' }) });
    await expect(fetchAdminSchools()).rejects.toThrow('nope');
  });
});

describe('fetchAdminTeachers', () => {
  it('returns the teacher array', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ([{ id: 't1' }]) });
    expect(await fetchAdminTeachers()).toEqual([{ id: 't1' }]);
  });
});

describe('assignStudentsToTeacher', () => {
  it('posts the payload', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, assigned: 2 }) });
    await assignStudentsToTeacher({ studentIds: ['s1', 's2'], teacherEmail: 'rao@s.test', subject: 'Maths' });
    expect(global.fetch).toHaveBeenCalledWith(`${SERVER_URL}/students/assign-teacher`, {
      method: 'POST',
      headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: ['s1', 's2'], teacherEmail: 'rao@s.test', subject: 'Maths' }),
    });
  });

  it('throws the server-provided error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Teacher not found' }) });
    await expect(assignStudentsToTeacher({ studentIds: ['s1'], teacherEmail: 'nobody@s.test' })).rejects.toThrow('Teacher not found');
  });
});
