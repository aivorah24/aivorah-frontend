import { auth } from '../../../../config/firebase';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import { TeacherCurriculum, CurriculumProgress, TeacherLearningPath, LearningPathContent, MyLearningPathSummary } from '../types';

async function authHeaders(): Promise<Record<string, string>> {
  // After a page refresh Firebase restores the sign-in a moment later; asking before that read as "not signed in".
  await auth.authStateReady?.();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${idToken}` };
}

async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export interface CurriculumUploadConfig {
  grade?: string;
  subject?: string;
  curriculum?: string;
}

export async function uploadCurriculum(
  file: { name: string; mime: string; blob: Blob },
  config?: CurriculumUploadConfig
): Promise<{ curriculum: TeacherCurriculum; jobId: string }> {
  const headers = await authHeaders();
  const formData = new FormData();
  // Field name must stay 'file' — the backend's multer config
  // (upload.single('file')) only reads this exact field name.
  formData.append('file', file.blob, file.name);
  // grade/subject/curriculum aren't consumed by the backend yet (it derives
  // this metadata from the document's own text during extraction instead) —
  // sent here so the pre-upload selector's choice travels with the request
  // once a future backend change wires it in; harmless extra form fields
  // until then, not a change to the existing upload contract.
  if (config?.grade) formData.append('grade', config.grade);
  if (config?.subject) formData.append('subject', config.subject);
  if (config?.curriculum) formData.append('curriculum', config.curriculum);
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/upload`, {
    method: 'POST', headers, body: formData,
  });
  return parseOrThrow(res);
}

export async function getCurriculum(curriculumId: string): Promise<{ curriculum: TeacherCurriculum; progress: CurriculumProgress | null }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/${curriculumId}`, { headers });
  return parseOrThrow(res);
}

export async function listCurricula(limit = 1): Promise<{ curricula: TeacherCurriculum[] }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum?limit=${limit}`, { headers });
  return parseOrThrow(res);
}

export async function retryCurriculum(curriculumId: string): Promise<{ curriculum: TeacherCurriculum; jobId: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/${curriculumId}/retry`, {
    method: 'POST', headers,
  });
  return parseOrThrow(res);
}

// Unused by the client: the backend auto-starts generation after extraction.
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

export interface BookSectionOption {
  grade: number;
  pdfFile: string;
  bookPath: string | null;
  bookTitle: string | null;
  chapterTitle: string | null;
  title: string;
  page: number;
}

// The book sections (up to 2) chosen for one subtopic; empty = not in the book, AI explains it.
export type SubtopicSectionPick = { pdfFile: string; title: string }[];

export async function getBookSections(grade: string, subject: string): Promise<{ sections: BookSectionOption[] }> {
  const headers = await authHeaders();
  const qs = `grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}`;
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/book-sections?${qs}`, { headers });
  return parseOrThrow(res);
}

export async function rebuildTopic(
  curriculumId: string, unitOrder: number, topicOrder: number, subtopicSections: SubtopicSectionPick[]
): Promise<{ learningPath: TeacherLearningPath }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/${curriculumId}/learning-path/topics/rebuild`, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ unitOrder, topicOrder, subtopicSections }),
  });
  return parseOrThrow(res);
}

export async function listMyLearningPaths(): Promise<{ learningPaths: MyLearningPathSummary[] }> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/learning-paths`, { headers });
  return parseOrThrow(res);
}

export async function deleteLearningPath(curriculumId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/teacher-curriculum/${curriculumId}`, { method: 'DELETE', headers });
  if (!res.ok) await parseOrThrow(res);
}
