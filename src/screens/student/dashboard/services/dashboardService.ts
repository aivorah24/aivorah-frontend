import SERVER_URL from '../../../../config/serverUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import LEADERBOARD_SERVICE_URL from '../../../../config/leaderboardServiceUrl';
import SCHEDULE_SERVER_URL from '../../../../config/scheduleServerUrl';

// Raw API calls for the Dashboard feature — no state, no caching, no parsing.
// Each function throws/rejects on failure; callers (useDashboardData) decide
// what to do about it (fallback data, silent skip, etc.).

export async function fetchCurriculum(curriculum: string, grade: string) {
  const res = await fetch(`${SERVER_URL}/curriculum?curriculum=${encodeURIComponent(curriculum)}&grade=${encodeURIComponent(grade)}`);
  if (!res.ok) throw new Error('fetchCurriculum failed');
  return res.json();
}

export async function fetchNcertChapters() {
  const res = await fetch(`${SERVER_URL}/ncert/chapters`);
  if (!res.ok) throw new Error('fetchNcertChapters failed');
  return res.json();
}

export async function fetchCurriculumSubjects(curriculum: string, grade: string) {
  // IB DP, IB MYP, and Cambridge Grade 6+ have no data on the monolith's
  // /curriculum/subjects — their content lives in Qdrant via
  // aivorah-learning-paths-service (same routing as the Learning Path
  // screen's useSubjects.ts). Every other curriculum unchanged.
  const isIBDP = /^ib.?dp$/i.test(curriculum.trim());
  const isIBMYP = /^ib.?myp$/i.test(curriculum.trim());
  const isCambridgeQdrant = /^cambridge$/i.test(curriculum.trim()) && parseInt(grade.replace(/\D/g, ''), 10) >= 6;
  // CBSE/NCERT chapter names come from the verified seed data in the same service;
  // the monolith still serves its own old copy of the titles.
  const isCbseNcert = /^(cbse|ncert)$/i.test(curriculum.trim());
  const path = `/curriculum/subjects?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(curriculum)}`;
  if (isCbseNcert) {
    try {
      const res = await fetch(`${LEARNING_PATHS_SERVER_URL}${path}`);
      if (res.ok) return await res.json();
    } catch { /* fall back to the monolith below */ }
  }
  const base = (isIBDP || isIBMYP || isCambridgeQdrant) ? LEARNING_PATHS_SERVER_URL : SERVER_URL;
  const res = await fetch(`${base}${path}`);
  return res.json();
}

export async function fetchUpcomingDeadlines(studentId: string) {
  const res = await fetch(`${SCHEDULE_SERVER_URL}/schedule/upcoming?studentId=${studentId}`);
  return res.json();
}

export async function fetchPerformance(studentId: string, email: string) {
  const res = await fetch(`${LEADERBOARD_SERVICE_URL}/student/${studentId}/performance?email=${encodeURIComponent(email)}`);
  return res.json();
}
