// Feature: Parent Dashboard child switching - verifies that selecting a
// different child in "My Children" actually re-renders the WEEKLY SNAPSHOT
// group (Learning Journey, Mission Progress, Growth Points, Attendance)
// with THAT child's real data, not mock/stale/stuck-on-previous-child data.
//
// The rest of the dashboard (Activity Overview graph, Learning Highlights,
// Subject Performance, Learning Mood, Achievements) is covered separately
// in tests/parent/dashboard/activity-overview/activity-overview.spec.js -
// split out because that group depends on different async fetches
// (weekly/ai-report/attendance endpoints) than this one.
//
// Confirmed via code read (ParentDashboardScreen.tsx): clicking a ChildCard
// calls setSelectedChild(ch) (line 473). Nothing on this screen is
// hardcoded - the Weekly Snapshot heading, Learning Journey, Mission
// Progress, Growth Points (XP), and Attendance card all read directly from
// the selected child's object / its per-child fetches. This test proves the
// switch is genuine by comparing against that same live API data for TWO
// different children, not by assuming the UI is correct.
//
// Uses parent-e - read-only, the only account linked to two children
// (student-a and student-b, already distinct: different grade/curriculum,
// so different XP/stats too) - see OWNERSHIP notes in accounts.js.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';
import { accountFor } from '../../../helpers/accounts.js';
import { dismissAnnouncementIfPresent } from '../../../helpers/dismissAnnouncement.js';
import { assertAttendanceStat } from '../../../helpers/assertAttendanceStat.js';

// Mirrors formatStudyTime() in ParentDashboardScreen.tsx - Learning Journey's
// value and the Attendance card's numbers are plain integers, but Learning
// Journey renders minutes through this exact formatter, not a raw number.
function formatStudyTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Mirrors the "Top Interest" derivation (ParentDashboardScreen.tsx
// line 493-501): most-frequent subject prefix across completedTopics
// ("subject|topic" strings), falling back to lastLesson's subject, then
// the literal string 'Learning'.
function topSubjectFor(child) {
  const counts = {};
  (child.completedTopics ?? []).forEach((t) => {
    const sub = t.split('|')[0] || t;
    counts[sub] = (counts[sub] ?? 0) + 1;
  });
  const bySubject = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return (
    bySubject || (child.lastLesson ? child.lastLesson.split('·')[0]?.trim() : null) || 'Learning'
  );
}

// Mirrors "Learning Style" (line 503).
function learnerTypeFor(child) {
  if (child.currentStreak >= 5) return 'Consistent Learner';
  if (child.studyTimeMinutes >= 120) return 'Deep Explorer';
  if (child.assignmentsDone >= 3) return 'Assignment Star';
  return 'Getting Started';
}

// Mirrors "Study Time" chip text (line 506-508).
function studyHintFor(child) {
  const mins = child.studyTimeMinutes ?? 0;
  if (mins >= 60) return `${Math.round(mins / 60)}h logged this month`;
  if (mins > 0) return `${mins}m logged so far`;
  return 'No sessions yet';
}

// Mirrors the AI Weekly Insight's topic (line 403): lastLesson, else the
// most recently completed topic, else the literal fallback string.
function insightTopicFor(child) {
  const topics = child.completedTopics ?? [];
  return child.lastLesson || topics[topics.length - 1] || 'Learning Basics';
}

const ACCOUNT = 'parent-e';

test.describe('Parent Dashboard - Child Switching', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test("switching the selected child updates the Weekly Snapshot and Growth Points to that child's real data", async ({
    context,
    page,
    request,
  }) => {
    const parentEmail = accountFor(ACCOUNT).email;
    // Read-only expected-value lookup: parent-e is a shared read-only
    // account (see file header), so this is the only reliable source for
    // each child's real name/XP/streak/etc. to compare the UI against -
    // never mutated, never asserted on directly as the test outcome.
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
      // Re-check right before each click - under parallel load the banner
      // can appear later than the first check window (see
      // dismissAnnouncement.js's comment on why this isn't a one-shot check).
      await dismissAnnouncementIfPresent(page, { timeout: 1000 });
      await page.getByText(child.name, { exact: true }).filter({ visible: true }).first().click();

      // The Weekly Snapshot heading embeds the selected child's name
      // directly ("{child.name}'s Weekly Snapshot") - if switching were
      // stuck/mocked, this would still show the previous child's name.
      await expect(
        page
          .getByText(`${child.name}'s Weekly Snapshot`, { exact: true })
          .filter({ visible: true })
          .first(),
      ).toBeVisible({ timeout: 15000 });

      // Growth Points renders child.xpPoints.toLocaleString() exactly
      // (ParentDashboardScreen.tsx line 649) - a real value check against
      // the same API data the app itself uses, not a guessed number.
      const growthPointsTile = page
        .getByText('Growth Points', { exact: true })
        .locator('xpath=../..');
      await expect(
        growthPointsTile.getByText(child.xpPoints.toLocaleString(), { exact: true }),
      ).toBeVisible({ timeout: 15000 });

      // Learning Journey renders formatStudyTime(child.studyTimeMinutes)
      // (line 613/395) - same statCard structure/scoping as Growth Points.
      const learningJourneyTile = page
        .getByText('Learning Journey', { exact: true })
        .locator('xpath=../..');
      await expect(
        learningJourneyTile.getByText(formatStudyTime(child.studyTimeMinutes), { exact: true }),
      ).toBeVisible({ timeout: 15000 });

      // Mission Progress renders "{completedTopics.length} / {totalTopics}"
      // when totalTopics > 0, else "{completedTopics.length} topics"
      // (line 396-397, 627) - both fields already come from the same
      // /parent/{email}/children response, no extra fetch needed.
      const tasksDone = child.completedTopics.length;
      const tasksTotal = child.totalTopics && child.totalTopics > 0 ? child.totalTopics : null;
      const missionProgressText = tasksTotal
        ? `${tasksDone} / ${tasksTotal}`
        : `${tasksDone} topics`;
      const missionProgressTile = page
        .getByText('Mission Progress', { exact: true })
        .locator('xpath=../..');
      await expect(missionProgressTile.getByText(missionProgressText, { exact: true })).toBeVisible(
        { timeout: 15000 },
      );

      // Attendance card is B2B-only (isB2B = !!user.schoolId) and fetched
      // per-child from /attendance/student/{id}/summary (line 374) - parent-e
      // and both children are seeded under school TSRA, so it always renders.
      const attendance = await request
        .get(`/attendance/student/${child.id}/summary`)
        .then((r) => (r.ok() ? r.json() : null));
      if (attendance?.summary) {
        await expect(
          page.getByText(`Overall attendance: ${attendance.summary.ratePct}%`, { exact: true }),
        ).toBeVisible({ timeout: 15000 });
        // Present/Absent/Late/Total Days can share the same value (e.g. all
        // 0), so a bare number search inside the card matches more than one
        // element - scope to each stat's OWN label (they're direct siblings
        // inside the same miniStatItem View) instead.
        await assertAttendanceStat(page, 'Present', attendance.summary.present);
        await assertAttendanceStat(page, 'Absent', attendance.summary.absent);
        await assertAttendanceStat(page, 'Late', attendance.summary.late);
        await assertAttendanceStat(page, 'Total Days', attendance.summary.total);
      }

      // Insight chips (Top Interest / Learning Style / Study Time) and the
      // AI Weekly Insight card sit in the same top row as "My Children" and
      // are also derived straight from the already-loaded child object
      // (line 486-598) - no extra fetch, so they should switch just as
      // immediately as the cards themselves.
      const topInterestTile = page
        .getByText('Top Interest', { exact: true })
        .locator('xpath=../..');
      await expect(topInterestTile.getByText(topSubjectFor(child), { exact: true })).toBeVisible({
        timeout: 15000,
      });

      const learningStyleTile = page
        .getByText('Learning Style', { exact: true })
        .locator('xpath=../..');
      await expect(
        learningStyleTile.getByText(learnerTypeFor(child), { exact: true }),
      ).toBeVisible();

      const studyTimeTile = page.getByText('Study Time', { exact: true }).locator('xpath=../..');
      await expect(studyTimeTile.getByText(studyHintFor(child), { exact: true })).toBeVisible();

      // AI Weekly Insight headline: "{child.name} is progressing well in
      // {insightTopic}." (line 552-556) - built from 3 separate <Text>
      // nodes, so match the whole sentence rather than one exact leaf.
      const insightTopic = insightTopicFor(child);
      await expect(
        page.getByText(`${child.name} is progressing well in ${insightTopic}.`, { exact: false }),
      ).toBeVisible({ timeout: 15000 });
      // "Today's Recommendation" quotes the same topic (line 577-585).
      await expect(page.getByText(`"${insightTopic}"`, { exact: true })).toBeVisible();
      // Second bullet depends on real assignment activity (line 567-569).
      await expect(
        page.getByText(
          child.assignmentsDone > 0 ? 'Assignments completed on time' : 'Exploring learning paths',
          { exact: true },
        ),
      ).toBeVisible();
    }
  });

  // Real bug found via code read (ParentAIReportsScreen.tsx line 42-59):
  // the effect that loads a report for the childId passed via navigation
  // params only depends on [parentEmail], NOT on the incoming childId. The
  // FIRST time this screen mounts it correctly loads whichever child was
  // passed in - but React Navigation reuses the same screen instance when
  // you navigate to it again, so a SECOND visit with a different childId
  // never re-runs the effect and the report silently keeps showing the
  // previous child's data. This is written as a real (non-skipped)
  // assertion of the CORRECT behavior, not a fixme - it's expected to fail
  // against the current code and pass once the missing dependency is added.
  test("viewing a second child's AI Progress Report after already viewing one shows the NEW child's data, not stale data", async ({
    context,
    page,
    request,
  }) => {
    const parentEmail = accountFor(ACCOUNT).email;
    // Read-only expected-value lookup (see the other test's comment above).
    const children = await request
      .get(`/parent/${encodeURIComponent(parentEmail)}/children`)
      .then((r) => r.json());
    expect(children.length, 'expected parent-e to have 2 linked children').toBeGreaterThanOrEqual(
      2,
    );
    const [childA, childB] = children;

    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    // View child A's report first.
    await page.getByText(childA.name, { exact: true }).filter({ visible: true }).first().click();
    await page
      .getByText('View Detailed Report', { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      page.getByText('AI Progress Report', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(childA.name, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Go back to the dashboard, switch to child B, view the report again -
    // this is the exact real-world flow a parent checking on both kids
    // would do.
    await page.goBack();
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page, { timeout: 1000 });
    await page.getByText(childB.name, { exact: true }).filter({ visible: true }).first().click();
    await page
      .getByText('View Detailed Report', { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      page.getByText('AI Progress Report', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });

    // This is the real assertion under test: the report must now show
    // child B's data, not child A's leftover report.
    await expect(
      page.getByText(childB.name, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
