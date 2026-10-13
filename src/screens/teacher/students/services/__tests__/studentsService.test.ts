import { fetchStudentsByTeacher, inviteStudent } from '../studentsService';
import { isRealStudentEmail } from '../../utils/studentDisplay';

// fetchStudentsByTeacher previously called the monolith (SERVER_URL), whose
// /student/by-teacher/:id route requires a UUID and errors on an email.
describe('fetchStudentsByTeacher — must never call the monolith', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] }) as any;
  });

  test('calls aivorah-teacher-dashboard-service, not the ai-mentor monolith', async () => {
    await fetchStudentsByTeacher('teacher@school.com');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;

    expect(calledUrl).toContain('/student/by-teacher/teacher%40school.com');
    expect(calledUrl).not.toContain('aivorah.ai');
    expect(calledUrl).toMatch(/aivorah-teacher-dashboard-service|localhost:3016/);
  });
});

describe('inviteStudent', () => {
  test('POSTs the real-email student to the students-service invite route', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
    await inviteStudent('t@school.com', { name: 'Meera', email: 'meera@real.com', grade: 'Grade 4', curriculum: 'IB PYP' });
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/teacher\/t%40school\.com\/students\/invite$/);
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Meera', email: 'meera@real.com', grade: 'Grade 4', curriculum: 'IB PYP' });
  });
});

describe('isRealStudentEmail', () => {
  test('real inboxes yes; blank, malformed and auto-generated logins no', () => {
    expect(isRealStudentEmail('Meera@Real.com ')).toBe(true);
    expect(isRealStudentEmail('')).toBe(false);
    expect(isRealStudentEmail('meera@')).toBe(false);
    expect(isRealStudentEmail('s12@aivorah.student')).toBe(false);
  });
});
