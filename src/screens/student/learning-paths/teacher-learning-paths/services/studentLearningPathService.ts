import { auth } from '../../../../../config/firebase';
import LEARNING_PATHS_SERVER_URL from '../../../../../config/learningPathsServerUrl';
import { TeacherLearningPathSummary, StudentTeacherLearningPath } from '../types';

async function authHeaders(): Promise<Record<string, string>> {
  // After a page refresh Firebase restores the sign-in a moment later; asking before that read as "not signed in".
  await auth.authStateReady?.();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${idToken}` };
}

export class StudentLearningPathApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new StudentLearningPathApiError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}

// `filter` narrows to one subject screen's paths (e.g. Grade 6 Mathematics).
export async function listTeacherLearningPaths(filter?: { grade?: string; subject?: string }): Promise<{ learningPaths: TeacherLearningPathSummary[] }> {
  const headers = await authHeaders();
  const qs = new URLSearchParams(Object.entries(filter || {}).filter(([, v]) => !!v) as [string, string][]).toString();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/student/learning-paths${qs ? `?${qs}` : ''}`, { headers });
  return parseOrThrow(res);
}

export async function getTeacherLearningPath(curriculumId: string): Promise<{ learningPath: StudentTeacherLearningPath }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/student/learning-paths/${curriculumId}`, { headers });
  return parseOrThrow(res);
}

// Your teacher's published changes to a standard subject path (null when there are none).
export async function getSubjectEditsForStudent(scope: { curriculum: string; grade: string; subject: string }): Promise<{ edits: any | null }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/student/learning-paths/subject-edits?${new URLSearchParams(scope).toString()}`, { headers });
  return parseOrThrow(res);
}
