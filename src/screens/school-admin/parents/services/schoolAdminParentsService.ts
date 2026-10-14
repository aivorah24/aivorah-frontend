import SCHOOL_ADMIN_SERVER_URL from '../../../../config/schoolAdminServerUrl';
import { ParentRow } from '../utils/parentsFormatters';
import { ChildPayloadEntry } from '../utils/childEntry';
import { friendlyAccountError } from '../../shared/accountErrors';

export type { ParentRow };

export interface CreateParentPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  children?: ChildPayloadEntry[];
}

export interface ExistingParent { id: string; name: string; email: string }

export interface LinkChildrenResult { id: string; name: string; email: string; linked: number }

export interface CreateParentResult {
  id: string;
  name: string;
  email: string;
  password: string;
  status: string;
}

export interface UnresolvedChild { index: number; reason: string }

export class CreateParentError extends Error {
  unresolved: UnresolvedChild[];
  // Set on a 409 when the email belongs to a parent already in this school.
  existingParent: ExistingParent | null;
  constructor(message: string, unresolved: UnresolvedChild[] = [], existingParent: ExistingParent | null = null) {
    super(message);
    this.unresolved = unresolved;
    this.existingParent = existingParent;
  }
}

export interface GradeSectionOptions {
  sectionsByGrade: Record<string, string[]>;
  allSections: string[];
  schoolCurriculumBase: string | null;
}

export class SchoolAdminParentsService {
  async getParents(adminEmail: string): Promise<ParentRow[]> {
    let res: Response;
    try {
      res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/parents?adminEmail=${encodeURIComponent(adminEmail)}`);
    } catch {
      throw new Error('Failed to load parents. Check your connection.');
    }
    const data = await res.json().catch(() => ([]));
    if (!res.ok) {
      throw new Error((data as any)?.error || 'Failed to load parents');
    }
    return Array.isArray(data) ? data : [];
  }

  async createParent(adminEmail: string, payload: CreateParentPayload): Promise<CreateParentResult> {
    let res: Response;
    try {
      res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/parents?adminEmail=${encodeURIComponent(adminEmail)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } catch {
      throw new Error('Failed to add parent. Check your connection.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const d = data as any;
      throw new CreateParentError(
        friendlyAccountError(d?.error, 'Failed to add parent'),
        Array.isArray(d?.unresolved) ? d.unresolved : [],
        res.status === 409 && d?.existingParent?.id ? d.existingParent : null,
      );
    }
    return data as CreateParentResult;
  }

  async linkChildren(adminEmail: string, parentId: string, children: ChildPayloadEntry[]): Promise<LinkChildrenResult> {
    let res: Response;
    try {
      res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/parents/${encodeURIComponent(parentId)}/children?adminEmail=${encodeURIComponent(adminEmail)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ children }),
      });
    } catch {
      throw new Error('Failed to link child. Check your connection.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const d = data as any;
      throw new CreateParentError(d?.error || 'Failed to link child', Array.isArray(d?.unresolved) ? d.unresolved : []);
    }
    return data as LinkChildrenResult;
  }

  async getGradeSectionOptions(adminEmail: string): Promise<GradeSectionOptions> {
    const [gsRes, overviewRes] = await Promise.all([
      fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/grades-sections?adminEmail=${encodeURIComponent(adminEmail)}`),
      fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/overview?adminEmail=${encodeURIComponent(adminEmail)}`),
    ]);
    const gsData = await gsRes.json().catch(() => ({}));
    const overviewData = await overviewRes.json().catch(() => ({}));
    const grades: { name: string; sections?: { name: string; archived?: boolean }[] }[] = Array.isArray((gsData as any).grades) ? (gsData as any).grades : [];
    const sectionsByGrade: Record<string, string[]> = {};
    const all = new Set<string>();
    grades.forEach((g) => {
      const secs = (g.sections || []).filter((s) => !s.archived).map((s) => s.name);
      sectionsByGrade[g.name] = secs;
      secs.forEach((s) => all.add(s));
    });
    return {
      sectionsByGrade,
      allSections: Array.from(all).sort(),
      schoolCurriculumBase: (overviewData as any)?.school?.curriculum || null,
    };
  }
}

export const schoolAdminParentsService = new SchoolAdminParentsService();
