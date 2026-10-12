import PLATFORM_ADMIN_SERVER_URL from '../../../../config/platformAdminServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { ChartsData, PlatformOverview } from '../types';

export async function fetchPlatformOverview(): Promise<PlatformOverview> {
  const headers = await authHeader();
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/overview`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to load platform overview');
  return data as PlatformOverview;
}

export async function fetchChartsData(): Promise<ChartsData> {
  const headers = await authHeader();
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/charts-data`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to load charts data');
  return data as ChartsData;
}
