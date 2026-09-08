import SERVER_URL from '../../../../config/serverUrl';
import AUTH_SERVER_URL from '../../../../config/authServerUrl';

// syncProfile hits aivorah-auth-service's /user/sync, the DB the app reads
// from on reload - the monolith's /user/profile writes to a different DB.
export async function syncProfile(patch: { email?: string; name?: string; location?: string }): Promise<void> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Failed to save');
  }
}

export async function uploadPhoto(userEmail: string, base64: string, mimeType: string): Promise<string> {
  const res = await fetch(`${SERVER_URL}/user/upload-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail, base64, mimeType }),
  });
  const data = await res.json();
  const url = data.photoUrl || data.url;
  if (!url) throw new Error(data.error || 'Could not upload photo.');
  return url;
}

export async function isEmailTaken(email: string): Promise<boolean> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/role?email=${encodeURIComponent(email)}`);
  return res.ok;
}

// email-otp/change-email/delete-account already live on aivorah-auth-service
// (ported from the monolith 2026-08-27, routes/account.js) - not a new repoint.
export async function sendEmailOtp(email: string, name?: string): Promise<void> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/email-otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Could not send the verification code.');
}

export async function changeEmail(currentEmail: string | undefined, newEmail: string, otp: string): Promise<void> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/change-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentEmail, newEmail, otp }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Could not update your email.');
}

export async function changeEmailGoogle(currentEmail: string, idToken: string): Promise<{ newEmail?: string }> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/change-email-google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentEmail, idToken }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || 'Could not switch your Google account.');
  return d;
}

export async function deleteAccount(email: string): Promise<void> {
  await fetch(`${AUTH_SERVER_URL}/user/delete-account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}
