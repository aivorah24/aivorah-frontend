import PLATFORM_ADMIN_SERVER_URL from '../../../../config/platformAdminServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { BulkCreatePayload, BulkCreateResult, SpreadsheetImportPayload, SpreadsheetImportResult, TeacherImportPayload, TeacherImportResult } from '../types';

export async function importSpreadsheet(payload: SpreadsheetImportPayload): Promise<SpreadsheetImportResult> {
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/students/bulk-import`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Import failed. Check your connection and try again.');
  return data as SpreadsheetImportResult;
}

export async function bulkCreateStudents(payload: BulkCreatePayload): Promise<BulkCreateResult> {
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/students/bulk-create`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to create student accounts');
  return data as BulkCreateResult;
}

export async function importTeachers(payload: TeacherImportPayload): Promise<TeacherImportResult> {
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/teachers/bulk-import`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Import failed. Check your connection and try again.');
  return data as TeacherImportResult;
}
