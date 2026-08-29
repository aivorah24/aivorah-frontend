import TEACHER_DASHBOARD_SERVER_URL from '../../../../config/teacherDashboardServerUrl';
import type { HeatmapData, RosterStudent, SubjectSummary, TopicAttempt } from '../types';

// Real backend, extracted 2026-08-29 from the ai-mentor monolith's
// routes/student.js into aivorah-teacher-dashboard-service alongside its
// three siblings (fetchTeacherStudents/Insights/RecentActivity in
// ../../dashboard/services/teacherDashboardService.ts) — same service,
// same bounded context (teacher's oversight view of student learning), see
// the Student Progress Service Boundary ADR for the reasoning. Previously
// this screen had NO real backend call at all — see BUGS_AND_FIXES.md /
// the Teacher Student Progress work-order for the "dummy load logic" finding.
export async function fetchStudentProgressHeatmap(
  teacherEmail: string,
  filters: { subject?: string; grade?: string } = {}
): Promise<HeatmapData> {
  const params = new URLSearchParams();
  if (filters.subject) params.set('subject', filters.subject);
  if (filters.grade) params.set('grade', filters.grade);
  const qs = params.toString();
  const url = `${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}/heatmap${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load student progress.');
  return res.json();
}

// Section B — "Where the class stands, by subject" summary cards. Real
// per-subject averages (see routes/student.js's new /subject-summary route)
// — the original monolith mockup had these as literal hardcoded strings
// ("47%", "Avg attempt: 15m"), never backed by any real computation.
export async function fetchSubjectSummary(teacherEmail: string): Promise<SubjectSummary> {
  const res = await fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}/subject-summary`);
  if (!res.ok) throw new Error('Could not load subject summary.');
  return res.json();
}

// Section D — Activity & Performance table. Reuses the SAME roster endpoint
// Teacher Dashboard's overview cards already call (fetchTeacherStudents in
// ../../dashboard/services/teacherDashboardService.ts) — same underlying
// data, this screen just renders more of the fields that route already
// returns (studyTime/learningPathTime/assignmentTime/challengeTime/
// progressPct/lastActive), plus the quizAttempts/quizBestScore fields added
// alongside this work. Deliberately NOT calling the dashboard screen's own
// service file (screen-owns-its-service convention) even though it's the
// same URL.
export async function fetchStudentRoster(teacherEmail: string): Promise<RosterStudent[]> {
  const res = await fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/${encodeURIComponent(teacherEmail)}`);
  if (!res.ok) throw new Error('Could not load student roster.');
  return res.json();
}

// Section E — drill-down drawer. Real per-attempt history for one
// student+topic (see routes/student.js's new /:studentId/topic/:topic/attempts
// route) — the original monolith mockup had exactly one hardcoded fake row.
export async function fetchTopicAttempts(studentId: string, topic: string): Promise<{ attempts: TopicAttempt[] }> {
  const res = await fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/${encodeURIComponent(studentId)}/topic/${encodeURIComponent(topic)}/attempts`);
  if (!res.ok) throw new Error('Could not load attempt history.');
  return res.json();
}
