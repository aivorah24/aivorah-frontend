import PLATFORM_ADMIN_SERVER_URL from '../../../../config/platformAdminServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { AdminUser, AdminUserCreate, AdminUserEdit, AdminUserFilters, AdminUsersPage, BulkResult, SchoolGrade } from '../types';

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(await authHeader()), ...(init.body ? { 'Content-Type': 'application/json' } : {}) };
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Request failed. Check your connection and try again.');
  return data as T;
}

export function fetchAdminUsers({ q, role, status, page }: AdminUserFilters): Promise<AdminUsersPage> {
  const qs = new URLSearchParams();
  if (q.trim()) qs.set('q', q.trim());
  if (role) qs.set('role', role);
  if (status) qs.set('status', status);
  qs.set('page', String(page));
  return call(`/admin/users?${qs.toString()}`);
}

export const updateAdminUser = (id: string, edit: AdminUserEdit) =>
  call<{ changed: string[] }>(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(edit) });

export const blockAdminUser = (id: string, reason: string, signOut: boolean) =>
  call(`/admin/users/${encodeURIComponent(id)}/block`, { method: 'POST', body: JSON.stringify({ reason, signOut }) });

export const unblockAdminUser = (id: string) =>
  call(`/admin/users/${encodeURIComponent(id)}/unblock`, { method: 'POST', body: JSON.stringify({}) });

export const bulkSetBlocked = (ids: string[], blocked: boolean) =>
  call<{ results: BulkResult[] }>(`/admin/users/${blocked ? 'bulk-block' : 'bulk-unblock'}`, {
    method: 'POST', body: JSON.stringify(blocked ? { ids, reason: 'Bulk action', signOut: true } : { ids }),
  });

export const sendPasswordReset = (id: string) =>
  call<{ sent: boolean }>(`/admin/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST', body: JSON.stringify({}) });

export const createAdminUser = (body: AdminUserCreate) =>
  call<{ user: AdminUser; inviteSent: boolean; inviteError?: string | null; verificationSent: boolean }>('/admin/users', { method: 'POST', body: JSON.stringify(body) });

export const fetchSchoolStructure = (schoolId: string) =>
  call<{ grades: SchoolGrade[] }>(`/schools/${encodeURIComponent(schoolId)}/structure`).then((r) => r.grades || []);
