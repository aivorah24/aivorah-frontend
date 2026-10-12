// Migrated 2026-08-25: schedule reads/writes go to aivorah-schedule-service
// (already deployed and live — verified all 6 routes this screen needs exist
// there with identical field names: GET /teacher, POST /, PATCH /:id,
// DELETE /:id). The teacher roster lookup goes to
// aivorah-teacher-dashboard-service (also confirmed live), which owns
// GET /student/by-teacher/:email. Neither call touches the monolith anymore.
import SCHEDULE_SERVER_URL from '../../../../config/scheduleServerUrl';
import TEACHER_DASHBOARD_SERVER_URL from '../../../../config/teacherDashboardServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { ScheduleEvent, StudentItem } from '../types';

export async function fetchEventsForDate(dateIso: string, email?: string): Promise<ScheduleEvent[]> {
  const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
  try {
    const res = await fetch(`${SCHEDULE_SERVER_URL}/schedule/teacher?date=${dateIso}${emailParam}`, { headers: await authHeader() });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export async function fetchStudentsByTeacher(email: string): Promise<StudentItem[]> {
  try {
    const res = await fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/${encodeURIComponent(email)}`);
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

export async function patchEventTimes(eventId: string, startTime: string, endTime: string): Promise<void> {
  try {
    await fetch(`${SCHEDULE_SERVER_URL}/schedule/${eventId}`, {
      method: 'PATCH',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime, endTime }),
    });
  } catch {
    // swallow — matches previous inline behavior
  }
}

export async function createEvent(payload: Record<string, any>): Promise<Response> {
  return fetch(`${SCHEDULE_SERVER_URL}/schedule`, {
    method: 'POST',
    headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateEvent(eventId: string, payload: Record<string, any>): Promise<Response> {
  return fetch(`${SCHEDULE_SERVER_URL}/schedule/${eventId}`, {
    method: 'PATCH',
    headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    await fetch(`${SCHEDULE_SERVER_URL}/schedule/${eventId}`, { method: 'DELETE', headers: await authHeader() });
  } catch {
    // swallow — matches previous inline behavior
  }
}
