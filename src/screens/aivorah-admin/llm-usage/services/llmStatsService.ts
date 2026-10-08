import PLATFORM_ADMIN_SERVER_URL from '../../../../config/platformAdminServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { LlmStats } from '../types';

export async function fetchLlmStats(days: number): Promise<LlmStats> {
  const headers = await authHeader();
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}/llm-stats?days=${days}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || 'Failed to load LLM usage stats');
  return data as LlmStats;
}
