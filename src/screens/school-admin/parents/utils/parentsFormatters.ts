import type { AppColors } from '../../../../theme';

export interface ParentRow {
  id: string;
  name: string;
  email: string;
  linkedStudents: string[];
  status: 'invited' | 'active' | 'inactive' | 'archived';
  joinedAt: string;
}

export const STATUS_LABEL: Record<string, string> = { invited: 'Invited', active: 'Active', inactive: 'Inactive', archived: 'Archived' };

export function statusTint(colors: AppColors, status: string): string {
  if (status === 'active') return colors.accentGreen;
  if (status === 'invited') return colors.accentYellow;
  return colors.textDim;
}
