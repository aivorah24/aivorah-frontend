// The teacher's private assignment library (aivorah-assignments-service
// /assignments/library). Signed-in requests: the server takes the teacher
// from the Firebase token, so only their own items ever come back.
import ASSIGNMENTS_SERVER_URL from '../../../../config/assignmentsServerUrl';
import { authHeader } from '../../../../services/authHeader';
import { postCreateAssignment, PostCreateAssignmentResult } from './assignmentsService';

export interface LibraryItem {
  id: string;
  title: string;
  type: string | null;
  subject: string | null;
  chapter: string | null;
  grade: string | null;
  curriculum: string | null;
  times_assigned: number;
  created_at: string;
  last_assigned_at: string;
  content?: Record<string, any>;
}

async function request<T>(path: string, init: { method?: string } = {}, fallback = 'Request failed'): Promise<T> {
  const res = await fetch(`${ASSIGNMENTS_SERVER_URL}/assignments/library${path}`, {
    method: init.method || 'GET',
    headers: await authHeader(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || fallback);
  return data as T;
}

export async function fetchMyLibrary(): Promise<LibraryItem[]> {
  const data = await request<{ items: LibraryItem[] }>('', {}, 'Could not load your library');
  return Array.isArray(data.items) ? data.items : [];
}

export async function fetchLibraryItem(id: string): Promise<LibraryItem> {
  const data = await request<{ item: LibraryItem }>(`/${encodeURIComponent(id)}`, {}, 'Could not open this library item');
  return data.item;
}

export async function removeLibraryItem(id: string): Promise<void> {
  await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' }, 'Could not remove this library item');
}

// Assign a library item again: its saved content, a new due date, and the
// whole class (studentId null) or one student.
export async function assignFromLibrary(item: LibraryItem, opts: { dueDate: string; studentId: string | null; teacherEmail: string }): Promise<PostCreateAssignmentResult> {
  let full: LibraryItem;
  try {
    full = item.content ? item : await fetchLibraryItem(item.id);
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not open this library item' };
  }
  return postCreateAssignment({
    ...(full.content || {}),
    dueDate: opts.dueDate,
    studentId: opts.studentId,
    createdById: opts.teacherEmail,
    createdByRole: 'teacher',
    libraryItemId: item.id,
  });
}
