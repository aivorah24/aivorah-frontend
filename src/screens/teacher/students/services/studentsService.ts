// Every backend call this screen makes lives here — this was the single seam
// for the `aivorah-students-service` extraction (2026-08-26): 7 of these routes
// moved off the old monolith (SERVER_URL) to the new service (STUDENTS_SERVER_URL).
// `fetchStudentsByTeacher` stays on aivorah-teacher-dashboard-service and
// `fetchTeacherPreferences` on aivorah-profile-service — both already migrated
// separately, untouched by this extraction.
//
// These functions deliberately return the raw `Response` (and let network errors
// propagate) rather than parsing/swallowing, so each caller keeps the exact
// success/failure handling the monolithic screen had.
import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import STUDENTS_SERVER_URL from '../../../../config/studentsServerUrl';
import TEACHER_DASHBOARD_SERVER_URL from '../../../../config/teacherDashboardServerUrl';

export function fetchStudentsByTeacher(email: string): Promise<Response> {
  return fetch(`${TEACHER_DASHBOARD_SERVER_URL}/student/by-teacher/${encodeURIComponent(email)}`);
}

// Already migrated — aivorah-profile-service owns user preferences.
export function fetchTeacherPreferences(email: string): Promise<Response> {
  return fetch(`${PROFILE_SERVER_URL}/user/preferences?email=${encodeURIComponent(email)}`);
}

export function fetchLinkableStudents(teacherEmail: string, grades: string[]): Promise<Response> {
  const url = grades.length > 0
    ? `${STUDENTS_SERVER_URL}/student/available-to-link?teacherEmail=${encodeURIComponent(teacherEmail)}&grades=${grades.map(g => encodeURIComponent(g)).join(',')}`
    : `${STUDENTS_SERVER_URL}/student/available-to-link?teacherEmail=${encodeURIComponent(teacherEmail)}`;
  return fetch(url);
}

export function initStudentAuth(payload: {
  name: string; email?: string; password?: string; teacherEmail: string;
}): Promise<Response> {
  return fetch(`${STUDENTS_SERVER_URL}/teacher/students/init-auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function linkCreatedStudent(teacherEmail: string, payload: {
  firebaseUid: string; name: string; email: string;
  grade: string; curriculum: string; initialPassword: string;
}): Promise<Response> {
  return fetch(
    `${STUDENTS_SERVER_URL}/teacher/${encodeURIComponent(teacherEmail)}/students/link-created`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
}

// Real-email student: server creates the account, emails a set-password
// invite and starts email verification (same flow as platform-admin Add user).
export function inviteStudent(teacherEmail: string, payload: {
  name: string; email: string; grade: string; curriculum: string; frontendOrigin?: string;
}): Promise<Response> {
  return fetch(
    `${STUDENTS_SERVER_URL}/teacher/${encodeURIComponent(teacherEmail)}/students/invite`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
}

export function linkExistingStudent(teacherEmail: string, studentEmail: string): Promise<Response> {
  return fetch(
    `${STUDENTS_SERVER_URL}/teacher/${encodeURIComponent(teacherEmail)}/students/link-existing`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentEmail }),
    }
  );
}

export function removeStudent(teacherEmail: string, studentId: string): Promise<Response> {
  return fetch(
    `${STUDENTS_SERVER_URL}/teacher/${encodeURIComponent(teacherEmail)}/students/${studentId}`,
    { method: 'DELETE' }
  );
}

export function promoteStudents(teacherEmail: string, body: Record<string, any>): Promise<Response> {
  return fetch(`${STUDENTS_SERVER_URL}/teacher/${encodeURIComponent(teacherEmail)}/students/promote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function bulkImportStudents(teacherEmail: string, formData: FormData): Promise<Response> {
  return fetch(
    `${STUDENTS_SERVER_URL}/teacher/${encodeURIComponent(teacherEmail)}/students/bulk-import`,
    { method: 'POST', body: formData }
  );
}

export function fetchImportTemplate(teacherEmail: string, ext: 'csv' | 'xlsx'): Promise<Response> {
  return fetch(`${STUDENTS_SERVER_URL}/teacher/${encodeURIComponent(teacherEmail)}/students/template.${ext}`);
}
