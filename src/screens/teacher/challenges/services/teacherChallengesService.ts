import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import CHALLENGES_SERVER_URL from '../../../../config/challengesServerUrl';
import TEACHER_DASHBOARD_SERVER_URL from '../../../../config/teacherDashboardServerUrl';
import LEADERBOARD_SERVICE_URL from '../../../../config/leaderboardServiceUrl';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  grade: string;
  curriculum: string;
  subject: string;
  chapterId: number;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  xpReward: number;
  questionCount: number;
  timeLimitMinutes: number;
  type: string;
  category: string;
}

export interface StudentItem { id: string; name: string; grade: string; }

export type LeaderEntry = {
  rank: number; id: string; name: string; grade: string;
  score: number; level: number; streak: number; topics: number;
};

// GET /student/by-teacher/:email (class roster) was extracted to
// aivorah-teacher-dashboard-service on 2026-08-24 (see Teacher Students
// screen, migrated 2026-08-26) — this call was left pointed at the stale
// monolith route, which is why the roster (and thus student names /
// specific-student assignment) went missing here.
export function fetchStudentsByTeacher(teacherEmail: string): Promise<StudentItem[]> {
  return fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
    .then(r => r.ok ? r.json() : [])
    .then(data => Array.isArray(data) ? data : []);
}

export function fetchTeacherPreferences(email: string): Promise<any> {
  return fetch(`${PROFILE_SERVER_URL}/user/preferences?email=${encodeURIComponent(email)}`)
    .then(r => r.ok ? r.json() : null);
}

export function fetchChallenges(grade: string, curriculum: string): Promise<Challenge[]> {
  return fetch(`${CHALLENGES_SERVER_URL}/challenges?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(curriculum)}`)
    .then(r => r.ok ? r.json() : [])
    .then(data => Array.isArray(data) ? data : []);
}

// GET /student/leaderboard?teacherEmail=... — aivorah-leaderboard-service
// already implements this exact teacher-scoped query (roster via users/
// user_preferences.teaches + XP via student_stats, same response shape:
// rank/id/name/grade/score/level/streak/topics) and it's already used by the
// student-facing Leaderboard screen (see useLeaderboard.ts). This call was
// left pointed at the monolith instead — confirmed 2026-09-11 by reading
// aivorah-leaderboard-service/services/leaderboard.js directly.
export function fetchClassLeaderboard(teacherEmail: string): Promise<LeaderEntry[]> {
  return fetch(`${LEADERBOARD_SERVICE_URL}/student/leaderboard?limit=50&teacherEmail=${encodeURIComponent(teacherEmail)}`)
    .then(r => r.json())
    .then(data => Array.isArray(data) ? data : []);
}

export function fetchStudentWeekly(studentId: string): Promise<{ days: { day: string; xp: number }[] } | null> {
  return fetch(`${STUDENTS_SERVER_URL}/student/${studentId}/weekly`)
    .then(r => r.ok ? r.json() : null);
}

export interface TeacherAssignment { challengeId: string; studentId: string; status: string; dueDate: string | null; }

export function fetchTeacherAssignments(teacherEmail: string): Promise<TeacherAssignment[]> {
  return fetch(`${CHALLENGES_SERVER_URL}/challenges/assigned-by?assignedById=${encodeURIComponent(teacherEmail)}`)
    .then(r => r.ok ? r.json() : [])
    .then(data => Array.isArray(data) ? data : [])
    .catch(() => []);
}

export async function assignChallenge({
  challengeId,
  studentId,
  teacherEmail,
  dueDate,
}: {
  challengeId: string;
  studentId: string;
  teacherEmail: string;
  dueDate: string;
}): Promise<{ ok: true; alreadyAssigned?: boolean } | { ok: false; error: string }> {
  const res = await fetch(`${CHALLENGES_SERVER_URL}/challenges/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      challengeId,
      studentId,
      assignedById: teacherEmail,
      assignedByRole: 'teacher',
      dueDate,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { ok: false, error: err.error ?? 'Failed to assign. Try again.' };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: true, alreadyAssigned: !!data.alreadyAssigned };
}
