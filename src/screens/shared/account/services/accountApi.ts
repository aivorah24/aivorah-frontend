import AUTH_SERVER_URL from '../../../../config/authServerUrl';

// All account-identity calls go to aivorah-auth-service — the same database
// login reads. (The monolith uses a different one; see PR #86.)

async function postJson<T>(path: string, body: unknown, fallbackError: string): Promise<T> {
  const res = await fetch(`${AUTH_SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || fallbackError);
  return data as T;
}

export async function isEmailTaken(email: string): Promise<boolean> {
  const res = await fetch(`${AUTH_SERVER_URL}/user/role?email=${encodeURIComponent(email)}`);
  return res.ok;
}

export async function sendEmailOtp(email: string, name?: string): Promise<void> {
  await postJson('/user/email-otp/send', { email, name }, 'Could not send the verification code.');
}

export async function changeEmail(currentEmail: string, newEmail: string, otp: string): Promise<void> {
  await postJson('/user/change-email', { currentEmail, newEmail, otp }, 'Could not update your email.');
}

export async function changeEmailGoogle(currentEmail: string, idToken: string): Promise<{ newEmail?: string }> {
  return postJson('/user/change-email-google', { currentEmail, idToken }, 'Could not switch your Google account.');
}
