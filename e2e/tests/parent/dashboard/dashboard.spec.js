// Feature: Parent Dashboard shell - the page a parent lands on right after
// logging in: alert banner routing, "Add Child" routing, and "View Detailed
// Report" routing. Child-switching data correctness lives in its own
// feature folder (../child-switching/) since it needs a 2-children account
// and is a distinct capability from simple page-level routing.
//
// Uses parent-a - read-only, so any number of tests/specs can share it.
// See tests/helpers/accounts.js.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';

const ACCOUNT = 'parent-a';

test.describe('Parent Dashboard', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('shows the core dashboard sections with real data', async ({ page }) => {
    await expect(page.getByText('My Children', { exact: true })).toBeVisible();
    await expect(page.getByText('Add Child', { exact: true })).toBeVisible();
    await expect(page.getByText('AI Weekly Insight', { exact: true })).toBeVisible();
    await expect(page.getByText('Weekly Progress', { exact: true })).toBeVisible();
    await expect(page.getByText('Weekly Snapshot', { exact: false })).toBeVisible();
    await expect(page.getByText('Activity Overview', { exact: true })).toBeVisible();
    await expect(page.getByText('Learning Highlights', { exact: true })).toBeVisible();
    await expect(page.getByText('Subject Performance', { exact: true })).toBeVisible();
    await expect(page.getByText('Learning Mood', { exact: true })).toBeVisible();
    await expect(page.getByText('Achievements', { exact: true })).toBeVisible();
  });

  // "Add Child" navigates to ParentMyKidsScreen (confirmed in code, line
  // ~463/478 of ParentDashboardScreen.tsx) - a real screen navigation, not a
  // modal on the dashboard itself. That screen opens its OWN "create/link
  // child" modal internally, out of scope for this test.
  test('clicking Add Child navigates to My Kids', async ({ page }) => {
    await page.getByText('Add Child', { exact: true }).click();
    await expect(page.getByText('My Kids', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
  });

  // Two "View Detailed Report" buttons exist (AI Weekly Insight CTA and
  // Subject Performance footer) - both navigate to ParentAIReports with the
  // selected child's id (confirmed in code). Using .first() for the AI
  // Weekly Insight one.
  test('clicking View Detailed Report navigates to the AI Progress Report', async ({ page }) => {
    await page.getByText('View Detailed Report', { exact: true }).first().click();
    // ParentAIReportsScreen's Header title - confirmed in code. 33 matches
    // exist on this screen (mobile/desktop duplicate layout, same known
    // issue documented across the teacher specs) - scope to visible ones.
    await expect(
      page.getByText('AI Progress Report', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // The alert banner (unread assignments/messages) is deliberately NOT
  // tested here with a conditional skip - a real, deterministic version of
  // this test (inject an unread message via the API, assert the banner
  // appears and routes) lives in
  // ../weekly-snapshot/weekly-snapshot.spec.js, using the mutable parent-f
  // account. It only covers the MESSAGE branch: confirmed via code read
  // (routes/messages.js notifications-summary, "Assignment notifications
  // are for STUDENTS only... parents are notified via real messages") that
  // a parent's unreadAssignments count can never be > 0 - the assignment
  // branch of this banner is unreachable for a parent account, not just
  // untested.
});
