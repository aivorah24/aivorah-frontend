// Mirrors aivorah-teacher-dashboard-service/utils/studentStatus.js — keep in sync.
export type StudentStatus = 'needs_attention' | 'getting_started' | 'excelling' | 'on_track' | 'keep_going';

export const NEW_ACCOUNT_DAYS = 7;
export const INACTIVE_DAYS = 7;
export const EXCELLING_PCT = 50;
export const ON_TRACK_PCT = 20;

const DAY_MS = 86400000;

function daysSince(value: string | null | undefined, now: number): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : Math.floor((now - t) / DAY_MS);
}

export function computeStudentStatus(
  { lastActive, createdAt, progressPct }: { lastActive?: string | null; createdAt?: string | null; progressPct?: number | null },
  now: number = Date.now(),
): StudentStatus {
  const sinceCreated = daysSince(createdAt, now);
  const sinceSeen = daysSince(lastActive, now) ?? sinceCreated;
  if (sinceSeen != null && sinceSeen >= INACTIVE_DAYS) return 'needs_attention';
  if (sinceCreated == null || sinceCreated < NEW_ACCOUNT_DAYS) return 'getting_started';
  const pct = progressPct ?? 0;
  if (pct >= EXCELLING_PCT) return 'excelling';
  if (pct >= ON_TRACK_PCT) return 'on_track';
  return 'keep_going';
}

// Prefers the server-computed status; falls back to the shared rule.
export function resolveStudentStatus(s: {
  status?: StudentStatus | string | null; lastActive?: string | null; createdAt?: string | null; progressPct?: number | null;
}): StudentStatus {
  if (s.status && s.status in STATUS_META) return s.status as StudentStatus;
  return computeStudentStatus(s);
}

export const STATUS_META: Record<StudentStatus, { label: string; icon: string; color: string; bg: string }> = {
  needs_attention: { label: 'Needs Attention', icon: 'alert-circle', color: '#B8797E', bg: '#B8797E18' },
  getting_started: { label: 'Getting Started', icon: 'play-circle', color: '#9A7B2E', bg: '#9A7B2E18' },
  excelling: { label: 'Excelling', icon: 'award', color: '#7C6BAE', bg: '#7C6BAE18' },
  on_track: { label: 'On Track', icon: 'check-circle', color: '#5A8A70', bg: '#5A8A7018' },
  keep_going: { label: 'Keep Going', icon: 'trending-up', color: '#4F7FA8', bg: '#4F7FA818' },
};

// Parent payloads (students-service /parent/:email/children) carry addedAt, not createdAt.
export function childStudentStatus(c: {
  lastActive?: string | null; createdAt?: string | null; addedAt?: string | null;
  completedTopics?: string[] | null; totalTopics?: number | null; progressPct?: number | null;
}): StudentStatus {
  const total = c.totalTopics ?? 0;
  const progressPct = c.progressPct ?? (total > 0 ? Math.round(((c.completedTopics?.length ?? 0) / total) * 100) : 0);
  return computeStudentStatus({ lastActive: c.lastActive, createdAt: c.createdAt ?? c.addedAt, progressPct });
}
