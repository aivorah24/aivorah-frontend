// Feature: Parent Dashboard Achievements - proves each badge actually
// UNLOCKS (child starts with none -> real activity pushes them past the
// threshold -> badge appears), not just that a badge label can be found
// somewhere on screen.
//
// Thresholds confirmed via code read (ParentDashboardScreen.tsx line
// 406-411):
//   5 Day Streak  -> currentStreak >= 5
//   Fast Learner  -> completedTopics.length >= 3
//   Reading Star  -> assignmentsDone >= 1
//   1000 XP       -> xpPoints >= 1000
//
// IMPORTANT real limitation found while reading the same code: the badge
// grid only renders `badges.slice(0, 3)` (line 875) - the FIRST 3 earned
// badges in that fixed array order. If a child earns all 4, "1000 XP" (last
// in the array) never displays, even though it's genuinely earned. This
// test proves that directly (stage 5 below) instead of silently ignoring
// it - it's a real product gap, not a test bug.
//
// Fast Learner is driven through the real POST /complete-lesson endpoint
// (completedTopics grows atomically there). The other three fields are
// never incremented by any other real endpoint (confirmed via code read -
// nothing writes assignments_done or current_streak outside this route and
// seed scripts), so they're set via PUT /student/:id - the same full-
// stats-sync call the app's own client tabs make whenever local state
// changes. Not a shortcut invented for this test.
//
// Uses parent-g / student-parent-g - dedicated mutable pair (see OWNERSHIP
// in accounts.js), separate from every other spec's account so parallel
// runs never collide on the same student_stats row.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';
import { accountFor } from '../../../helpers/accounts.js';
import { getChildIdByParentEmail, completeLesson, setStudentStats } from '../../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../../helpers/dismissAnnouncement.js';

const PARENT = 'parent-g';
const STUDENT = 'student-parent-g';

async function reloadAndGetAchievements(page) {
  await page.reload();
  await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
  await expect(page.getByText('Achievements', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  });
}

test.describe('Parent Dashboard - Achievements unlock', () => {
  test.use({ storageState: statePath(PARENT) });

  test('badges unlock one real threshold at a time, and the 4th earned badge is hidden by the 3-badge display cap', async ({
    context,
    page,
    request,
  }) => {
    const parentEmail = accountFor(PARENT).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getChildIdByParentEmail(request, {
      parentEmail,
      childEmail: studentEmail,
    });

    // Reset the 3 fields that have a real reset path (PUT /student/:id
    // explicitly excludes completed_topics - see setStudentStats' comment -
    // so Fast Learner's completedTopics.length >= 3 can never be un-earned
    // once this account has run once; that's fine, Stage 1 below doesn't
    // depend on it starting at 0, see its own comment).
    //
    // Deliberately NOT using GET /student/:id here - that endpoint has a
    // day-rollover side effect that recalculates current_streak on every
    // read (routes/student.js line 379-399), which would silently undo
    // this exact reset if last_active_date isn't today. The children-list
    // endpoint used throughout this suite doesn't have that side effect.
    await setStudentStats(request, studentId, {
      assignmentsDone: 0,
      currentStreak: 0,
      xpPoints: 0,
    });

    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);
    await expect(page.getByText('Achievements', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });

    // ── Stage 0: only '1000 XP' is checked here. With zero real badges,
    // the screen falls back to a FIXED placeholder set (line 886-889) whose
    // labels are '5 Day\nStreak' / 'Fast\nLearner' / 'Reading\nStar' -
    // Playwright's text matching collapses the \n to a space, so those
    // placeholders are textually IDENTICAL to the real badge text and would
    // false-positive an "absent" check. '1000 XP' has no placeholder
    // equivalent, so it's the only label safely checkable here. ──
    await expect(page.getByText('1000 XP', { exact: true })).toHaveCount(0);

    // ── Stage 1: 3 distinct real topic completions -> Fast Learner only ──
    await completeLesson(request, studentId, {
      topic: 'e2e-achv-topic-1',
      subject: 'Mathematics',
      grade: 'Grade 4',
      curriculum: 'NCERT',
    });
    await completeLesson(request, studentId, {
      topic: 'e2e-achv-topic-2',
      subject: 'Mathematics',
      grade: 'Grade 4',
      curriculum: 'NCERT',
    });
    await completeLesson(request, studentId, {
      topic: 'e2e-achv-topic-3',
      subject: 'Mathematics',
      grade: 'Grade 4',
      curriculum: 'NCERT',
    });
    await reloadAndGetAchievements(page);
    await expect(page.getByText('Fast Learner', { exact: true })).toBeVisible();
    await expect(page.getByText('Reading Star', { exact: true })).toHaveCount(0);
    await expect(page.getByText('5 Day Streak', { exact: true })).toHaveCount(0);
    await expect(page.getByText('1000 XP', { exact: true })).toHaveCount(0);

    // ── Stage 2: +1 assignment done -> Reading Star also unlocks ──
    await setStudentStats(request, studentId, { assignmentsDone: 1 });
    await reloadAndGetAchievements(page);
    await expect(page.getByText('Fast Learner', { exact: true })).toBeVisible();
    await expect(page.getByText('Reading Star', { exact: true })).toBeVisible();
    await expect(page.getByText('5 Day Streak', { exact: true })).toHaveCount(0);
    await expect(page.getByText('1000 XP', { exact: true })).toHaveCount(0);

    // ── Stage 3: +5-day streak -> 5 Day Streak also unlocks (now 3/3 shown) ──
    await setStudentStats(request, studentId, { currentStreak: 5 });
    await reloadAndGetAchievements(page);
    await expect(page.getByText('5 Day Streak', { exact: true })).toBeVisible();
    await expect(page.getByText('Fast Learner', { exact: true })).toBeVisible();
    await expect(page.getByText('Reading Star', { exact: true })).toBeVisible();
    await expect(page.getByText('1000 XP', { exact: true })).toHaveCount(0);

    // ── Stage 4: +1000 XP -> genuinely earned, but the grid caps at the
    // first 3 badges (array order: Streak, Fast Learner, Reading Star, XP),
    // so "1000 XP" still does NOT appear. This is the real product gap
    // flagged in the file header, proven directly rather than assumed. ──
    await setStudentStats(request, studentId, { xpPoints: 1000 });
    await reloadAndGetAchievements(page);
    await expect(page.getByText('5 Day Streak', { exact: true })).toBeVisible();
    await expect(page.getByText('Fast Learner', { exact: true })).toBeVisible();
    await expect(page.getByText('Reading Star', { exact: true })).toBeVisible();
    await expect(
      page.getByText('1000 XP', { exact: true }),
      '1000 XP is earned (xpPoints >= 1000) but hidden by the badges.slice(0, 3) cap - see file header',
    ).toHaveCount(0);
  });
});
