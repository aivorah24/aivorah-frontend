import SCHOOL_ADMIN_SERVER_URL from '../../../../config/schoolAdminServerUrl';
import type { ImportRun } from '../types';

export async function fetchImportHistory(adminEmail: string): Promise<ImportRun[]> {
  const res = await fetch(`${SCHOOL_ADMIN_SERVER_URL}/school-admin/import-history?adminEmail=${encodeURIComponent(adminEmail)}`);
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to load import history');
  return Array.isArray(data) ? data : [];
}
