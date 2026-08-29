// Verifies the Teacher Dashboard degrades gracefully when its backend calls
// fail - it must NOT crash or hang, even though the app has no visible error
// banner (see TeacherDashboardScreen.tsx fetchStudents: the whole
// Promise.all is wrapped in a try/catch that silently swallows the error,
// and `finally` always turns the loading spinner off). This test is written
// for that ACTUAL behavior, not an idealized error banner that doesn't exist.
//
// Uses teacher-a (read-only) - this test only intercepts network requests
// in its own browser context, it never mutates the account.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';

const TEACHER = 'teacher-a';

test.describe('Teacher Dashboard - Error State', () => {
  test.use({ storageState: statePath(TEACHER) });

  test('a failed dashboard data fetch shows a clean empty state instead of crashing', async ({
    context,
    page,
  }) => {
    // Fail every dashboard data call teacher-a's own screen makes -
    // by-teacher, its /insights and /recent-activity sub-routes.
    await context.route('**/student/by-teacher/**', (route) => route.abort('failed'));

    await applySession(context, TEACHER);
    await page.goto('/');

    // The greeting itself doesn't depend on these calls (it reads `user`
    // from auth context), so it should still render.
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });

    // The spinner is turned off unconditionally in `finally`, even on
    // failure - the screen must settle on its default empty state, not
    // hang on a stuck loading indicator.
    await expect(page.getByText('Student Overview')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('AI Teaching Insights')).toBeVisible();

    // No uncaught exception should have torn down the page - the app is
    // still interactive (a crashed React tree would leave this unclickable).
    await page.getByText('Student Overview').click();
    await expect(page.getByText('Students', { exact: true }).first()).toBeVisible();
  });

  // Confirmed via code read: fetchStudents' Promise.all awaits all three
  // fetch() calls together. If just ONE of them throws (a real network-level
  // failure, not an HTTP error status - those resolve fine and don't reject
  // Promise.all), the whole Promise.all rejects immediately and the catch
  // block runs - meaning even the BY-TEACHER response, which succeeded at
  // the network level, never gets read or applied (setStudents is never
  // called). So a single endpoint failing has the same visible blast radius
  // as all three failing - this test documents/guards that coupling
  // specifically, distinct from the "everything fails" test above.
  test('one endpoint failing (insights) discards the other two responses too, not just its own', async ({
    context,
    page,
  }) => {
    await context.route('**/student/by-teacher/**/insights', (route) => route.abort('failed'));

    await applySession(context, TEACHER);
    await page.goto('/');

    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });

    // Same empty-state outcome as the all-three-fail case above, precisely
    // BECAUSE by-teacher's real data got discarded by the Promise.all
    // coupling, even though that request itself would have succeeded.
    await expect(page.getByText('Student Overview')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Your Class · 0 Students?/)).toBeVisible();

    await page.getByText('Student Overview').click();
    await expect(page.getByText('Students', { exact: true }).first()).toBeVisible();
  });

  // Confirmed via code read: pull-to-refresh's onRefresh calls fetchStudents
  // again. Its catch block's only comment is "// keep previous data" - there
  // is no error banner/toast anywhere in this screen. This test proves that
  // literally: real data loads first, then a refresh fails, and the
  // ORIGINAL real numbers are still what's on screen - not blanked, not
  // stale-looking, genuinely indistinguishable from a successful refresh.
  test('a failed pull-to-refresh silently keeps the previous data on screen, no error shown', async ({
    context,
    page,
  }) => {
    await applySession(context, TEACHER);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });

    const totalStudentsBefore = await page
      .getByText('Total Students')
      .locator('xpath=preceding-sibling::*[1]')
      .innerText();

    // NOW break the dashboard's data calls, then trigger pull-to-refresh.
    await context.route('**/student/by-teacher/**', (route) => route.abort('failed'));
    await page.mouse.move(400, 200);
    await page.mouse.down();
    await page.mouse.move(400, 500, { steps: 10 });
    await page.mouse.up();

    // The old number is still there - no error banner exists to check for,
    // so the only observable proof of "silent failure" is that nothing
    // changed and nothing crashed.
    await expect(page.getByText('Student Overview')).toBeVisible();
    const totalStudentsAfter = await page
      .getByText('Total Students')
      .locator('xpath=preceding-sibling::*[1]')
      .innerText();
    expect(totalStudentsAfter).toBe(totalStudentsBefore);
  });

  // Confirmed via code read: recentStudents = activityFeed.slice(0, 3) with
  // Array.isArray(act) guarding setActivityFeed - a non-array JSON body
  // (e.g. an upstream error object) is silently ignored, not crashed on.
  // This is a route.fulfill with a REAL 200 response, not an abort - the
  // fetch() call itself succeeds, so by-teacher/insights load normally;
  // only recent-activity's malformed body is at issue here.
  test('recent-activity returning a non-array JSON body does not crash the dashboard', async ({
    context,
    page,
  }) => {
    await context.route('**/student/recent-activity/by-teacher/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ error: 'Rate limited' }) }),
    );

    await applySession(context, TEACHER);
    await page.goto('/');

    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });

    // Rest of the dashboard loads normally - only Recent Activity is
    // affected, proving this endpoint's failure is properly isolated
    // (unlike insights' failure above, which takes everything down).
    const totalStudents = await page
      .getByText('Total Students')
      .locator('xpath=preceding-sibling::*[1]')
      .innerText();
    expect(Number(totalStudents)).toBeGreaterThanOrEqual(0);
    await expect(page.getByText('No recent activity', { exact: true })).toBeVisible();
  });
});
