import SCHOOL_ADMIN_SERVER_URL from '../../../../config/schoolAdminServerUrl';
import { ClassRow, TeacherOption } from '../utils/classesSorting';

export type { ClassRow, TeacherOption };

/**
 * School Admin — Classes. Every non-archived Grade x Section pair from
 * Grades & Sections is a class; each can have one assigned Class Teacher,
 * stored on the same academic_structure overlay so it survives grade/section
 * renames (server/routes/school-admin.js: buildGradesSectionsView).
 *
 * Contract (unchanged from the legacy screen):
 *   GET   /school-admin/classes?adminEmail=
 *        -> { classes: [{ grade, section, studentCount, classTeacherEmail, classTeacherName }] }
 *   GET   /school-admin/teachers?adminEmail=          (for the assign picker)
 *   PATCH /school-admin/grades/:grade/sections/:section/class-teacher?adminEmail=
 *        body { teacherEmail: string | null } -> { ok }
 */
export class SchoolAdminClassesService {
  /**
   * Fetch every class (Grade x Section pair) for this admin's school.
   */
  async getClasses(adminEmail: string): Promise<ClassRow[]> {
    let res: Response;
    try {
      res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/classes?adminEmail=${encodeURIComponent(adminEmail)}`);
    } catch {
      // A network-level failure (fetch itself rejecting) gets the same
      // friendly message the legacy screen's outer catch showed — distinct
      // from a clean HTTP error response below, which surfaces the server's
      // own message instead.
      throw new Error('Failed to load classes. Check your connection.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load classes');
    }
    return Array.isArray(data.classes) ? data.classes : [];
  }

  /**
   * Fetch teachers available for the class-teacher assign picker.
   */
  async getTeachers(adminEmail: string): Promise<TeacherOption[]> {
    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/teachers?adminEmail=${encodeURIComponent(adminEmail)}`);
    const data = await res.json().catch(() => ([]));
    if (!res.ok) {
      throw new Error((data as any)?.error || 'Failed to load teachers');
    }
    return Array.isArray(data) ? data : [];
  }

  /**
   * Assign (or, with teacherEmail: null, unassign) a class teacher for one
   * grade/section.
   */
  async assignClassTeacher(grade: string, section: string, adminEmail: string, teacherEmail: string | null): Promise<void> {
    const url = `${SCHOOL_ADMIN_SERVER_URL}/school-admin/grades/${encodeURIComponent(grade)}/sections/${encodeURIComponent(section)}/class-teacher?adminEmail=${encodeURIComponent(adminEmail)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherEmail }),
      });
    } catch {
      throw new Error('Failed to assign class teacher. Check your connection.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to assign class teacher');
    }
  }
}

export const schoolAdminClassesService = new SchoolAdminClassesService();
