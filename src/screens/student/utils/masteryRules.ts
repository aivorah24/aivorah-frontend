// Centralized pass/mastery thresholds (B004 fix) — single source of truth for
// the frontend. A topic quiz attempt "passes" at PASS_THRESHOLD and counts
// toward "mastered" at MASTERY_THRESHOLD; both values are provisional,
// pending explicit product-rule confirmation (see RCA Phase 1 decision #4) —
// do not change the numbers here without that approval.
//
// aivorah-leaderboard-service duplicates PASS_THRESHOLD independently in
// services/student-stats.js (`trackAttempt`'s `passed = score >= 60`). There
// is deliberately no shared package across repos for this (RCA Phase 3 gate
// 7) — if either threshold value changes, update BOTH this file and that
// service function, and update the comment there pointing back here.
export const PASS_THRESHOLD = 60;
export const MASTERY_THRESHOLD = 80;

export function isTopicMastered(topicName: string, completedSet: Set<string>, avgScore: number | null | undefined): boolean {
  return completedSet.has(topicName) || (avgScore ?? 0) >= MASTERY_THRESHOLD;
}

// Same pass semantics as the backend's trackAttempt — a score "passes" at
// PASS_THRESHOLD. Used anywhere a score is being judged pass/fail, not for
// unrelated numeric thresholds (e.g. a daily study-time goal) that happen to
// also be 60.
export function isPassingScore(score: number): boolean {
  return score >= PASS_THRESHOLD;
}

export function isMasteryScore(score: number): boolean {
  return score >= MASTERY_THRESHOLD;
}
