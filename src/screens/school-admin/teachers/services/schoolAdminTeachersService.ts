import PROFILE_SERVER_URL from '../../../../config/profileServerUrl';
import SCHOOL_ADMIN_SERVER_URL from '../../../../config/schoolAdminServerUrl';
import { TeacherRow } from '../utils/teachersFormatters';

export type { TeacherRow };

export interface CreateTeacherPayload {
  firstName: string;
  lastName: string;
  email?: string;
  teaches: { curriculum: string; grade: string; subjects: string[] }[];
}

export interface CreateTeacherResult {
  id: string;
  name: string;
  email: string;
  password: string;
  subjects: string[];
  status: string;
}

export class SchoolAdminTeachersService {
  async getTeachers(adminEmail: string): Promise<TeacherRow[]> {
    let res: Response;
    try {
      res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/teachers?adminEmail=${encodeURIComponent(adminEmail)}`);
    } catch {
      throw new Error('Failed to load teachers. Check your connection.');
    }
    const data = await res.json().catch(() => ([]));
    if (!res.ok) {
      throw new Error((data as any)?.error || 'Failed to load teachers');
    }
    return Array.isArray(data) ? data : [];
  }

  async getSchoolCurriculumBase(adminEmail: string): Promise<string | null> {
    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/overview?adminEmail=${encodeURIComponent(adminEmail)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return (data as any)?.school?.curriculum || null;
  }

  async createTeacher(adminEmail: string, payload: CreateTeacherPayload): Promise<CreateTeacherResult> {
    let res: Response;
    try {
      res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/teachers?adminEmail=${encodeURIComponent(adminEmail)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } catch {
      throw new Error('Failed to add teacher. Check your connection.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as any)?.error || 'Failed to add teacher');
    }
    return data as CreateTeacherResult;
  }

  async updateTeacherTeaches(email: string, teaches: { curriculum: string; grade: string; subjects: string[] }[]): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${PROFILE_SERVER_URL}/user/profile`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, teaches }),
      });
    } catch {
      throw new Error('Failed to save changes. Check your connection.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as any)?.error || 'Failed to save changes');
    }
  }
}

export const schoolAdminTeachersService = new SchoolAdminTeachersService();
