import { auth } from '../../../../config/firebase';
import LEARNING_PATHS_SERVER_URL from '../../../../config/learningPathsServerUrl';
import type { AssessResult, LexileInfo, Passage, PassageSummary, SpeechAudio, TranscribeResult, WordStatus } from '../types';

// Read Aloud lives in aivorah-learning-paths-service; it knows the student from the sign-in token.
async function authHeader(): Promise<Record<string, string>> {
  await auth.authStateReady?.();
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${idToken}` };
}

async function request<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}, fallback = 'Request failed'): Promise<T> {
  const headers = await authHeader();
  let body: BodyInit | undefined;
  if (init.form) body = init.form;
  else if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body);
  }
  const res = await fetch(`${LEARNING_PATHS_SERVER_URL}/read-aloud${path}`, { method: init.method || 'GET', headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || fallback);
  return data as T;
}

const query = (params: Record<string, string | number | null | undefined>) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString();

export function fetchLexile(): Promise<LexileInfo> {
  return request('/lexile', {}, 'Could not load your reading level');
}

export function saveLexile(lexile: number, source: string): Promise<{ lexile: number }> {
  return request('/lexile', { method: 'POST', body: { lexile, source } }, 'Could not save your reading level');
}

export async function fetchPassageList(grade: string, lexile: number | null): Promise<PassageSummary[]> {
  const data = await request<{ passages?: PassageSummary[] }>(`/passages?${query({ grade, lexile })}`, {}, 'Could not load stories');
  return data.passages || [];
}

export async function fetchPassage(grade: string, title?: string): Promise<Passage> {
  const data = await request<Partial<Passage>>('/passage', { method: 'POST', body: title ? { grade, topic: title } : { grade } }, 'Could not load passage');
  if (!data.text) throw new Error('Could not load passage');
  return data as Passage;
}

export function fetchCalibrationPassage(grade: string): Promise<{ title: string; text: string }> {
  return request(`/calibration?${query({ grade })}`, {}, 'Could not load the reading check');
}

export function fetchSpeech(text: string): Promise<SpeechAudio> {
  return request('/tts', { method: 'POST', body: { text } }, 'Narration unavailable');
}

function audioForm(blob: Blob, name: string, passage: string): FormData {
  const type = blob.type || 'audio/webm';
  const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'mp4' : 'webm';
  const form = new FormData();
  form.append('audio', new File([blob], `${name}.${ext}`, { type }));
  form.append('passage', passage);
  return form;
}

export function transcribeRecording(blob: Blob, passage: string): Promise<TranscribeResult> {
  return request('/transcribe', { method: 'POST', form: audioForm(blob, 'recording', passage) }, 'Could not check your recording');
}

export function transcribeLive(blob: Blob, passage: string): Promise<TranscribeResult> {
  return request('/transcribe-live', { method: 'POST', form: audioForm(blob, 'live', passage) }, 'Live check failed');
}

export function assessReading(body: { passage: string; wordStatuses: WordStatus[]; duration: number; grade: string; topic: string }): Promise<AssessResult> {
  return request('/assess', { method: 'POST', body }, 'Could not score your reading');
}
