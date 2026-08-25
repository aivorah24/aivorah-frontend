// This screen is still 100% on the old monolith (via serverUrl.ts). This
// module just wraps the existing fetch calls verbatim — no backend
// migration/extraction happens here (see CLAUDE.md's "don't touch the
// monolith incidentally" rule).
import SERVER_URL from '../../../../config/serverUrl';
import type { ScheduleEvent, StudentItem } from '../types';

export async function fetchEventsForDate(dateIso: string, email?: string): Promise<ScheduleEvent[]> {
  const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
  try {
    const res = await fetch(`${SERVER_URL}/schedule/teacher?date=${dateIso}${emailParam}`);
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export async function fetchStudentsByTeacher(email: string): Promise<StudentItem[]> {
  try {
    const res = await fetch(`${SERVER_URL}/student/by-teacher/${encodeURIComponent(email)}`);
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export async function patchEventTimes(eventId: string, startTime: string, endTime: string): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/schedule/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime, endTime }),
    });
  } catch {
    // swallow — matches previous inline behavior
  }
}

export async function createEvent(payload: Record<string, any>): Promise<Response> {
  return fetch(`${SERVER_URL}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateEvent(eventId: string, payload: Record<string, any>): Promise<Response> {
  return fetch(`${SERVER_URL}/schedule/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    await fetch(`${SERVER_URL}/schedule/${eventId}`, { method: 'DELETE' });
  } catch {
    // swallow — matches previous inline behavior
  }
}
