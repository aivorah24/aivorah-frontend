import { fetchStudentsByTeacher } from '../studentsService';

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
