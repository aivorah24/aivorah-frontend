import PLATFORM_ADMIN_SERVER_URL from '../../../../config/platformAdminServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { BulkCreatePayload, BulkCreateResult } from '../types';

export async function bulkCreateStudents(payload: BulkCreatePayload): Promise<BulkCreateResult> {
  const headers = { ...(await authHeader()), 'Content-Type': 'application/json' };
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/students/bulk-create`, {
    method: 'POST', headers, body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to create student accounts');
  return data as BulkCreateResult;
}
