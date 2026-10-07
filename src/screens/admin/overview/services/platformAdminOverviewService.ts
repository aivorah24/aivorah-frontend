import PLATFORM_ADMIN_SERVER_URL from '../../../../config/platformAdminServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { PlatformOverview } from '../types';

export async function fetchPlatformOverview(): Promise<PlatformOverview> {
  const headers = await authHeader();
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/overview`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to load platform overview');
  return data as PlatformOverview;
}
