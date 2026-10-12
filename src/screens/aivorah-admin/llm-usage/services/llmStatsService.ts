import PLATFORM_ADMIN_SERVER_URL from '../../../../config/platformAdminServerUrl';
import { authHeader } from '../../../../services/authHeader';
import type { LlmInsights, LlmStats } from '../types';

async function getJson<T>(path: string, fallbackError: string): Promise<T> {
  const headers = await authHeader();
  const res = await fetch(`${PLATFORM_ADMIN_SERVER_URL}${path}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || fallbackError);
  return data as T;
}

export const fetchLlmStats = (days: number) =>
  getJson<LlmStats>(`/llm-stats?days=${days}`, 'Failed to load LLM usage stats');

export const fetchLlmInsights = (days: number) =>
  getJson<LlmInsights>(`/llm-stats/insights?days=${days}`, 'Failed to load LLM insights');
