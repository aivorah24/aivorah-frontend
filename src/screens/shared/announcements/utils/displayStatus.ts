import type { Announcement } from '../types';

export type DisplayStatus = 'published' | 'scheduled' | 'expired' | 'draft' | 'archived';

// What readers actually see right now — a published notice past its expiry is
// no longer live, and one with a future start time hasn't gone live yet.
export function displayStatus(a: Pick<Announcement, 'status' | 'startsAt' | 'expiresAt'>, now: Date = new Date()): DisplayStatus {
  if (a.status === 'archived' || a.status === 'draft') return a.status;
  if (a.expiresAt && new Date(a.expiresAt) <= now) return 'expired';
  if (a.startsAt && new Date(a.startsAt) > now) return 'scheduled';
  if (a.status === 'scheduled' && !a.startsAt) return 'scheduled';
  return 'published';
}
