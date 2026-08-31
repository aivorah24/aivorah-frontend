import PARENT_SERVER_URL from '../../../../config/parentServerUrl';
import SERVER_URL from '../../../../config/serverUrl';
import type { Child, ChildCredentials } from '../types';

// All network access for the My Kids screen lives here so the hooks and
// components stay transport-free (and trivially mockable in tests).

export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

async function asResult<T>(res: Response): Promise<ApiResult<T>> {
  const data = await res.json().catch(() => ({} as T));
  return { ok: res.ok, status: res.status, data };
}

const parentBase = (parentEmail: string) =>
  `${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}`;

export async function fetchChildren(parentEmail: string): Promise<Child[] | null> {
  const res = await fetch(`${parentBase(parentEmail)}/children`);
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Reserves the child's login id / password server-side before the Firebase
// user is created, so both halves agree on the same credentials.
export function initChildAuth(payload: {
  name: string;
  email?: string;
  studentId: string;
  parentEmail: string;
}) {
  return fetch(`${PARENT_SERVER_URL}/parent/children/init-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(asResult<any>);
}

// Records the freshly created Firebase child against this parent.
export function linkCreatedChild(parentEmail: string, payload: Record<string, any>) {
  return fetch(`${parentBase(parentEmail)}/children/link-created`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(asResult<any>);
}

// Links an already-existing student account by their registered email.
export function linkExistingChild(parentEmail: string, childEmail: string) {
  return fetch(`${parentBase(parentEmail)}/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childEmail }),
  }).then(asResult<any>);
}

export function updateChild(parentEmail: string, childId: string, payload: Record<string, any>) {
  return fetch(`${parentBase(parentEmail)}/children/${childId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(asResult<any>);
}

export function unlinkChild(parentEmail: string, childId: string) {
  return fetch(`${parentBase(parentEmail)}/children/${childId}`, { method: 'DELETE' })
    .then(asResult<any>);
}

// Falls back to the child's own email as the login id when the backend has no
// stored credential record (older children predate credential storage).
export async function fetchChildCredentials(
  parentEmail: string,
  child: Child,
): Promise<ChildCredentials> {
  const fallback: ChildCredentials = {
    loginId: child.email ?? null,
    studentId: null,
    initialPassword: null,
  };
  try {
    const res = await fetch(`${parentBase(parentEmail)}/children/${child.id}/credentials`);
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export function resendCredentials(parentEmail: string, childId: string) {
  return fetch(`${parentBase(parentEmail)}/children/${childId}/resend-credentials`, {
    method: 'POST',
  });
}

export function resetChildPassword(parentEmail: string, childId: string, frontendOrigin: string) {
  return fetch(`${parentBase(parentEmail)}/children/${childId}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frontendOrigin }),
  });
}

// ── Email OTP ───────────────────────────────────────────────────────────────
// Not parent-domain data — /user/email-otp belongs to the account/auth domain
// and also exists on aivorah-auth-service. Left on the monolith here so the
// refactor stays behaviour-identical; repointing it is a separate migration
// that also covers Onboarding and Parent Settings, which still call it too.

export function sendEmailOtp(email: string, name: string) {
  return fetch(`${SERVER_URL}/user/email-otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  }).then(asResult<any>);
}

export function verifyEmailOtp(email: string, otp: string) {
  return fetch(`${SERVER_URL}/user/email-otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  }).then(asResult<any>);
}
