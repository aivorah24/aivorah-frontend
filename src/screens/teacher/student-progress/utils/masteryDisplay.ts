import type { TopicMasteryStatus } from '../types';

// One real legend for the 5 states the backend's computeTopicStatus()
// actually produces (see aivorah-teacher-dashboard-service/utils/
// topicStatus.js) — not the old dummy screen's 3-color guess
// (mastered/trying/stuck), which didn't match any real backend model
// because there was no real backend at all until this feature was built.
export const MASTERY_META: Record<TopicMasteryStatus, { label: string; color: string; description: string }> = {
  mastered:    { label: 'Mastered',     color: '#4CAF50', description: 'Passed, or completed via the Learning Path' },
  trying:      { label: 'Trying',       color: '#FFC107', description: 'Actively working on it — recent attempt(s)' },
  dropped:     { label: 'Dropped',      color: '#FF9800', description: 'One attempt, then nothing for a week+' },
  stuck:       { label: 'Stuck',        color: '#F44336', description: '2+ failing attempts, gone stale' },
  not_started: { label: 'Not started',  color: '#9E9E9E', description: 'No attempts yet' },
};

export function masteryMeta(status: TopicMasteryStatus | undefined) {
  return status ? MASTERY_META[status] : { label: 'Unattempted', color: '#E0E0E0', description: 'No signal for this topic yet' };
}

// Real per-student summary used by the roster's "at a glance" column — counts
// how many of this student's touched topics fall into each mastery bucket.
export function summarizeStudentMastery(topicStatus: Record<string, { status: TopicMasteryStatus }>) {
  const counts: Record<TopicMasteryStatus, number> = { mastered: 0, trying: 0, dropped: 0, stuck: 0, not_started: 0 };
  Object.values(topicStatus).forEach((t) => { counts[t.status] += 1; });
  const totalTouched = Object.keys(topicStatus).length;
  const masteredPct = totalTouched > 0 ? Math.round((counts.mastered / totalTouched) * 100) : 0;
  return { counts, totalTouched, masteredPct };
}
