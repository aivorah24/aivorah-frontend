import ATTENDANCE_SERVER_URL from '../../../config/attendanceServerUrl';
import { authHeader } from '../../../services/authHeader';

export interface MyClass {
  grade: string;
  section: string;
  label: string;
  code: string;
  classTeacherEmail: string | null;
  classTeacherName: string | null;
  studentCount: number;
  studentId?: string;
  studentName?: string;
}

// Moved off the monolith's own /classes/mine (which read an unused Prod
// Supabase project and trusted a bare ?email= query param) onto
// aivorah-attendance-service's enriched version of the same route, behind
// a real Firebase token.
export async function fetchMyClasses(): Promise<MyClass[]> {
  const headers = await authHeader();
  const res = await fetch(`${ATTENDANCE_SERVER_URL}/classes/mine`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return Array.isArray(data?.classes) ? data.classes : [];
}
