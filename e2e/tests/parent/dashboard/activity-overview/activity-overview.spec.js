// Feature: Parent Dashboard - Activity Overview group (everything below the
// Weekly Snapshot stats: the 7-day study-time graph, Learning Highlights,
// Subject Performance, Learning Mood, and Achievements). Verifies that
// switching the selected child ("My Children" -> ChildCard) re-renders THIS
// group with that child's real data too, not just the Weekly Snapshot
// numbers (covered separately in ../child-switching/child-switching.spec.js).
//
// All values here are re-fetched per child from separate endpoints
// (ParentDashboardScreen.tsx's useEffect keyed on selectedChild.id, line
// 346-383): /student/{id}/weekly, /parent/{email}/children/{id}/ai-report,
// plus the already-loaded child object for Highlights/Mood/Achievements
// (those are pure client-side formulas over child.xpPoints/currentStreak/
// completedTopics/assignmentsDone - no extra fetch).
//
// Uses parent-e - read-only, linked to student-a and student-b (see
// OWNERSHIP notes in accounts.js).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';
import { accountFor } from '../../../helpers/accounts.js';
import { dismissAnnouncementIfPresent } from '../../../helpers/dismissAnnouncement.js';

const ACCOUNT = 'parent-e';
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Mirrors formatStudyTime() in ParentDashboardScreen.tsx (line 53-59) -
// the graph's per-day time label and Learning Mood's study-time sentence
// both render minutes through this exact formatter.
function formatStudyTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Mirrors the `badges` derivation (line 406-411) - client-side thresholds
// over the already-loaded child object, capped to the first 3 (line 875).
function realBadgesFor(child) {
  return [
    child.currentStreak >= 5 && '5 Day Streak',
    child.completedTopics.length >= 3 && 'Fast Learner',
    child.assignmentsDone >= 1 && 'Reading Star',
    child.xpPoints >= 1000 && '1000 XP',
  ]
    .filter(Boolean)
    .slice(0, 3);
}

// Mirrors the Learning Mood label/sub-text formula (line 831-840).
function moodFor(child) {
  const label =
    child.currentStreak >= 3 ? 'Focused' : child.studyTimeMinutes > 60 ? 'Active' : 'Warming Up';
  const sub =
    child.currentStreak >= 3
      ? `${child.currentStreak}-day streak going strong`
      : child.studyTimeMinutes > 0
        ? `${formatStudyTime(child.studyTimeMinutes)} total study time`
        : 'Just getting started';
  return { label, sub };
}

test.describe('Parent Dashboard - Activity Overview group (per-child data)', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test("switching the selected child updates the graph, Learning Highlights, Subject Performance, Learning Mood, and Achievements to that child's real data", async ({
    context,
    page,
    request,
  }) => {
    const parentEmail = accountFor(ACCOUNT).email;
    // Read-only expected-value lookup: parent-e is a shared read-only
    // account, so this is the only reliable source for each child's real
    // data to compare the UI against - never mutated, never asserted on
    // directly as the test outcome.
    const children = await request
      .get(`/parent/${encodeURIComponent(parentEmail)}/children`)
      .then((r) => r.json());

    expect(children.length, 'expected parent-e to have 2 linked children').toBeGreaterThanOrEqual(
      2,
    );
    const [childA, childB] = children;
    expect(childA.name).not.toBe(childB.name);

    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    for (const child of [childA, childB]) {
      await dismissAnnouncementIfPresent(page, { timeout: 1000 });
      await page.getByText(child.name, { exact: true }).filter({ visible: true }).first().click();

      // Anchor: confirms the switch landed before checking anything below it.
      await expect(
        page
          .getByText(`${child.name}'s Weekly Snapshot`, { exact: true })
          .filter({ visible: true })
          .first(),
      ).toBeVisible({ timeout: 15000 });

      // ── Activity Overview graph ──
      // Real per-day study minutes, same endpoint the screen itself calls.
      const weekly = await request.get(`/student/${child.id}/weekly`).then((r) => r.json());
      const minutesByDay = {};
      (weekly?.days ?? []).forEach((d) => {
        minutesByDay[d.day] = d.studyMinutes;
      });

      for (const day of WEEK_DAYS) {
        const mins = minutesByDay[day] ?? 0;
        // Zero-minute days render an empty label (line 742) - nothing to
        // assert there; only non-zero days show real, checkable text.
        if (mins <= 0) continue;
        // Scope to this day's column: the "Mon"/"Tue"/... label and its
        // time label are both direct text children of the same barColumn
        // View (line 741-745), so going up from the day label reaches the
        // column and nothing else's chart data.
        const column = page.getByText(day, { exact: true }).locator('xpath=..');
        await expect(column.getByText(formatStudyTime(mins), { exact: true })).toBeVisible({
          timeout: 15000,
        });
      }

      // ── Learning Highlights ──
      // Each row is conditionally rendered off the already-loaded child
      // object (line 758-790) - only assert rows that should actually exist.
      if (child.xpPoints > 0) {
        await expect(page.getByText('New Personal Best', { exact: true })).toBeVisible({
          timeout: 15000,
        });
        await expect(
          page.getByText(`XP points: ${child.xpPoints.toLocaleString()}`, { exact: true }),
        ).toBeVisible();
      }
      if (child.currentStreak >= 1) {
        await expect(
          page.getByText(`${child.currentStreak}-Day Streak`, { exact: true }),
        ).toBeVisible({ timeout: 15000 });
      }
      if (child.assignmentsDone > 0) {
        await expect(page.getByText('AI Recommendation', { exact: true })).toBeVisible({
          timeout: 15000,
        });
      }

      // ── Subject Performance ──
      // Real per-subject scores from the same ai-report endpoint the screen
      // calls (line 367-370); "No quiz data yet" is the real empty state,
      // not a broken widget, when a child has no scored quizzes.
      const aiReport = await request
        .get(`/parent/${encodeURIComponent(parentEmail)}/children/${child.id}/ai-report`)
        .then((r) => (r.ok() ? r.json() : null));
      const subjectPerf = aiReport?.subjectPerformance ?? [];
      if (subjectPerf.length === 0) {
        await expect(page.getByText('No quiz data yet', { exact: true })).toBeVisible({
          timeout: 15000,
        });
      } else {
        for (const sub of subjectPerf) {
          const subjectRow = page.getByText(sub.subject, { exact: true }).locator('xpath=../..');
          await expect(
            subjectRow.getByText(`${Math.round(sub.avgScore)}%`, { exact: true }),
          ).toBeVisible({ timeout: 15000 });
        }
      }

      // ── Learning Mood ──
      // Label/sub-text formula over the already-loaded child object.
      const mood = moodFor(child);
      await expect(page.getByText(mood.label, { exact: true })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(mood.sub, { exact: true })).toBeVisible();

      // ── Achievements ──
      // Only assert real, data-driven badges. When a child has none, the
      // screen falls back to a fixed placeholder set (line 886-889) that's
      // identical for every child - asserting it here would prove nothing
      // about per-child correctness, so it's intentionally skipped.
      const badges = realBadgesFor(child);
      for (const label of badges) {
        await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 15000 });
      }
    }
  });
});
