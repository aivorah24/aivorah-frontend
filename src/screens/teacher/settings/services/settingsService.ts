// Teacher Settings backend calls — fully migrated off the monolith
// (2026-08-27). Verified each route's contract matches exactly before
// switching (payload shapes unchanged):
//   - PROFILE_SERVER_URL (aivorah-profile-service): /user/profile,
//     /user/preferences, /user/upload-photo, /branding/logo(s)
//   - AUTH_SERVER_URL (aivorah-auth-service): /user/email-otp/send+verify,
//     /user/delete-account (email change: screens/shared/account)
import AUTH_SERVER_URL from '../../../../config/authServerUrl';
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';

export interface TeacherPreferences {
  autoGrading?: boolean;
  shareProgress?: boolean;
  teacherRole?: string;
  experience?: string;
}

export async function fetchTeacherPreferences(email: string): Promise<TeacherPreferences | null> {
  const res = await fetch(`${PROFILE_SERVER_URL}/user/preferences?email=${encodeURIComponent(email)}`);
  return res.ok ? res.json() : null;
}

export async function patchTeacherPreference(email: string, key: 'autoGrading' | 'shareProgress', value: boolean): Promise<void> {
  await fetch(`${PROFILE_SERVER_URL}/user/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, [key]: value }),
  });
}

export async function uploadProfilePhoto(email: string, base64: string, mimeType: string): Promise<{ photoUrl?: string; url?: string; error?: string }> {
  const res = await fetch(`${PROFILE_SERVER_URL}/user/upload-photo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail: email, base64, mimeType }),
  });
  return res.json();
}

export async function fetchBrandingLogos(school?: string, curriculum?: string): Promise<{ schoolLogoUrl?: string; curriculumLogoUrl?: string }> {
  const params = new URLSearchParams();
  if (school) params.set('school', school);
  if (curriculum) params.set('curriculum', curriculum);
  const res = await fetch(`${PROFILE_SERVER_URL}/branding/logos?${params.toString()}`);
  return res.json();
}

export async function uploadBrandingLogo(kind: 'school' | 'curriculum', name: string, base64: string, mimeType: string): Promise<{ logoUrl?: string; error?: string }> {
  const res = await fetch(`${PROFILE_SERVER_URL}/branding/logo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, name, base64, mimeType }),
  });
  return res.json();
}

// ── Profile fields (name / school / curriculum+grades) ─────────────────────
export async function patchProfile(fields: { email: string; name?: string; school?: string; curriculum?: string; grade?: string; teaches?: any[] }): Promise<{ ok?: boolean; error?: string }> {
  try {
    const res = await fetch(`${PROFILE_SERVER_URL}/user/profile`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || 'Failed to save' };
    return { ok: true, ...data };
  } catch {
    // Network/CORS failure — surface it instead of leaving the Save spinner running
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }
}

// ── Account identity (delete; email change lives in screens/shared/account) ──────────────────────
// GET /user/role returns 200 with the role if an account already exists for
// that email, or 404 if it doesn't — used to pre-check a NEW email isn't
// already registered, before spending an OTP send on it.
export async function deleteAccount(email: string): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/delete-account`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}
