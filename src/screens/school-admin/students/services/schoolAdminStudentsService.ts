import SCHOOL_ADMIN_SERVER_URL from '../../../../config/schoolAdminServerUrl';

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  admissionNumber: string | null;
  grade: string | null;
  section: string | null;
  curriculum?: string | null;
  status: 'invited' | 'active' | 'inactive' | 'archived';
  joinedAt: string;
  lastActiveAt: string | null;
}

export interface StudentDetail extends StudentRow {
  parent: { name: string; email: string; phone?: string } | null;
}

export interface StudentEditPatch {
  name?: string;
  grade?: string;
  section?: string;
  admissionNumber?: string;
  parentName?: string;
  parentPhone?: string;
}

export interface StudentsFacets {
  grades: string[];
  sections: string[];
  curriculums: string[];
}

export interface GetStudentsOptions {
  adminEmail: string;
  status?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  search?: string;
  curriculum?: string;
  grade?: string;
  section?: string;
  limit?: number;
}

export interface GetStudentsResponse {
  items: StudentRow[];
  total: number;
}

export class SchoolAdminStudentsService {
  /**
   * Fetch the full set of Grade/Section/Curriculum values that exist anywhere in the school.
   */
  async getFacets(adminEmail: string): Promise<StudentsFacets> {
    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/students/facets?adminEmail=${encodeURIComponent(adminEmail)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to fetch facets');
    }
    return {
      grades: Array.isArray(data.grades) ? data.grades : [],
      sections: Array.isArray(data.sections) ? data.sections : [],
      curriculums: Array.isArray(data.curriculums) ? data.curriculums : [],
    };
  }

  /**
   * Fetch a paginated, filtered, and sorted list of students.
   */
  async getStudents(options: GetStudentsOptions): Promise<GetStudentsResponse> {
    const params = new URLSearchParams({
      adminEmail: options.adminEmail,
      sort: options.sort || 'admissionNumber',
      dir: options.dir || 'asc',
      status: options.status || 'all',
      limit: String(options.limit || 100),
    });

    if (options.search?.trim()) params.set('search', options.search.trim());
    if (options.curriculum && options.curriculum !== 'all') params.set('curriculum', options.curriculum);
    if (options.grade && options.grade !== 'all') params.set('grade', options.grade);
    if (options.section && options.section !== 'all') params.set('section', options.section);

    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/students?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load students');
    }
    return {
      items: Array.isArray(data.items) ? data.items : [],
      total: data.total || 0,
    };
  }

  /**
   * Fetch details for a specific student.
   */
  async getStudentDetail(id: string, adminEmail: string): Promise<StudentDetail> {
    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/students/${encodeURIComponent(id)}?adminEmail=${encodeURIComponent(adminEmail)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load student details');
    }
    return data;
  }

  /**
   * Apply a status change to a single student.
   */
  async updateStudentStatus(id: string, status: 'active' | 'inactive' | 'archived', adminEmail: string): Promise<void> {
    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/students/${encodeURIComponent(id)}/status?adminEmail=${encodeURIComponent(adminEmail)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to update status');
    }
  }

  /**
   * Save edits to a student's profile.
   */
  async updateStudent(id: string, patch: StudentEditPatch, adminEmail: string): Promise<void> {
    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/students/${encodeURIComponent(id)}?adminEmail=${encodeURIComponent(adminEmail)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to save changes.');
    }
  }

  /**
   * Delete a student.
   */
  async deleteStudent(id: string, adminEmail: string): Promise<void> {
    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/students/${encodeURIComponent(id)}?adminEmail=${encodeURIComponent(adminEmail)}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to delete student.');
    }
  }

  /**
   * Apply a status change to multiple students in bulk.
   */
  async bulkUpdateStatus(studentIds: string[], status: 'active' | 'inactive' | 'archived', adminEmail: string): Promise<void> {
    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/students/bulk-status?adminEmail=${encodeURIComponent(adminEmail)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to update selected students.');
    }
  }

  /**
   * Promote or move multiple students to a new grade/section in bulk.
   */
  async bulkPromote(studentIds: string[], grade: string, section: string, adminEmail: string): Promise<void> {
    const body: any = { studentIds, grade };
    if (section.trim()) body.section = section.trim();
    
    const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/students/bulk-grade?adminEmail=${encodeURIComponent(adminEmail)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to promote selected students.');
    }
  }
}

export const schoolAdminStudentsService = new SchoolAdminStudentsService();
