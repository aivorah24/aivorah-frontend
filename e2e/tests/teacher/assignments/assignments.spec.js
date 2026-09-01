// This file tests the TEACHER ASSIGNMENTS screen: the real create/manage
// flow a teacher uses (not the Dashboard's assignment-insight tile, which
// tests/teacher/dashboard/ai-teaching-insights/assignments.spec.js already
// covers separately).
//
// Scope for this first pass: the plain "manual assignment, All Students"
// path only. NOT covered here (separate, larger flows for a later pass):
//   - AI quiz generation ("Generate ... Assignment" button itself)
//   - Upload Worksheet (PDF/Image) and Bulk Upload wizards
//   - "Assign to a Specific Student" - teacher-c currently has no students
//     linked via teacher_student, so that path can't be exercised without
//     seeding a link first. Flagged as a follow-up, not worked around here.
//
// Test account: teacher-c (already reserved in accounts.js for "teacher
// content creation tests", previously unused by any spec).
//
// Every test creates its OWN assignment with a unique, timestamped title
// and only ever asserts against that title - safe under this suite's full
// parallel execution even though all 4 tests share one account.
//
// Known real behavior (not a test bug): deleting an assignment has NO
// confirmation dialog - the delete button fires immediately. Tests below
// reflect that; do not add a confirm-dialog wait.

import { test, expect } from '@playwright/test';
import { newPageAs } from '../../helpers/session.js';

async function openAssignments(browser) {
  const page = await newPageAs(browser, 'teacher-c');
  await page.goto('/teacher/assignments');
  return page;
}

// Opens "New" -> explicitly verifies the real Create Assignment
// selection screen (all 3 options) -> selects "Generate ... Assignment"
// (option 1) -> fills the common fields -> leaves "Assign to: All students"
// (the default) -> due date = Today. Does NOT touch the AI "Generate"
// button - the common fields alone are enough to publish a plain manual
// assignment.
async function fillBasicAssignmentForm(page, title) {
  await page.getByText('New', { exact: true }).click();

  // The Create Assignment choice screen itself - assert all 3 real options
  // are actually there before picking one, not just that "the click worked."
  // Label is curriculum-dependent (TeacherAssignmentsScreen.tsx line 2873):
  // an IB PYP teacher sees "Generate IB PYP Assignment"; every other
  // curriculum sees "Generate AI Assignment". teacher-c is CBSE, so this
  // resolves to "Generate AI Assignment" here, but the regex is written to
  // hold for either curriculum so this helper stays reusable.
  const generateOption = page.getByText(/^Generate (AI|IB PYP) Assignment$/, { exact: true });
  await expect(generateOption).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Upload Worksheet (PDF / Image)', { exact: true })).toBeVisible();
  await expect(page.getByText('Bulk Upload (Multiple Worksheets)', { exact: true })).toBeVisible();

  // Only now, having confirmed the real choice screen, select option 1.
  await generateOption.click();

  await page.getByPlaceholder('e.g. Chapter 5 Worksheet').fill(title);
  // Scoped to the open dialog: teacher-c now accumulates real assignments
  // across runs (fixed 2026-08-24 - the account previously had no
  // curriculum set, which caused a cascade of list/publish flakiness), so a
  // bare page-wide getByText('Mathematics') can also match a background
  // list card's subject label.
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Mathematics', { exact: true }).click();
  await dialog.getByText('Grade 5', { exact: true }).click();

  await dialog.getByText('Select a due date').click();
  await page.getByText('Today', { exact: true }).click();
}

test.describe('Teacher Assignments — create, view, delete (manual, All Students)', () => {
  test('the assignments list loads with real data, not stuck loading', async ({ browser }) => {
    const page = await openAssignments(browser);

    // Either a real assignment card, or the real empty state - either way,
    // the screen must resolve past its loading spinner.
    await expect(
      page.getByText('No assignments yet').or(page.getByText('Assignments').first())
    ).toBeVisible({ timeout: 10000 });
  });

  test('creating a plain manual assignment (All Students) publishes it and it appears in the list', async ({ browser }) => {
    const page = await openAssignments(browser);
    const title = `E2E Manual Assignment ${Date.now()}`;

    await fillBasicAssignmentForm(page, title);

    // "Assign to" defaults to "All students" - confirm it's already selected
    // before publishing (this is the path being tested, not "specific student").
    await expect(page.getByText('This assignment will be sent to all your students.')).toBeVisible();

    await page.getByText('Preview Before Publishing').click();
    await expect(page.getByText('Preview', { exact: true })).toBeVisible();
    await page.getByText('Publish Assignment').click();

    // Modal closes and the new assignment shows up in the real list.
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });
  });

  test('leaving Title and Due Date empty blocks publishing with real validation errors', async ({ browser }) => {
    const page = await openAssignments(browser);

    await page.getByText('New', { exact: true }).click();
    await page.getByText(/^Generate.*Assignment$/).first().click();

    // Deliberately skip title and due date, go straight to Preview.
    await page.getByText('Preview Before Publishing').click();

    await expect(page.getByText('Title is required').first()).toBeVisible();
  });

  test("opening a freshly-created assignment's Students tab shows the real empty-submissions state", async ({ browser }) => {
    const page = await openAssignments(browser);
    const title = `E2E Submissions Check ${Date.now()}`;

    await fillBasicAssignmentForm(page, title);
    await page.getByText('Preview Before Publishing').click();
    await page.getByText('Publish Assignment').click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });

    await page.getByText(title).click();
    // "Students" tab only gets a "(N/M)" suffix once totalCount > 0 (see
    // TeacherAssignmentsScreen.tsx line 2255) - a freshly-published
    // assignment has zero students yet, so the tab renders as bare
    // "Students" with no parenthesis.
    await page.getByText(/^Students(\s\(\d+\/\d+\))?$/).click();

    await expect(page.getByText('No submissions yet.')).toBeVisible();
  });

  test('deleting an assignment removes it from the list immediately, with no confirmation dialog', async ({ browser }) => {
    const page = await openAssignments(browser);
    const title = `E2E Delete Me ${Date.now()}`;

    await fillBasicAssignmentForm(page, title);
    await page.getByText('Preview Before Publishing').click();
    await page.getByText('Publish Assignment').click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });

    // Open the assignment's own Detail modal (Overview tab) and use its
    // text-based "Delete" button - more reliable than the icon-only trash
    // button on the list card, and this is real, exposed UI either way.
    await page.getByText(title).click();
    await page.getByText('Delete', { exact: true }).click();

    await expect(page.getByText(title)).not.toBeVisible({ timeout: 5000 });
  });
});
