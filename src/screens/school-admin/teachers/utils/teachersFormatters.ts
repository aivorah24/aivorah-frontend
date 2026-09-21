import type { AppColors } from '../../../../theme';

export interface TeachesEntry { curriculum: string; grade: string; subjects: string[] }
export interface TeacherRow {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  teaches: TeachesEntry[];
  grade: string | null;
  curriculum: string | null;
  status: 'invited' | 'active' | 'inactive' | 'archived';
  joinedAt: string;
}

export const STATUS_LABEL: Record<string, string> = { invited: 'Invited', active: 'Active', inactive: 'Inactive', archived: 'Archived' };

export function statusTint(colors: AppColors, status: string): string {
  if (status === 'active') return colors.accentGreen;
  if (status === 'invited') return colors.accentYellow;
  return colors.textDim;
}

export function gradeSummary(t: Pick<TeacherRow, 'teaches' | 'curriculum' | 'grade'>): string {
  const teaches = t.teaches || [];
  if (teaches.length > 0) return teaches.map((e) => `${e.curriculum} · ${e.grade}`).join(', ');
  return [t.curriculum, t.grade].filter(Boolean).join(' · ') || '—';
}
