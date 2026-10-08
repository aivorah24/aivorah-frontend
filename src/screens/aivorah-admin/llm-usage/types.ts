export interface LlmByModel { model: string; provider: string; calls: number; tokens: number; cost: number }
export interface LlmByDay { date: string; calls: number; tokens: number; cost: number }
export interface LlmByProvider { provider: string; calls: number }
export interface LlmLogRow {
  provider: string; model: string; route: string; student_email: string;
  grade: string | null; subject: string | null; topic: string | null;
  prompt_tokens: number; completion_tokens: number; total_tokens: number;
  estimated_cost_usd: number; response_time_ms: number; streamed: boolean;
  feedback: string | null; created_at: string;
}

export interface LlmStats {
  days: number;
  summary: { totalCalls: number; totalTokens: number; totalCost: number; avgResponseMs: number };
  byModel: LlmByModel[];
  byDay: LlmByDay[];
  byProvider: LlmByProvider[];
  feedback: { total: number; avg: number | null; counts: Record<string, number>; recent: LlmLogRow[] };
  recent: LlmLogRow[];
}
