import TEACHER_DASHBOARD_SERVER_URL from '../../../../config/teacherDashboardServerUrl';

// Raw API calls for the Teacher Dashboard — no state, no computation.
// Caller (useTeacherDashboardData) decides what to do with the responses.
// Routed to aivorah-teacher-dashboard-service (extracted from the ai-mentor
// monolith's routes/student.js on 2026-08-24) — was the monolith before.

export async function fetchTeacherStudents(teacherEmail: string) {
  const res = await fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}`);
  return res.json();
}

export async function fetchTeacherInsights(teacherEmail: string) {
  const res = await fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}/insights`);
  return res.json();
}

export async function fetchTeacherRecentActivity(teacherEmail: string) {
  const res = await fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/recent-activity/by-teacher/${encodeURIComponent(teacherEmail)}`);
  return res.json();
}
