export interface LlmTotals { totalCalls: number; totalTokens: number; totalCost: number; avgResponseMs: number }

export interface LlmByModel {
  model: string; provider: string; calls: number; tokens: number; cost: number;
  avgResponseMs: number; costShare: number; callShare: number; trend: number[];
  rated: number; helpful: number; helpfulPct: number | null;
}
export interface LlmByDay { date: string; calls: number; tokens: number; cost: number; avgResponseMs: number }
export interface LlmByFeature { feature: string; calls: number; tokens: number }
export interface LlmByProvider { provider: string; calls: number }
export interface LlmRecent {
  created_at: string; model: string; provider: string; route: string | null; feature: string;
  total_tokens: number; cost: number; response_time_ms: number; feedback: number | null;
}

export interface LlmStats {
  days: number;
  range: { from: string; to: string };
  summary: LlmTotals & { activeModels: number };
  previous: LlmTotals;
  lastCallAt: string | null;
  byDay: LlmByDay[];
  byModel: LlmByModel[];
  byFeature: LlmByFeature[];
  byProvider: LlmByProvider[];
  feedback: { total: number; avg: number | null; counts: Record<string, number>; recent: unknown[] };
  recent: LlmRecent[];
}

export interface LlmInsights {
  text: string;
  source: 'ai' | 'summary';
  model: string | null;
  generatedAt: string;
  cached: boolean;
}
