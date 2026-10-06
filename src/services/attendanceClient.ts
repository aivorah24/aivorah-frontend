import ATTENDANCE_SERVER_URL from '../config/attendanceServerUrl';
import { authHeader } from './authHeader';

export type AttendanceStatus = 'present' | 'absent' | 'late';
export type AttendanceClass = { grade: string; section: string; label?: string; code?: string; studentCount?: number };
export type RosterStudent = { id: string; name: string; email?: string; photoUrl?: string; status: AttendanceStatus | null };
export type AttendanceSummary = {
  summary: { present: number; absent: number; late: number; total: number; ratePct: number | null };
  history: { date: string; status: AttendanceStatus }[];
};

// JSON request to the Attendance service, signed in as the current user.
async function attRequest<T>(path: string, init: { method?: string; body?: unknown } = {}, fallbackError = 'Request failed'): Promise<T> {
  const headers: Record<string, string> = { ...(await authHeader()) };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${ATTENDANCE_SERVER_URL}${path}`, {
    method: init.method || 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || fallbackError);
  return data as T;
}

export async function fetchMyAttendanceClasses(): Promise<AttendanceClass[]> {
  const data = await attRequest<{ classes?: AttendanceClass[] }>('/classes/mine', {}, 'Could not load your classes');
  return data.classes || [];
}

export async function fetchClassAttendance(grade: string, section: string, date: string): Promise<RosterStudent[]> {
  const q = new URLSearchParams({ grade, section, date }).toString();
  const data = await attRequest<{ students?: RosterStudent[] }>(`/attendance/class?${q}`, {}, 'Could not load attendance');
  return data.students || [];
}

export function saveClassAttendance(body: { grade: string; section: string; date: string; records: Record<string, AttendanceStatus> }) {
  return attRequest<{ success: boolean; date: string }>('/attendance/save', { method: 'POST', body }, 'Could not save attendance');
}

export function fetchStudentAttendanceSummary(studentId: string) {
  return attRequest<AttendanceSummary>(`/attendance/student/${encodeURIComponent(studentId)}/summary`, {}, 'Could not load attendance');
}
