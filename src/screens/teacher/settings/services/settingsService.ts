// Teacher Settings backend calls — fully migrated off the monolith
// (2026-08-27). Verified each route's contract matches exactly before
// switching (payload shapes unchanged):
//   - PROFILE_SERVER_URL (aivorah-profile-service): /user/profile,
//     /user/preferences, /user/upload-photo, /user/add-role,
//     /parent/:email/children[/create-student], /branding/logo(s)
//   - AUTH_SERVER_URL (aivorah-auth-service): /user/email-otp/send+verify,
//     /user/change-email, /user/change-email-google, /user/delete-account
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
  const res = await fetch(`${PROFILE_SERVER_URL}/user/profile`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || 'Failed to save' };
  return { ok: true, ...data };
}

// ── Account identity (email-OTP, change-email, delete) ──────────────────────
// GET /user/role returns 200 with the role if an account already exists for
// that email, or 404 if it doesn't — used to pre-check a NEW email isn't
// already registered, before spending an OTP send on it.
export async function checkEmailTaken(email: string): Promise<boolean> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/role?email=${encodeURIComponent(email)}`);
  return res.ok;
}

export async function sendEmailOtp(email: string, name?: string): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/email-otp/send`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error || 'Could not send the verification code.' };
  return data;
}

export async function changeEmail(currentEmail: string, newEmail: string, otp: string): Promise<{ ok?: boolean; user?: any; error?: string; code?: string }> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/change-email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentEmail, newEmail, otp }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error, code: data.code };
  return data;
}

export async function changeEmailGoogle(currentEmail: string, idToken: string): Promise<{ ok?: boolean; user?: any; newEmail?: string; error?: string }> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/change-email-google`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentEmail, idToken }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error };
  return data;
}

export async function deleteAccount(email: string): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/delete-account`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

// ── Add a role (e.g. teacher adding a "parent" profile) ─────────────────────
export async function addRole(email: string, role: string): Promise<{ ok?: boolean; roles?: string[]; error?: string }> {
  const res = await fetch(`${PROFILE_SERVER_URL}/user/add-role`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error };
  return data;
}

// ── Parent-child account creation/linking ────────────────────────────────────
export async function createChildStudent(parentEmail: string, child: {
  name: string; email?: string; password?: string; grade: string; curriculum: string; school?: string;
}): Promise<{ success?: boolean; child?: any; error?: string }> {
  const res = await fetch(`${PROFILE_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/create-student`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(child),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error };
  return data;
}

export async function linkExistingChild(parentEmail: string, childEmail: string): Promise<{ success?: boolean; child?: any; error?: string }> {
  const res = await fetch(`${PROFILE_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childEmail }),
  });
  const data = await res.json();
  if (!res.ok) return { error: data.error };
  return data;
}
