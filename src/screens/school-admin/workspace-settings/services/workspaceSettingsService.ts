import SCHOOL_ADMIN_SERVER_URL from '../../../../config/schoolAdminServerUrl';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import type { WorkspaceSchool } from '../types';

export async function fetchWorkspaceOverview(adminEmail: string): Promise<WorkspaceSchool> {
  const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/overview?adminEmail=${encodeURIComponent(adminEmail)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to load workspace settings');
  return data.school;
}

export async function saveWorkspaceSettings(adminEmail: string, settings: WorkspaceSchool): Promise<WorkspaceSchool> {
  const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/workspace-settings?adminEmail=${encodeURIComponent(adminEmail)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: settings.name, academicYear: settings.academicYear, contactEmail: settings.contactEmail }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to save workspace settings.');
  return data.school;
}

// Branding lives on aivorah-profile-service — shared cross-cutting infra used
// by several features (worksheets, portfolios, announcements), not owned by
// this service, but no longer on the monolith either (ported 2026-08-27).
export async function fetchSchoolLogo(schoolName: string): Promise<string | null> {
  const res = await fetch(`${PROFILE_SERVER_URL}/branding/logos?school=${encodeURIComponent(schoolName)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return data?.schoolLogoUrl || null;
}

export async function uploadSchoolLogo(schoolName: string, base64: string, mimeType: string): Promise<string> {
  const res = await fetch(`${PROFILE_SERVER_URL}/branding/logo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'school', name: schoolName, base64, mimeType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.logoUrl) throw new Error(data?.error || 'Upload failed');
  return data.logoUrl;
}
