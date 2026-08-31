import SERVER_URL from '../../../../config/serverUrl';
import DAILY_HABITS_SERVER_URL from '../../../../config/dailyHabitsServerUrl';

// Children list stays on the monolith (ai-mentor/server routes/parent.js) —
// no dedicated parent/children microservice exists yet at the time this was
// written. Repoint this once aivorah-parent-service (or equivalent) exists.
export async function fetchChildren(parentEmail: string): Promise<any[]> {
  const res = await fetch(`${SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
  if (!res.ok) throw new Error('Could not load children.');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// Parent-assigned daily tasks — repointed to aivorah-daily-habits-service,
// which already exposes matching GET/POST/DELETE /parent-tasks routes with
// identical request/response shapes to the legacy monolith endpoints.
export async function fetchTasks(childId: string): Promise<any[]> {
  const res = await fetch(`${DAILY_HABITS_SERVER_URL}/habits/parent-tasks?childId=${childId}`);
  if (!res.ok) throw new Error('Could not load tasks.');
  return res.json();
}

export interface CreateTaskPayload {
  parentEmail: string;
  childId: string;
  label: string;
  icon: string;
  coins: number;
}

export async function createTask(payload: CreateTaskPayload): Promise<any> {
  const res = await fetch(`${DAILY_HABITS_SERVER_URL}/habits/parent-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Could not save task.');
  }
  return res.json();
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${DAILY_HABITS_SERVER_URL}/habits/parent-tasks/${taskId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Could not delete task.');
}
