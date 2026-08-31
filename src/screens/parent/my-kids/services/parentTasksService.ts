import DAILY_HABITS_SERVER_URL from '../../../../config/dailyHabitsServerUrl';
import type { ParentTask } from '../types';

// The Daily Tasks modal embedded in My Kids reads/writes parent-assigned
// habits. That domain is owned by aivorah-daily-habits-service (which already
// exposes an identical /habits/parent-tasks against the same database), so it
// is NOT ported into the parent service.

export async function fetchParentTasks(childId: string): Promise<ParentTask[]> {
  const res = await fetch(`${DAILY_HABITS_SERVER_URL}/habits/parent-tasks?childId=${childId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function createParentTask(payload: {
  parentEmail: string;
  childId?: string;
  label: string;
  icon: string;
  coins: number;
}) {
  return fetch(`${DAILY_HABITS_SERVER_URL}/habits/parent-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteParentTask(taskId: string) {
  return fetch(`${DAILY_HABITS_SERVER_URL}/habits/parent-tasks/${taskId}`, { method: 'DELETE' });
}
