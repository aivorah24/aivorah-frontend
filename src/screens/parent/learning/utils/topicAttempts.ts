import type { TopicAttempt } from '../types';

export interface TopicSummary {
  attempts: TopicAttempt[]; // newest first
  bestScore: number | null;
  latestScore: number | null;
  totalSeconds: number;
}

export interface UnitGroup<T> {
  unit: string;
  topics: T[];
}

export const TONE = { good: '#2E8B57', ok: '#C98A1B', low: '#C8485A' } as const;

export const EMPTY_SUMMARY: TopicSummary = { attempts: [], bestScore: null, latestScore: null, totalSeconds: 0 };

export function summarizeByTopic(attempts: TopicAttempt[]): Map<string, TopicSummary> {
  const map = new Map<string, TopicSummary>();
  const sorted = [...attempts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  for (const a of sorted) {
    const s = map.get(a.topic) ?? { attempts: [], bestScore: null, latestScore: null, totalSeconds: 0 };
    s.attempts.push(a);
    s.bestScore = s.bestScore == null ? a.score : Math.max(s.bestScore, a.score);
    if (s.latestScore == null) s.latestScore = a.score;
    s.totalSeconds += a.timeSpentSeconds || 0;
    map.set(a.topic, s);
  }
  return map;
}

// Keeps syllabus order; topics without a unit share one unnamed group.
export function groupByUnit<T extends { unit?: string }>(topics: T[]): UnitGroup<T>[] {
  const groups: UnitGroup<T>[] = [];
  const index = new Map<string, UnitGroup<T>>();
  for (const t of topics) {
    const unit = t.unit || '';
    let g = index.get(unit);
    if (!g) { g = { unit, topics: [] }; index.set(unit, g); groups.push(g); }
    g.topics.push(t);
  }
  return groups;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m}m ${s % 60}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function scoreTone(score: number): 'good' | 'ok' | 'low' {
  return score >= 80 ? 'good' : score >= 60 ? 'ok' : 'low';
}

// Mid scores use the theme's Aivorah gold; good/low stay green/red.
export function scoreColor(score: number, gold: string): string {
  const tone = scoreTone(score);
  return tone === 'ok' ? gold : TONE[tone];
}

export function average(nums: number[]): number | null {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
}
