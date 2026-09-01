// Teacher Assignments — Upload Worksheet (PDF / Image / DOCX), the second of
// the 3 "New" choice-screen options. Written from live manual testing
// (screenshots, 2026-08-25) that found two confirmed bugs before any test
// was written here - both are reproduced below as failing tests, not
// silently worked around.
//
// Account: teacher-k, dedicated to this file (curriculum/grade switched via
// teacherTeaches.js where a test needs a specific config; every test
// restores its own snapshot). Originally shared teacher-j with
// curriculum-subject-source-of-truth.spec.js, split out 2026-08-25 once it
// became clear 3 files were all mutating the same account's curriculum at
// once - safe within one file's own serial block, not across files under
// fullyParallel. Runs as a plain (non-serial) describe now that the account
// is exclusive to this file - true parallel execution, no shared-account
// race to guard against.
//
// Real fixtures used (not fabricated):
//   - PDF:  the "PYP4 -MHLE-32" Area & Perimeter worksheet (same file whose
//           extraction the user manually verified this session).
//   - PNG:  tests/fixtures/worksheets/area-perimeter-1.png, rendered from
//           page 1 of that exact PDF via pdftoppm - a real image of real
//           worksheet content, not a synthetic placeholder.
//   - DOCX: a real Toddle-exported .docx worksheet from the same sample set.

import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { newPageAs } from '../../helpers/session.js';
import { accountFor } from '../../helpers/accounts.js';
import { snapshotTeaches, restoreTeaches, setTeacherTeaches } from '../../helpers/teacherTeaches.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSHEET_PDF = path.resolve(
  __dirname, '../../../../Aivorah Documents/Assignment Picture',
  'Toddle-8d6af58a-a488-46a7-93fb-f0a5ec0611cc-PYP4 -MHLE-32.pdf',
);
const WORKSHEET_PNG = path.resolve(__dirname, '../../fixtures/worksheets/area-perimeter-1.png');
const WORKSHEET_DOCX = path.resolve(
  __dirname, '../../../../Aivorah Documents/Assignment Picture',
  'Toddle-7350f488-5306-4f73-9485-1b79d586a503-LHLE 30 - PYP 4.docx',
);

async function withCurriculum(curriculum, grade, run) {
  const email = accountFor('teacher-k').email;
  const snapshot = await snapshotTeaches(email);
  try {
    await setTeacherTeaches(email, { curriculum, teaches: [{ curriculum, grade, subjects: ['Mathematics'] }] });
    await run();
  } finally {
    await restoreTeaches(email, snapshot);
  }
}

async function openUploadWizard(page) {
  await page.goto('/teacher/assignments');
  await page.getByText('New', { exact: true }).click();
  await page.getByText('Upload Worksheet (PDF / Image)', { exact: true }).click();
}

async function uploadFile(page, filePath) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Upload worksheet (image, PDF or DOCX)', { exact: true }).click(),
  ]);
  await fileChooser.setFiles(filePath);
}

test.describe('Teacher Assignments — Upload Worksheet (PDF / Image / DOCX)', () => {

  // ── Confirmed bug #1: premature pre-selection before any upload ─────────

  test('BUG: before any worksheet is uploaded, Subject/Grade are already pre-selected (Language Acquisition / Grade 2) instead of nothing', async ({ browser }) => {
    // Manually confirmed via screenshot: opening Upload & Classify on a
    // real IB PYP/Grade 2 teacher account shows "Language Acquisition"
    // already selected in the Subject row (with its Language sub-row
    // already visible) and "Grade 2" already selected - BEFORE any file is
    // uploaded. Nothing should be pre-selected at this point; the whole
    // point of "auto-detected" fields is that they populate FROM the
    // worksheet, not from the teacher's own onboarding config leaking into
    // a step that hasn't run extraction yet.
    const page = await newPageAs(browser, 'teacher-k');
    await withCurriculum('IB PYP', 'Grade 2', async () => {
      await openUploadWizard(page);

      // The Language row only renders when Subject === 'Language
      // Acquisition' - its presence before any upload is direct, textual
      // proof of the premature pre-selection (no chip-styling guesswork
      // needed).
      await expect(page.getByText('Telugu', { exact: true })).not.toBeVisible();
      await expect(page.getByText('LANGUAGE', { exact: true })).not.toBeVisible();
    });
  });

  // ── Format support: PDF, PNG image, DOCX ─────────────────────────────────

  test('uploading a real PDF worksheet auto-detects the correct subject and grade', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-k');
    await withCurriculum('IB PYP', 'Grade 2', async () => {
      await openUploadWizard(page);
      await uploadFile(page, WORKSHEET_PDF);

      await expect(page.getByText(/auto-filled/i).first()).toBeVisible({ timeout: 60000 });

      // The worksheet's own header text reads "PYP 4" / "Subject Focus:
      // Mathematics" - extraction must actually reflect that, not the
      // teacher's onboarding default (IB PYP/Grade 2/Language Acquisition,
      // per the bug above).
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Grade 4', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Mathematics', { exact: true })).toBeVisible();
    });
  });

  test('uploading a PNG image of the same worksheet is accepted and extracts the same subject/grade', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-k');
    await withCurriculum('IB PYP', 'Grade 2', async () => {
      await openUploadWizard(page);
      await uploadFile(page, WORKSHEET_PNG);

      await expect(page.getByText(/auto-filled/i).first()).toBeVisible({ timeout: 60000 });
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Grade 4', { exact: true })).toBeVisible();
      await expect(dialog.getByText('Mathematics', { exact: true })).toBeVisible();
    });
  });

  test('uploading a DOCX worksheet is accepted (converted server-side) and reaches auto-fill', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-k');
    await withCurriculum('IB PYP', 'Grade 4', async () => {
      await openUploadWizard(page);
      await uploadFile(page, WORKSHEET_DOCX);

      // docx-to-pdf conversion is a real server round trip - give it real
      // time, and confirm it doesn't silently fail (falls through to
      // "auto-filled" text same as PDF/PNG).
      await expect(page.getByText(/auto-filled/i).first()).toBeVisible({ timeout: 60000 });
    });
  });

  // ── Confirmed bug #2: Chapter/Topic auto-fill picks an internal code ────

  test('BUG: Chapter/Topic auto-fill shows the worksheet\'s internal reference code ("MHLE - 32"), not a real topic name ("Area and Perimeter")', async ({ browser }) => {
    // Manually confirmed: Title correctly auto-fills to "Area and
    // Perimeter" (the real topic), but the separate Chapter/Topic field
    // auto-fills to "MHLE - 32" - an internal worksheet reference code
    // printed on the page, not a usable topic name. Root cause per
    // TeacherAssignmentsScreen.tsx line 643: chapterVal falls back through
    // `eData.chapter || eData.title`, so this is the SERVER's extraction
    // returning a bad `chapter` value for this worksheet - a real
    // extraction-quality bug, not a frontend display bug.
    const page = await newPageAs(browser, 'teacher-k');
    await withCurriculum('IB PYP', 'Grade 2', async () => {
      await openUploadWizard(page);
      await uploadFile(page, WORKSHEET_PDF);
      await expect(page.getByText(/auto-filled/i).first()).toBeVisible({ timeout: 60000 });

      const dialog = page.getByRole('dialog');
      const chapterField = dialog.getByPlaceholder('e.g. Fractions and Decimals');
      const chapterValue = await chapterField.inputValue();

      // A real topic name reads as words, not a bare "CODE - NUMBER"
      // reference pattern.
      const looksLikeInternalCode = /^[A-Z]{2,6}\s*-\s*\d+\.?$/.test(chapterValue.trim());
      expect(
        looksLikeInternalCode,
        `Chapter/Topic auto-filled to "${chapterValue}", which reads as an internal worksheet code, not a real topic name like "Area and Perimeter"`,
      ).toBeFalsy();
    });
  });

  // ── Next → Generate → Approve & Save → content-fidelity check ───────────

  test('Next proceeds to Generate, produces an interactive quiz whose content matches the uploaded worksheet', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-k');
    await withCurriculum('IB PYP', 'Grade 2', async () => {
      await openUploadWizard(page);
      await uploadFile(page, WORKSHEET_PDF);
      await expect(page.getByText(/auto-filled/i).first()).toBeVisible({ timeout: 60000 });

      await page.getByText('Next', { exact: true }).click();
      await expect(page.getByText('Generate Interactive Quiz', { exact: true })).toBeVisible({ timeout: 10000 });
      await page.getByText('Generate Interactive Quiz', { exact: true }).click();

      await expect(page.getByText('Generating Interactive Quiz...')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Approve & Save', { exact: true })).toBeVisible({ timeout: 60000 });

      // Content fidelity: topical keywords alone ("perimeter", "area")
      // aren't enough - a generic, unrelated Area & Perimeter quiz would
      // also pass those. Assert the SPECIFIC concrete facts printed on
      // THIS worksheet actually appear: the octagon's 40cm perimeter and
      // the L-shape's exact dimensions (5m/6m/8m/3m). This is what proves
      // the quiz is really grounded on the uploaded file, not hallucinated
      // from the topic name alone.
      const quizText = await page.locator('body').innerText();
      expect(/perimeter/i.test(quizText)).toBeTruthy();
      expect(/area/i.test(quizText)).toBeTruthy();
      expect(/polygon/i.test(quizText)).toBeTruthy();
      expect(/40\s*cm/i.test(quizText), 'must contain the octagon\'s real 40cm perimeter, not just the word "perimeter"').toBeTruthy();
      expect(/5\s*m/.test(quizText) && /8\s*m/.test(quizText), 'must contain the L-shape\'s real dimensions (5m, 8m), not a generic shape').toBeTruthy();

      // Structural fidelity (the fabricated-question class of bug, see
      // [[test-layering-content-fidelity]] memory): the source worksheet
      // has exactly 3 real questions (octagon perimeter, irregular-shape
      // area, L-shape perimeter) - a 4th, fabricated question ("square
      // playground, 65m") was found via manual comparison. Count "Hint"
      // buttons as a proxy for question count (one per generated
      // question, confirmed from the Preview screenshot).
      const hintCount = await page.getByText('Hint', { exact: true }).count();
      expect(hintCount, 'generated question count must not exceed the 3 real questions on the source worksheet - a higher count means fabricated content').toBeLessThanOrEqual(3);
    });
  });

  test('Approve & Save closes the preview and reaches Assign & Publish with Title auto-filled from the real topic', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-k');
    await withCurriculum('IB PYP', 'Grade 2', async () => {
      await openUploadWizard(page);
      await uploadFile(page, WORKSHEET_PDF);
      await expect(page.getByText(/auto-filled/i).first()).toBeVisible({ timeout: 60000 });
      await page.getByText('Next', { exact: true }).click();
      await page.getByText('Generate Interactive Quiz', { exact: true }).click();
      await expect(page.getByText('Approve & Save', { exact: true })).toBeVisible({ timeout: 60000 });
      await page.getByText('Approve & Save', { exact: true }).click();

      await expect(page.getByText('Assign & Publish', { exact: true })).toBeVisible({ timeout: 10000 });
      const dialog = page.getByRole('dialog');
      const titleField = dialog.getByPlaceholder('e.g. Chapter 5 Worksheet');
      await expect(titleField).toHaveValue(/area.*perimeter/i, { timeout: 5000 });
    });
  });

  // ── Back-button behavior across the wizard ───────────────────────────────

  test('Back button returns to the previous step and preserves the already-uploaded worksheet state', async ({ browser }) => {
    const page = await newPageAs(browser, 'teacher-k');
    await withCurriculum('IB PYP', 'Grade 2', async () => {
      await openUploadWizard(page);
      await uploadFile(page, WORKSHEET_PDF);
      await expect(page.getByText(/auto-filled/i).first()).toBeVisible({ timeout: 60000 });
      await page.getByText('Next', { exact: true }).click();
      await expect(page.getByText('Generate Interactive Quiz', { exact: true })).toBeVisible({ timeout: 10000 });

      // The back arrow is the first icon rendered in the dialog's header,
      // before the step title - no testID exists for it yet.
      const dialog = page.getByRole('dialog');
      await dialog.locator('svg').first().click();

      // Back on step 1: the upload area (now showing "Add another page"
      // since a file is already attached) must still be there, and the
      // extracted subject/grade from before must not have been lost.
      await expect(page.getByText('UPLOAD WORKSHEET', { exact: true }).or(page.getByText('Add another page'))).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText('Grade 4', { exact: true })).toBeVisible();
    });
  });

  // ── Assign & Publish: All Students vs Specific Student, with 2 real linked students ──

  test('Publishing an uploaded-worksheet assignment to All Students reaches both linked students', async ({ browser, request }) => {
    // Reuses teacher-i's 2 real linked students (student-i1/student-i2,
    // provisioned for library-and-assignment-flow.spec.js) rather than
    // provisioning a third pair - this test only needs SOME teacher with 2
    // linked students, not teacher-k specifically, so it runs against
    // teacher-i and does not touch teacher-k's block at all.
    const { getUserIdByEmail, getAssignmentsForStudent } = await import('../../helpers/api.js');
    const page = await newPageAs(browser, 'teacher-i');
    await page.goto('/teacher/assignments');
    await page.getByText('New', { exact: true }).click();
    await page.getByText('Upload Worksheet (PDF / Image)', { exact: true }).click();
    await uploadFile(page, WORKSHEET_PDF);
    await expect(page.getByText(/auto-filled/i).first()).toBeVisible({ timeout: 60000 });
    await page.getByText('Next', { exact: true }).click();
    await page.getByText('Generate Interactive Quiz', { exact: true }).click();
    await expect(page.getByText('Approve & Save', { exact: true })).toBeVisible({ timeout: 60000 });
    await page.getByText('Approve & Save', { exact: true }).click();

    await expect(page.getByText('Assign & Publish', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByText('Select a due date').click();
    await page.getByText('Today', { exact: true }).click();

    const [pubRequest] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/assignments') && req.method() === 'POST'),
      page.getByText('Publish Assignment', { exact: true }).click(),
    ]);
    const body = pubRequest.postDataJSON();
    expect(body.studentId).toBeNull();

    const student1Id = await getUserIdByEmail(request, accountFor('student-i1').email);
    const student2Id = await getUserIdByEmail(request, accountFor('student-i2').email);
    const [a1, a2] = await Promise.all([
      getAssignmentsForStudent(request, student1Id),
      getAssignmentsForStudent(request, student2Id),
    ]);
    expect(a1.some((a) => /area.*perimeter/i.test(a.title))).toBeTruthy();
    expect(a2.some((a) => /area.*perimeter/i.test(a.title))).toBeTruthy();
  });

  // ── Notification mechanism: does the student get a real push/alert? ─────

  test('documents whether publishing creates any student-facing notification, or only a passive assignments-table row', async ({ browser }) => {
    // Investigation finding (routes/assignments.js line ~1884-1887, code
    // comment, read directly): "Assignment reminders are delivered via the
    // notification bell (which reads the assignments table directly) - NOT
    // as chat messages. We intentionally do NOT create an 'Aivorah' message
    // thread here." No push/websocket mechanism was found for students -
    // only PARENTS get an explicit `messages` table insert. This test
    // documents the real, observed behavior (does the student's own bell/
    // badge update without a manual refresh?) rather than assuming a
    // "notification popup" exists, since none was found in the server code.
    const page = await newPageAs(browser, 'teacher-i');
    const studentPage = await newPageAs(browser, 'student-i1');
    await studentPage.goto('/dashboard');
    await studentPage.waitForTimeout(1000);
    const bellBadgeBefore = await studentPage.getByTestId(/notification|bell/i).first().textContent().catch(() => null);

    await page.goto('/teacher/assignments');
    await page.getByText('New', { exact: true }).click();
    await page.getByText('Upload Worksheet (PDF / Image)', { exact: true }).click();
    await uploadFile(page, WORKSHEET_PDF);
    await expect(page.getByText(/auto-filled/i).first()).toBeVisible({ timeout: 60000 });
    await page.getByText('Next', { exact: true }).click();
    await page.getByText('Generate Interactive Quiz', { exact: true }).click();
    await expect(page.getByText('Approve & Save', { exact: true })).toBeVisible({ timeout: 60000 });
    await page.getByText('Approve & Save', { exact: true }).click();
    await page.getByText('Select a due date').click();
    await page.getByText('Today', { exact: true }).click();
    await page.getByText('Publish Assignment', { exact: true }).click();

    // Without any reload, does the student's own page reflect the new
    // assignment (a real push) or does it require a refresh (poll-only)?
    await studentPage.waitForTimeout(3000);
    const bellBadgeAfterNoReload = await studentPage.getByTestId(/notification|bell/i).first().textContent().catch(() => null);
    test.info().annotations.push({
      type: 'notification-behavior',
      description: `bell badge before: ${bellBadgeBefore}, after publish WITHOUT reload: ${bellBadgeAfterNoReload} (a change here would mean real push; no change means poll-only, matching the "reads the assignments table directly" code comment)`,
    });
  });
});
