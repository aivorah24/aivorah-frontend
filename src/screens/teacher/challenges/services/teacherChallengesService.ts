import SERVER_URL from '../../../../config/serverUrl';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import CHALLENGES_SERVER_URL from '../../../../config/challengesServerUrl';
import TEACHER_DASHBOARD_SERVER_URL from '../../../../config/teacherDashboardServerUrl';

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
//
// TODO(monolith removal blocked): GET /student/leaderboard?teacherEmail=...
// (class-scoped leaderboard) has no equivalent on aivorah-students-service or
// aivorah-challenges-service yet - confirmed 2026-09-02 by reading both
// services' routes directly (aivorah-students-service/routes/student.js
// even has a dead "GET /student/leaderboard?...&teacherEmail=xxx" doc
// comment with no route implementation below it - the endpoint was
// planned but never built). Building a real class-scoped leaderboard
// requires cross-service aggregation (student roster lives in
// aivorah-students-service, XP/completions live in
// aivorah-challenges-service) - a deliberate backend design task, not a
// quick repoint. Left on the monolith until that's built.
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

// See TODO above fetchStudentsByTeacher - same missing-endpoint gap.
export function fetchClassLeaderboard(teacherEmail: string): Promise<LeaderEntry[]> {
  return fetch(`${SERVER_URL}/student/leaderboard?limit=50&teacherEmail=${encodeURIComponent(teacherEmail)}`)
    .then(r => r.json())
    .then(data => Array.isArray(data) ? data : []);
}

export function fetchStudentWeekly(studentId: string): Promise<{ days: { day: string; xp: number }[] } | null> {
  return fetch(`${STUDENTS_SERVER_URL}/student/${studentId}/weekly`)
    .then(r => r.ok ? r.json() : null);
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
}): Promise<{ ok: true } | { ok: false; error: string }> {
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
  return { ok: true };
}
