import DAILY_HABITS_SERVER_URL from '../../../../config/dailyHabitsServerUrl';
import PARENT_SERVER_URL from '../../../../config/parentServerUrl';

// Real bug (2026-09-11): this used to call aivorah-students-service's copy of
// GET /parent/:email/children, believing it had been "ported off the
// monolith." It hadn't actually gone live for real data — EVERY parent/child
// link is still created exclusively through the monolith's routes (see
// parentMyKidsService.ts's initChildAuth/linkCreatedChild/linkExistingChild,
// all on PARENT_SERVER_URL) — so aivorah-students-service's parent_children
// table is empty for real accounts. A freshly-added (or ANY) child correctly
// showed up on My Kids (reads the monolith) but never on Daily Tasks (was
// reading the empty copy). Verified live: aivorah-students-service returned
// 0 children for a real parent with 16 actually-linked children on the
// monolith. Now reads the same source of truth as My Kids.
export async function fetchChildren(parentEmail: string): Promise<any[]> {
  const res = await fetch(`${PARENT_SERVER_URL}/parent/${encodeURIComponent(parentEmail)}/children`);
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
  childName: string;
  grade?: string;
  curriculum?: string;
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
