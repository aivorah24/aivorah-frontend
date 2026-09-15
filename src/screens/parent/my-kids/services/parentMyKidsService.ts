import PARENT_SERVER_URL from '../../../../config/parentServerUrl';
import DAILY_HABITS_SERVER_URL from '../../../../config/dailyHabitsServerUrl';

const HABITS_SERVER_URL = DAILY_HABITS_SERVER_URL;

export async function fetchChildren(parentEmail: string) {
  const res = await fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  return res;
}

export async function fetchChildCredentials(parentEmail: string, childId: string) {
  return fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}/credentials`);
}

export async function resendChildCredentials(parentEmail: string, childId: string) {
  return fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}/resend-credentials`, { method: 'POST' });
}

export async function resetChildPasswordRequest(parentEmail: string, childId: string, frontendOrigin: string) {
  return fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frontendOrigin }),
  });
}

export async function initChildAuth(payload: { name: string; email?: string; studentId: string; parentEmail: string }) {
  return fetch(`${PARENT_SERVER_URL}/parent/children/init-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function linkCreatedChild(parentEmail: string, payload: Record<string, any>) {
  return fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/link-created`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function sendEmailOtp(email: string, name: string) {
  return fetch(`${PARENT_SERVER_URL}/parent/children/email-otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
}

export async function verifyEmailOtp(email: string, otp: string) {
  return fetch(`${PARENT_SERVER_URL}/parent/children/email-otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
}

export async function updateChild(parentEmail: string, childId: string, payload: Record<string, any>) {
  return fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function linkExistingChild(parentEmail: string, childEmail: string) {
  return fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childEmail }),
  });
}

export async function removeChildRequest(parentEmail: string, childId: string) {
  return fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children/${childId}`, { method: 'DELETE' });
}

export async function fetchParentTasks(childId: string) {
  return fetch(`${HABITS_SERVER_URL}/habits/parent-tasks?childId=${childId}`);
}

export async function createParentTask(payload: { parentEmail: string; childId: string; childName: string; grade?: string; curriculum?: string; label: string; icon: string; coins: number }) {
  return fetch(`${HABITS_SERVER_URL}/habits/parent-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteParentTask(taskId: string) {
  return fetch(`${HABITS_SERVER_URL}/habits/parent-tasks/${taskId}`, { method: 'DELETE' });
}
