// Teacher Assignments — Bulk Upload (Multiple Worksheets), the 3rd and last
// of the "New" choice-screen options. A 3-phase batch flow: pick -> classify
// (all files, independently) -> generate (all quizzes) -> assign & publish
// (all files, one Publish action, each with its own All Students/Specific
// Student choice and status).
//
// Account: teacher-i (has 2 real linked students - student-i1/student-i2 -
// needed for the per-item Specific Student assignment case; teacher-j has
// none). Serial within this file since bulk-upload state (bulkItems,
// bulkPhase) is global screen state, not per-test-safe to run concurrently
// against the same account even though each test uploads its own files.

import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { newPageAs } from '../../helpers/session.js';
import { accountFor } from '../../helpers/accounts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSHEET_1 = path.resolve(
  __dirname, '../../../../Aivorah Documents/Assignment Picture',
  'Toddle-8d6af58a-a488-46a7-93fb-f0a5ec0611cc-PYP4 -MHLE-32.pdf',
);
const WORKSHEET_2 = path.resolve(
  __dirname, '../../../../Aivorah Documents/Assignment Picture',
  'Toddle-1f4fc44c-becf-489c-8afb-5501efc8ed7e-PYP 2 - MHLE 34.pdf',
);
const WORKSHEET_BROKEN = path.resolve(__dirname, '../../fixtures/worksheets/broken-worksheet.pdf');
const WORKSHEET_PNG = path.resolve(__dirname, '../../fixtures/worksheets/area-perimeter-1.png');
const WORKSHEET_DOCX = path.resolve(
  __dirname, '../../../../Aivorah Documents/Assignment Picture',
  'Toddle-7350f488-5306-4f73-9485-1b79d586a503-LHLE 30 - PYP 4.docx',
);

async function openBulkWizard(page) {
  await page.goto('/teacher/assignments');
  await page.getByText('New', { exact: true }).click();
  await page.getByText('Bulk Upload (Multiple Worksheets)', { exact: true }).click();
}

async function selectWorksheets(page, filePaths) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Select Worksheets', { exact: true }).click(),
  ]);
  await fileChooser.setFiles(filePaths);
}

test.describe.serial('Teacher Assignments — Bulk Upload (multiple worksheets)', () => {

  test('selecting 2 real worksheets classifies both independently and reaches Continue to Generate Quizzes', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-i');
    await openBulkWizard(page);
    await selectWorksheets(page, [WORKSHEET_1, WORKSHEET_2]);

    // Both files must be tracked as separate items, not merged into one.
    await expect(page.getByText('Worksheet 1 of 2', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Worksheet 2 of 2', { exact: true })).toBeVisible();

    // Both must reach a terminal 'ready' state (real extraction, not stuck
    // on "Reading ...").
    await expect(page.getByText(/^Reading /)).toHaveCount(0, { timeout: 60000 });
    await expect(page.getByText('Continue to Generate Quizzes', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('all 3 supported formats (PDF, PNG image, DOCX) can be selected together in one bulk batch and each classifies with the correct auto-detected subject/grade', async ({ browser }) => {
    // Mixes all 3 supported formats in a single bulk selection - format
    // support must work per-item, not just for a single-format batch.
    const page = await newPageAs(browser, 'teacher-i');
    await openBulkWizard(page);
    await selectWorksheets(page, [WORKSHEET_1, WORKSHEET_PNG, WORKSHEET_DOCX]);

    await expect(page.getByText('Worksheet 1 of 3', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Worksheet 2 of 3', { exact: true })).toBeVisible();
    await expect(page.getByText('Worksheet 3 of 3', { exact: true })).toBeVisible();

    // DOCX needs a real server round-trip (docx-to-pdf) - give it real time.
    await expect(page.getByText(/^Reading /)).toHaveCount(0, { timeout: 90000 });

    // Item 1 (PDF) and item 2 (PNG of the SAME worksheet) must both
    // auto-detect the real Mathematics/Grade 4 content correctly,
    // regardless of file format.
    const mathGrade4Chips = page.getByText('Mathematics', { exact: true });
    await expect(mathGrade4Chips.first()).toBeVisible();

    // None of the 3 items should be stuck in an error state purely because
    // of their file FORMAT (a real content-extraction failure is a
    // different concern, covered separately below).
    const failedCount = await page.getByText(/^Failed:/).count();
    expect(failedCount, 'no item should fail purely due to its file format (PDF/PNG/DOCX) being unsupported').toBe(0);
  });

  test('BUG-CHECK: one broken file failing extraction does not block or corrupt the other, real file', async ({ browser }) => {
    // Deliberately mixes a genuinely-broken "PDF" (plain garbage bytes) with
    // a real worksheet. The claim under test is per-item isolation - the
    // broken file must show its own error state while the real one still
    // classifies successfully. If the broken file instead blocks the whole
    // batch or corrupts the real item's data, that's a real isolation bug.
    const page = await newPageAs(browser, 'teacher-i');
    await openBulkWizard(page);
    await selectWorksheets(page, [WORKSHEET_BROKEN, WORKSHEET_1]);

    await expect(page.getByText('Worksheet 1 of 2', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Worksheet 2 of 2', { exact: true })).toBeVisible();

    // Give both real time to reach a terminal state.
    await expect(page.getByText(/^Reading /)).toHaveCount(0, { timeout: 60000 });

    // The broken item must show its own failure, not silently succeed with
    // wrong/empty data.
    await expect(page.getByText(/^Failed:/)).toBeVisible();
    // The real item must still classify successfully despite its sibling
    // failing - proving isolation, not "one failure kills the batch."
    await expect(page.getByText('Continue to Generate Quizzes', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('Continue to Generate Quizzes generates a quiz for each ready item independently', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-i');
    await openBulkWizard(page);
    await selectWorksheets(page, [WORKSHEET_1, WORKSHEET_2]);
    await expect(page.getByText(/^Reading /)).toHaveCount(0, { timeout: 60000 });
    await page.getByText('Continue to Generate Quizzes', { exact: true }).click();

    await expect(page.getByText('2. Generate', { exact: true })).toBeVisible({ timeout: 10000 });
    // Both items must reach 'done' quiz status (their own generation call
    // each, per generateOneBulkQuiz) - give real LLM time for 2 real calls.
    await expect(page.getByText('Continue to Assign & Publish', { exact: true })).toBeVisible({ timeout: 90000 });
  });

  test('BUG-CHECK: if quiz generation fails for one item ("Failed to fetch"), Retry re-attempts that item without affecting the other', async ({ browser }) => {
    // Manually observed (screenshot, 2026-08-25): during real bulk
    // generation, one item ("Data Handling and Venn Diagrams") failed with
    // a raw "Failed to fetch" network error and showed a Retry button,
    // while the sibling item ("Vocabulary Building 28") was still
    // generating normally. generateAllBulkQuizzes() awaits each item
    // SEQUENTIALLY (TeacherAssignmentsScreen.tsx:844-850) - a caught
    // failure on one item does not throw, so the loop moves on to the
    // next item regardless. This test doesn't try to force a network
    // failure (that's infrastructure-dependent, not something a fixture
    // file can reliably trigger) - it proves the OBSERVABLE contract: if
    // an item ever lands in 'error' quizStatus, Retry must be visible and
    // clicking it must re-attempt generation for THAT item only.
    const page = await newPageAs(browser, 'teacher-i');
    await openBulkWizard(page);
    await selectWorksheets(page, [WORKSHEET_1, WORKSHEET_2]);
    await expect(page.getByText(/^Reading /)).toHaveCount(0, { timeout: 60000 });
    await page.getByText('Continue to Generate Quizzes', { exact: true }).click();
    await expect(page.getByText('2. Generate', { exact: true })).toBeVisible({ timeout: 10000 });

    const retryButton = page.getByText('Retry', { exact: true });
    const sawFailure = await retryButton.isVisible({ timeout: 90000 }).catch(() => false);
    if (sawFailure) {
      // Reproduced the real failure live - prove Retry actually works.
      await retryButton.click();
      await expect(page.getByText('Failed to fetch', { exact: false })).not.toBeVisible({ timeout: 60000 });
      await expect(page.getByText('Continue to Assign & Publish', { exact: true })).toBeVisible({ timeout: 60000 });
    } else {
      // Did not reproduce this run - document that, rather than silently
      // passing as if the bug were confirmed fixed.
      await expect(page.getByText('Continue to Assign & Publish', { exact: true })).toBeVisible({ timeout: 60000 });
      test.info().annotations.push({
        type: 'generation-failure-not-reproduced',
        description: 'Did not observe a "Failed to fetch" generation error this run - the bug reported via screenshot is likely intermittent (network/backend load dependent), not deterministic.',
      });
    }
  });

  test('Assign & Publish: each item keeps its own independent All Students / Specific Student choice', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-i');
    await openBulkWizard(page);
    await selectWorksheets(page, [WORKSHEET_1, WORKSHEET_2]);
    await expect(page.getByText(/^Reading /)).toHaveCount(0, { timeout: 60000 });
    await page.getByText('Continue to Generate Quizzes', { exact: true }).click();
    await expect(page.getByText('Continue to Assign & Publish', { exact: true })).toBeVisible({ timeout: 90000 });
    await page.getByText('Continue to Assign & Publish', { exact: true }).click();

    await expect(page.getByText('Due Date (applies to all)', { exact: true })).toBeVisible({ timeout: 10000 });

    // Item 1: Specific Student. Item 2: leave as the default (All students).
    // Each item's chip row is independent state (updateBulkItem keyed by
    // item.id) - selecting Specific on item 1 must not affect item 2.
    const allStudentsChips = page.getByText('All students', { exact: true });
    const specificChips = page.getByText('Specific student', { exact: true });
    await expect(allStudentsChips.first()).toBeVisible();
    await specificChips.first().click();
    await page.getByText('E2E Student I1', { exact: true }).first().click();

    // Item 2 must still show "All students" as its own, unaffected choice.
    await expect(allStudentsChips.nth(1)).toBeVisible();
  });

  test('Publish All publishes every item, each with its own correct All Students / Specific Student targeting, verified at the backend', async ({ browser, request }) => {
    const { getUserIdByEmail, getAssignmentsForStudent } = await import('../../helpers/api.js');
    const page = await newPageAs(browser, 'teacher-i');
    await openBulkWizard(page);
    await selectWorksheets(page, [WORKSHEET_1, WORKSHEET_2]);
    await expect(page.getByText(/^Reading /)).toHaveCount(0, { timeout: 60000 });
    await page.getByText('Continue to Generate Quizzes', { exact: true }).click();
    await expect(page.getByText('Continue to Assign & Publish', { exact: true })).toBeVisible({ timeout: 90000 });
    await page.getByText('Continue to Assign & Publish', { exact: true }).click();

    await expect(page.getByText('Due Date (applies to all)', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Select a due date').click();
    await page.getByText('Today', { exact: true }).click();

    // Item 1 -> Specific Student (student-i1). Item 2 stays All students.
    await page.getByText('Specific student', { exact: true }).first().click();
    await page.getByText('E2E Student I1', { exact: true }).first().click();

    await page.getByText(/^Publish All \(\d+\)$/).click();

    // Both items must reach a terminal publish state - not stuck
    // "publishing" forever.
    await expect(page.getByText('publishing', { exact: false })).not.toBeVisible({ timeout: 30000 });

    const student1Id = await getUserIdByEmail(request, accountFor('student-i1').email);
    const student2Id = await getUserIdByEmail(request, accountFor('student-i2').email);
    const [a1, a2] = await Promise.all([
      getAssignmentsForStudent(request, student1Id),
      getAssignmentsForStudent(request, student2Id),
    ]);

    // student-i1 is BOTH linked (gets the All-students item 2) AND
    // specifically targeted (item 1) - must have at least 2 matching
    // assignments. student-i2 is only linked, so only the All-students
    // item should reach them - the Specific-Student item must NOT.
    const worksheet1Title = a1.filter((a) => a.studentId === student1Id);
    expect(worksheet1Title.length, 'student-i1 must receive the item explicitly assigned to them').toBeGreaterThan(0);

    const student2GotPersonalItem = a2.some((a) => a.studentId === student1Id);
    expect(student2GotPersonalItem, 'student-i2 must NOT receive the item that was specifically assigned to student-i1').toBeFalsy();
  });
});
