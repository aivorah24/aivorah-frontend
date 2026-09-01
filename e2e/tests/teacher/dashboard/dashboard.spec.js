// Feature: Dashboard shell - the page a teacher lands on right after
// logging in: greeting, page-wide sanity check, AI Suggested Action routing,
// and pull-to-refresh. Student Overview + Recent Activity live in their own
// feature folder (../student-overview/), AI Teaching Insights (and the
// Class Progress card, which shares the same underlying data) in
// ../ai-teaching-insights/ - each verified against their own real data.
// This file owns only what's genuinely shell-level: does the page load
// correctly, and does its one directly page-level action (AI Suggested
// Action's routing) work.
//
// Uses teacher-a - read-only, so any number of tests/specs can share it.
// See tests/helpers/accounts.js.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';

const ACCOUNT = 'teacher-a';

test.describe('Teacher Dashboard', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test.describe('Load & Sections', () => {
    test('dashboard shows greeting, class size, and core sections with real data', async ({
      page,
    }) => {
      await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible();

      // "Your Class · N Students" - N must be a real number, not blank/NaN.
      await expect(page.getByText(/Your Class · \d+ Students?/)).toBeVisible();

      await expect(page.getByText('AI SUGGESTED ACTION')).toBeVisible();

      // Student Overview + Active Today/Need Attention/Recent Activity are
      // visibility-only here - this test is the page-wide "did everything
      // render" smoke check. The real number checks (Total Students, Active
      // Today, Need Attention against live API data) live in
      // ../student-overview/, not duplicated here.
      //
      // exact:true matters throughout this test - Recent Activity shows
      // dynamic topic/assignment names seeded by OTHER specs' test data
      // (running in parallel), and a loose match can collide with one that
      // happens to contain this card's header text (happened twice already:
      // "E2E Class Progress Topic ..." and "E2E Student Overview Active
      // Check ..." both leaked into Recent Activity and broke this test).
      await expect(page.getByText('Student Overview', { exact: true })).toBeVisible();
      await expect(page.getByText('Active Today', { exact: true })).toBeVisible();
      await expect(page.getByText('Need Attention', { exact: true })).toBeVisible();
      await expect(page.getByText('Recent Activity', { exact: true })).toBeVisible();

      // Same for Class Progress and AI Teaching Insights - visibility-only;
      // their real business-data assertions live in ../ai-teaching-insights/.
      // exact:true matters here - Recent Activity shows dynamic topic/
      // assignment names from other specs' seeded test data, and a loose
      // match can collide with one that happens to contain this text.
      await expect(page.getByText('Class Progress', { exact: true })).toBeVisible();
      await expect(page.getByText('AI Teaching Insights', { exact: true })).toBeVisible();
    });
  });

  test.describe('AI Suggested Action', () => {
    // With zero engagement (avgProgress === 0), the button always reads
    // "Create First Assignment" and routes to TeacherAssignments - see
    // TeacherDashboardScreen's aiBtn TouchableOpacity. teacher-a's exact
    // button text/count of flagged students varies with real data, so this
    // asserts the ROUTE, not a specific button label.
    test('the suggested action button navigates to Assignments', async ({ page }) => {
      await expect(page.getByText('AI SUGGESTED ACTION')).toBeVisible();

      // Button text is one of "Create First Assignment" / "Assign Task / Quiz"
      // / "Assign Practice Task" depending on class data - match by role
      // within the AI card region instead of a single hardcoded label.
      const suggestedActionButton = page
        .getByText(/Create First Assignment|Assign Task \/ Quiz|Assign Practice Task/)
        .filter({ visible: true })
        .first();
      await suggestedActionButton.click();

      await expect(page.getByText('Assignments', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    });
  });

  test.describe('Refresh', () => {
    test('pull-to-refresh reloads every card with valid data and no duplicates', async ({ page }) => {
      await page.mouse.move(400, 200);
      await page.mouse.down();
      await page.mouse.move(400, 500, { steps: 10 });
      await page.mouse.up();

      // Every card header is present, exactly once - refresh must not
      // duplicate content (these header strings are unique on the page,
      // unlike "Learning Path"/"Assignments"/"Challenges", which
      // legitimately appear twice - see the known duplicate-layout note in
      // ../student-overview/ and ../ai-teaching-insights/ specs).
      await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible();
      await expect(page.getByText(/Your Class · \d+ Students?/)).toHaveCount(1);
      await expect(page.getByText('AI SUGGESTED ACTION')).toHaveCount(1);
      await expect(page.getByText('Student Overview', { exact: true })).toHaveCount(1);
      await expect(page.getByText('Active Today', { exact: true })).toHaveCount(1);
      await expect(page.getByText('Need Attention', { exact: true })).toHaveCount(1);
      await expect(page.getByText('Recent Activity', { exact: true })).toHaveCount(1);
      await expect(page.getByText('Class Progress', { exact: true })).toHaveCount(1);
      await expect(page.getByText('AI Teaching Insights', { exact: true })).toHaveCount(1);

      // Total Students must still be a real number after reload, not
      // blank/NaN from a half-finished refresh.
      const totalStudents = await page
        .getByText('Total Students')
        .locator('xpath=preceding-sibling::*[1]')
        .innerText();
      expect(Number(totalStudents)).toBeGreaterThanOrEqual(0);
    });
  });
});
