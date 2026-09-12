import { auth } from '../../../../config/firebase';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import { TeacherCurriculum, TeacherLearningPath, LearningPathContent } from '../types';

async function authHeaders(): Promise<Record<string, string>> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${idToken}` };
}

async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function uploadCurriculum(file: { name: string; mime: string; blob: Blob }): Promise<{ curriculum: TeacherCurriculum; jobId: string }> {
  const headers = await authHeaders();
  const formData = new FormData();
  formData.append('file', file.blob, file.name);
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/upload`, {
    method: 'POST', headers, body: formData,
  });
  return parseOrThrow(res);
}

export async function getCurriculum(curriculumId: string): Promise<{ curriculum: TeacherCurriculum }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/${curriculumId}`, { headers });
  return parseOrThrow(res);
}

export async function startGeneration(curriculumId: string): Promise<{ curriculum: TeacherCurriculum; jobId: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/${curriculumId}/generate`, {
    method: 'POST', headers,
  });
  return parseOrThrow(res);
}

export async function getLearningPath(curriculumId: string): Promise<{ learningPath: TeacherLearningPath }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/${curriculumId}/learning-path`, { headers });
  return parseOrThrow(res);
}

export async function saveLearningPathDraft(curriculumId: string, content: LearningPathContent): Promise<{ learningPath: TeacherLearningPath }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/${curriculumId}/learning-path`, {
    method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
  });
  return parseOrThrow(res);
}

export async function publishLearningPath(curriculumId: string): Promise<{ learningPath: TeacherLearningPath; alreadyPublished?: boolean }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/${curriculumId}/learning-path/publish`, {
    method: 'POST', headers,
  });
  return parseOrThrow(res);
}
