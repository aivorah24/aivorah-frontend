import { auth } from '../../../../config/firebase';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import type { SubjectEdits } from '../../../student/learning-paths/subject-syllabus/subjectEdits';

export type SubjectScope = { curriculum: string; grade: string; subject: string };
export type EditsStatus = { status: 'none' | 'draft' | 'published'; updatedAt: string | null; publishedAt: string | null; hasUnpublishedChanges: boolean };
export type SubjectEditsSummary = SubjectScope & EditsStatus;

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

const BASE = `${LEARNING_PATHS_SERVER_URL}/teacher-subject-edits`;

export async function listSubjectEdits(): Promise<{ subjects: SubjectEditsSummary[] }> {
  return parseOrThrow(await fetch(BASE, { headers: await authHeaders() }));
}

export async function getSubjectEdits(scope: SubjectScope): Promise<{ edits: SubjectEdits } & EditsStatus> {
  return parseOrThrow(await fetch(`${BASE}/subject?${new URLSearchParams(scope).toString()}`, { headers: await authHeaders() }));
}

export async function saveSubjectEdits(scope: SubjectScope, edits: SubjectEdits): Promise<{ edits: SubjectEdits } & EditsStatus> {
  return parseOrThrow(await fetch(`${BASE}/subject`, {
    method: 'PUT',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...scope, edits }),
  }));
}

export async function publishSubjectEdits(scope: SubjectScope): Promise<{ edits: SubjectEdits } & EditsStatus> {
  return parseOrThrow(await fetch(`${BASE}/subject/publish`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(scope),
  }));
}

export async function uploadLessonImage(file: { blob: Blob; name: string }): Promise<{ url: string; width?: number; height?: number }> {
  const form = new FormData();
  form.append('image', file.blob, file.name);
  return parseOrThrow(await fetch(`${BASE}/images`, { method: 'POST', headers: await authHeaders(), body: form }));
}

export async function uploadLessonBook(file: { blob: Blob; name: string }): Promise<{ url: string; fileName: string }> {
  const form = new FormData();
  form.append('book', file.blob, file.name);
  return parseOrThrow(await fetch(`${BASE}/books`, { method: 'POST', headers: await authHeaders(), body: form }));
}
