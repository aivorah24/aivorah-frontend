import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';

// Raw API calls for the Profile feature — no state, no React.

export interface ProfileFieldsPatch {
  email?: string;
  name: string;
  grade?: string;
  curriculum?: string;
  location?: string;
  school?: string;
}

export async function saveProfileFields(patch: ProfileFieldsPatch) {
  return fetch(`${PROFILE_SERVER_URL}/user/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function savePreferences(patch: Record<string, any>) {
  return fetch(`${PROFILE_SERVER_URL}/user/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function uploadProfilePhoto(userEmail: string | undefined, base64: string, mimeType: string) {
  const res = await fetch(`${PROFILE_SERVER_URL}/user/upload-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail, base64, mimeType }),
  });
  return res.json();
}
