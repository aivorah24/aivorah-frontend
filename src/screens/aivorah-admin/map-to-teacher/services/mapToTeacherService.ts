import PLATFORM_ADMIN_SERVER_URL from '../../../../config/platformAdminServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { AdminSchool, AdminStudent, AdminTeacher, AssignTeacherPayload } from '../types';

export async function fetchAdminStudents(opts: { unassigned?: boolean } = {}): Promise<AdminStudent[]> {
  const headers = await authHeader();
  const qs = opts.unassigned ? '?unassigned=true' : '';
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/students${qs}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to load students');
  return Array.isArray((data as any)?.students) ? (data as any).students : [];
}

export async function fetchAdminTeachers(): Promise<AdminTeacher[]> {
  const headers = await authHeader();
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/teachers`, { headers });
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to load teachers');
  return Array.isArray(data) ? (data as AdminTeacher[]) : [];
}

export async function fetchAdminSchools(): Promise<AdminSchool[]> {
  const headers = await authHeader();
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/schools`, { headers });
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to load schools');
  return Array.isArray(data) ? (data as AdminSchool[]) : [];
}

export async function assignStudentsToTeacher(payload: AssignTeacherPayload): Promise<void> {
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/students/assign-teacher`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to assign students');
}
