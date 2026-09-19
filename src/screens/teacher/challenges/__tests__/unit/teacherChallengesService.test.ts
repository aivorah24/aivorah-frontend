import * as svc from '../../services/teacherChallengesService';
import CHALLENGES_SERVER_URL from '../../../../../config/challengesServerUrl';
import STUDENTS_SERVER_URL from '../../../../../config/studentsServerUrl';
import PROFILE_SERVER_URL from '../../../../../config/profileServerUrl';
import TEACHER_DASHBOARD_SERVER_URL from '../../../../../config/teacherDashboardServerUrl';
import LEADERBOARD_SERVICE_URL from '../../../../../config/leaderboardServiceUrl';

describe('teacherChallengesService', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  describe('fetchStudentsByTeacher', () => {
    it('fetches students from aivorah-teacher-dashboard-service, not the stale monolith route', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce([{ id: 's1', name: 'A', grade: 'Grade 3' }]) });
      const res = await svc.fetchStudentsByTeacher('teacher@x.com');
      expect(fetch).toHaveBeenCalledWith(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/teacher%40x.com`);
      expect(res).toEqual([{ id: 's1', name: 'A', grade: 'Grade 3' }]);
    });

    it('returns [] on non-ok response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      expect(await svc.fetchStudentsByTeacher('t@x.com')).toEqual([]);
    });

    it('returns [] when response is not an array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ error: 'x' }) });
      expect(await svc.fetchStudentsByTeacher('t@x.com')).toEqual([]);
    });
  });

  describe('fetchTeacherPreferences', () => {
    it('fetches preferences from profile-service', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ teaches: [{ grade: 'Grade 4' }] }) });
      const res = await svc.fetchTeacherPreferences('t@x.com');
      expect(fetch).toHaveBeenCalledWith(`${PROFILE_SERVER_URL}/user/preferences?email=t%40x.com`);
      expect(res).toEqual({ teaches: [{ grade: 'Grade 4' }] });
    });

    it('returns null on non-ok response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      expect(await svc.fetchTeacherPreferences('t@x.com')).toBeNull();
    });
  });

  describe('fetchChallenges', () => {
    it('fetches challenges from aivorah-challenges-service', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce([{ id: 'c1' }]) });
      const res = await svc.fetchChallenges('Grade 3', 'CBSE');
      expect(fetch).toHaveBeenCalledWith(`${CHALLENGES_SERVER_URL}/challenges?grade=Grade%203&curriculum=CBSE`);
      expect(res).toEqual([{ id: 'c1' }]);
    });

    it('returns [] on non-ok response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      expect(await svc.fetchChallenges('Grade 3', 'CBSE')).toEqual([]);
    });
  });

  describe('fetchClassLeaderboard', () => {
    it('fetches the teacher-scoped leaderboard from aivorah-leaderboard-service, not the monolith', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValueOnce([{ id: 's1', rank: 1 }]) });
      const res = await svc.fetchClassLeaderboard('teacher@x.com');
      expect(fetch).toHaveBeenCalledWith(`${LEADERBOARD_SERVICE_URL}/student/leaderboard?limit=50&teacherEmail=teacher%40x.com`);
      expect(res).toEqual([{ id: 's1', rank: 1 }]);
    });

    it('returns [] when the response is not an array', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ json: jest.fn().mockResolvedValueOnce({ error: 'x' }) });
      expect(await svc.fetchClassLeaderboard('t@x.com')).toEqual([]);
    });
  });

  describe('fetchStudentWeekly', () => {
    it('fetches weekly stats from students-service', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ days: [{ day: 'Mon', xp: 10 }] }) });
      const res = await svc.fetchStudentWeekly('s1');
      expect(fetch).toHaveBeenCalledWith(`${STUDENTS_SERVER_URL}/student/s1/weekly`);
      expect(res).toEqual({ days: [{ day: 'Mon', xp: 10 }] });
    });

    it('returns null on non-ok response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      expect(await svc.fetchStudentWeekly('s1')).toBeNull();
    });
  });

  describe('assignChallenge', () => {
    it('posts to aivorah-challenges-service with assignedByRole teacher', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({}) });
      const res = await svc.assignChallenge({ challengeId: 'c1', studentId: 's1', teacherEmail: 't@x.com', dueDate: '2026-09-10' });
      expect(fetch).toHaveBeenCalledWith(`${CHALLENGES_SERVER_URL}/challenges/assign`, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          challengeId: 'c1', studentId: 's1', assignedById: 't@x.com', assignedByRole: 'teacher', dueDate: '2026-09-10',
        }),
      }));
      expect(res).toEqual({ ok: true, alreadyAssigned: false });
    });

    // Regression: re-assigning an already-pending challenge used to look
    // identical to a fresh assign — the server now flags it explicitly.
    it('surfaces alreadyAssigned when the server reports a no-op re-assign', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValueOnce({ alreadyAssigned: true }) });
      const res = await svc.assignChallenge({ challengeId: 'c1', studentId: 's1', teacherEmail: 't@x.com', dueDate: '2026-09-10' });
      expect(res).toEqual({ ok: true, alreadyAssigned: true });
    });

    it('returns the server error message on failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockResolvedValueOnce({ error: 'Grade mismatch' }) });
      const res = await svc.assignChallenge({ challengeId: 'c1', studentId: 's1', teacherEmail: 't@x.com', dueDate: '2026-09-10' });
      expect(res).toEqual({ ok: false, error: 'Grade mismatch' });
    });

    it('falls back to a generic error message when the server sends no error body', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: jest.fn().mockRejectedValueOnce(new Error('bad json')) });
      const res = await svc.assignChallenge({ challengeId: 'c1', studentId: 's1', teacherEmail: 't@x.com', dueDate: '2026-09-10' });
      expect(res).toEqual({ ok: false, error: 'Failed to assign. Try again.' });
    });
  });
});
