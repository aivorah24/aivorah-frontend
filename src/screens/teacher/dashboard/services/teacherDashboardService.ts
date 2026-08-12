import SERVER_URL from '../../../../config/serverUrl';

// Raw API calls for the Teacher Dashboard — no state, no computation.
// Caller (useTeacherDashboardData) decides what to do with the responses.

export async function fetchTeacherStudents(teacherEmail: string) {
  const res = await fetch(`${SERVER_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}`);
  return res.json();
}

export async function fetchTeacherInsights(teacherEmail: string) {
  const res = await fetch(`${SERVER_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}/insights`);
  return res.json();
}

export async function fetchTeacherRecentActivity(teacherEmail: string) {
  const res = await fetch(`${SERVER_URL}/student/recent-activity/by-teacher/${encodeURIComponent(teacherEmail)}`);
  return res.json();
}
