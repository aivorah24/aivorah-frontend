import TIMETABLE_RESOURCES_SERVER_URL from '../config/timetableResourcesServerUrl';
import { authHeader } from './authHeader';

async function parseOrThrow<T>(res: Response, fallback: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || fallback);
  return data as T;
}

// JSON request to the Timetable & Resources service, signed in as the current user.
export async function trRequest<T>(path: string, init: { method?: string; body?: unknown } = {}, fallbackError = 'Request failed'): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${TIMETABLE_RESOURCES_SERVER_URL}${path}`, {
    method: init.method || 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return parseOrThrow<T>(res, fallbackError);
}

export type UploadedFile = { url: string; name: string; size: number; type: string };

// Posts one file (multipart "file") to the service, signed in as the current user.
export async function trPostFile<T>(path: string, file: Blob, fileName: string, fallbackError: string): Promise<T> {
  const form = new FormData();
  form.append('file', file, fileName);
  const res = await fetch(`${TIMETABLE_RESOURCES_SERVER_URL}${path}`, { method: 'POST', headers: await authHeader(), body: form });
  return parseOrThrow<T>(res, fallbackError);
}

// Uploads a PDF or picture (teachers and school admins).
export function trUpload(file: Blob, fileName: string): Promise<UploadedFile> {
  return trPostFile<UploadedFile>('/uploads', file, fileName, 'Upload failed');
}
