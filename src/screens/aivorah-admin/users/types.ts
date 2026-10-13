export type AdminUserRole = 'student' | 'teacher' | 'parent' | 'school_admin';
export type AdminUserStatus = 'active' | 'blocked';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole | string;
  school: string | null;
  school_id: string | null;
  curriculum?: string | null;
  grade?: string | null;
  section?: string | null;
  status: AdminUserStatus;
  last_active_at: string | null;
  created_at: string;
  isPlatformAdmin: boolean;
}

export interface AdminUsersPage { users: AdminUser[]; total: number; page: number; pageSize: number }

export interface AdminUserFilters { q: string; role: string; status: string; page: number }

export interface AcademicFields { curriculum?: string | null; grade?: string | null; section?: string | null }

export interface AdminUserEdit extends AcademicFields { name?: string; role?: string; school?: string | null }

export interface AdminUserCreate extends AcademicFields { name: string; email: string; role: string; school?: string | null; frontendOrigin?: string }

export interface SchoolGrade { name: string; sections: { name: string; archived: boolean }[]; archived: boolean }

export interface BulkResult { id: string; ok: boolean; error?: string }
