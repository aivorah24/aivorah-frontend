import SERVER_URL from '../../../../config/serverUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import LEADERBOARD_SERVICE_URL from '../../../../config/leaderboardServiceUrl';
import SCHEDULE_SERVER_URL from '../../../../config/scheduleServerUrl';
import { authHeader } from '../../../../services/authHeader';
import { isCbseCurriculum, isSyllabusOnlyCurriculum } from '../../../../utils/curriculum';
import { fetchPublishedSyllabus, getCuratedSyllabus } from '../../learning-paths/subject-syllabus/api';
import type { SubjectSyllabusData } from '../../utils/learningPathProgress';

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
  // ICSE + Cambridge (every grade) have no textbook: their syllabus outline
  // is served by the learning-paths service (same as the Learning Path screen).
  const isSyllabusOnly = isSyllabusOnlyCurriculum(curriculum);
  // CBSE (NCERT-book) chapter names come from the verified seed data in the same service;
  // the monolith still serves its own old copy of the titles.
  const isCbse = isCbseCurriculum(curriculum);
  const path = `/curriculum/subjects?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(curriculum)}`;
  if (isCbse) {
    try {
      const res = await fetch(`${LEARNING_PATHS_SERVER_URL}${path}`);
      if (res.ok) return await res.json();
    } catch { /* fall back to the monolith below */ }
  }
  const base = (isIBDP || isIBMYP || isSyllabusOnly) ? LEARNING_PATHS_SERVER_URL : SERVER_URL;
  const res = await fetch(`${base}${path}`);
  return res.json();
}

export async function fetchUpcomingDeadlines(studentId: string) {
  const res = await fetch(`${SCHEDULE_SERVER_URL}/schedule/upcoming?studentId=${studentId}&hideCompleted=true`, { headers: await authHeader() });
  return res.json();
}

export async function fetchPerformance(studentId: string, email: string) {
  const res = await fetch(`${LEADERBOARD_SERVICE_URL}/student/${studentId}/performance?email=${encodeURIComponent(email)}`);
  return res.json();
}

// Subject + chapter list from the SAME call the Learning Paths screen makes
// (learning-paths/hooks/useSubjects.ts) — so the dashboard's chapter total
// and subject chips always match what the student sees there.
export async function fetchLearningPathSubjects(curriculum: string, grade: string) {
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/curriculum/subjects?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(curriculum)}`);
  if (!res.ok) throw new Error('fetchLearningPathSubjects failed');
  return res.json();
}

// One subject's chapters WITH their topics — the same source and fallback
// the Learning Paths syllabus screen uses (subject-syllabus/hooks/
// useSyllabusChapters.ts): published/Qdrant syllabus first, the curated
// static syllabus only when the server has none. Topic names here are the
// exact names quizzes, completeLesson and startTopicActivity record progress
// under, which is what lets the dashboard attribute progress to chapters.
export async function fetchSubjectSyllabus(curriculum: string, grade: string, subject: string): Promise<SubjectSyllabusData> {
  let units: SubjectSyllabusData['units'] = [];
  try {
    units = (await fetchPublishedSyllabus(curriculum, grade, subject)) as unknown as SubjectSyllabusData['units'];
  } catch { /* fall back to curated below */ }
  if (units.length > 0) return { subject, units, isDbBacked: true };
  const curated = getCuratedSyllabus(curriculum, grade, subject) ?? [];
  return { subject, units: curated, isDbBacked: false };
}

export async function fetchWeeklyActivity(studentId: string) {
  const res = await fetch(`${LEADERBOARD_SERVICE_URL}/student/${studentId}/weekly?period=week`);
  if (!res.ok) throw new Error('fetchWeeklyActivity failed');
  return res.json();
}
