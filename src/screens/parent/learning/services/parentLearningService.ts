import SERVER_URL from '../../../../config/serverUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import LEADERBOARD_SERVICE_URL from '../../../../config/leaderboardServiceUrl';
import { fetchSubjectSyllabus } from '../../../student/dashboard/services/dashboardService';
import type { Child, ChildReport, TopicAttempt } from '../types';

// Routed to aivorah-students-service (2026-09-04) - that service already
// owns parent_children/student_stats for other refactored screens (Daily
// Tasks, Parental Controls' child list); duplicating the same data behind a
// second, independent service would violate single-ownership. Response
// shape (id/name/email/grade/curriculum/school) is unchanged from the
// monolith's own /parent/:email/children.
export async function fetchChildren(parentEmail: string): Promise<Child[]> {
  const res = await fetch(`${STUDENTS_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Routed to aivorah-students-service - same student_stats table the
// children-list call above already reads. Response shape
// (completedTopics/topicsExplored) is unchanged.
export async function fetchStudentStats(childId: string): Promise<{ completedTopics: string[]; topicsExplored: number }> {
  const data = await fetch(`${STUDENTS_SERVER_URL}/student/${childId}`).then(r => r.json()).catch(() => ({}));
  if (!data || data.error) return { completedTopics: [], topicsExplored: 0 };
  return { completedTopics: data.completedTopics ?? [], topicsExplored: data.topicsExplored ?? 0 };
}

// Stays on the monolith - no dedicated analytics service exists yet, and
// this is the only consumer; extracting a service for a single endpoint
// would be premature (see docs/SERVICE_MAP.md decision notes).
export async function fetchChildReport(childEmail: string): Promise<ChildReport | null> {
  try {
    const data = await fetch(`${SERVER_URL}/analytics/child-report?childEmail=${encodeURIComponent(childEmail)}`).then(r => r.json());
    return data && !data.error ? data : null;
  } catch {
    return null;
  }
}

// Routed to aivorah-learning-paths-service (2026-09-04) - its own stated
// purpose is curriculum/syllabus content, an exact domain match. Confirmed
// via a live check that it serves real NCERT content too (its "IB_COLLECTION"
// Qdrant collection is shared across multiple curricula despite the name,
// not IB-only). One real response-shape difference from the monolith's own
// /curriculum/subjects: chapterCount/chapters are not included here (only
// topicCount/topics/units), so SubjectCard's "N chapters" label falls back
// to its "N topics" label for this endpoint - subjects/topics themselves are
// unaffected.
export async function fetchCurriculumSubjects(grade: string, curriculum: string): Promise<any[]> {
  const data = await fetch(
    `${LEARNING_PATHS_SERVER_URL}/curriculum/subjects?grade=${encodeURIComponent(grade)}&curriculum=${encodeURIComponent(curriculum)}`,
  ).then(r => r.json()).catch(() => ({ subjects: [] }));
  return data.subjects ?? [];
}

// Topic names per subject from the Learning Paths syllabus (same source as the student screens).
export async function fetchSubjectTopics(curriculum: string, grade: string, subject: string): Promise<{ topic: string; unit: string }[]> {
  const syl = await fetchSubjectSyllabus(curriculum, grade, subject);
  return syl.units.flatMap(u => (u.topics ?? []).filter(t => t?.name).map(t => ({ topic: t.name, unit: u.title })));
}

// Every practice attempt for one subject, newest first, with per-question answers.
export async function fetchTopicAttempts(childId: string, subject: string): Promise<TopicAttempt[]> {
  const res = await fetch(`${LEADERBOARD_SERVICE_URL}/student/${encodeURIComponent(childId)}/attempts?subject=${encodeURIComponent(subject)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.attempts) ? data.attempts : [];
}
