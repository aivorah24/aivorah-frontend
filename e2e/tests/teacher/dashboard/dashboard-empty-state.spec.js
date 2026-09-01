// Verifies the Teacher Dashboard doesn't break when a teacher has ZERO
// students linked (a genuinely new/unassigned teacher account).
//
// Uses teacher-b - confirmed to have no TEACHER_LINKS entry in
// seed-e2e-suite.js, so GET /student/by-teacher/:id returns [] and
// GET /student/by-teacher/:id/insights returns { assignments: [], challenges: [] }
// with no `totals` key at all. This spec only READS teacher-b's dashboard,
// so it's safe to share with teacher-b's other (mutating) owner spec.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';

const TEACHER = 'teacher-b';

test.describe('Teacher Dashboard - Empty State', () => {
  test.use({ storageState: statePath(TEACHER) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, TEACHER);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('a teacher with zero students sees a clean empty state, not a crash', async ({ page }) => {
    await expect(page.getByText('Your Class · 0 Students', { exact: true })).toBeVisible();

    // Student Overview's big number must be a real 0, not blank/NaN.
    const totalStudents = await page
      .getByText('Total Students')
      .locator('xpath=preceding-sibling::*[1]')
      .innerText();
    expect(totalStudents.trim()).toBe('0');

    await expect(page.getByText('No recent activity', { exact: true })).toBeVisible();

    // AI Suggested Action falls back to onboarding copy when there's no
    // class data at all (allNeedsAttention.length === 0 && avgProgress === 0).
    await expect(page.getByText('Create First Assignment', { exact: true })).toBeVisible();

    // Insight tiles show their zero-activity placeholder titles, not errors.
    await expect(page.getByText('No Data Yet', { exact: true })).toBeVisible();
    await expect(page.getByText('No Challenges Yet', { exact: true })).toBeVisible();
  });

  test('Student Overview still navigates to an empty Students screen', async ({ page }) => {
    await page.getByText('Student Overview').click();
    await expect(page.getByText('Students', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('0 enrolled', { exact: true })).toBeVisible();
  });
});
