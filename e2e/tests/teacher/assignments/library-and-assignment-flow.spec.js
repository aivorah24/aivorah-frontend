// Teacher Assignments — Quiz Library reuse -> preview/edit -> Approve & Save
// -> Assign flow (All Students / Specific Student), verified at the
// data/backend level, not just "the UI says Published."
//
// Uses the pre-seeded "E2E Lifecycle Quiz" fixture already sitting in the
// Qdrant `school_quizzes` collection (school_id: 'TSRA', curriculum:
// 'IB PYP', subject: Mathematics, grade: 'PYP 4') - GET /quiz/list scopes
// the Library to the logged-in teacher's own school+curriculum (routes/
// quiz.js), so teacher-i (school=TSRA, curriculum=IB PYP) is the only new
// account needed to actually see it; nothing else was seeded for this file.
//
// Account: teacher-i, linked to student-i1 AND student-i2 (both TSRA/IB
// PYP/PYP 4) via teacher_student - provisioned 2026-08-25 specifically for
// this file since no existing real E2E account had 2+ linked students. See
// accounts.js's OWNERSHIP entry.
//
// Backend verification method: after publishing, call the real
// GET /assignments?studentId=<id> endpoint (routes/assignments.js) for
// EVERY relevant student - not a raw table read - because that endpoint IS
// the actual curriculum/grade/teacher-link filtering logic the app runs;
// asserting through it is what "receives the assignment" really means to a
// real student session. A raw `assignments` table read only proves a row
// exists, not that the intended students can actually see it (or that an
// unrelated student can't) - which is exactly the distinction the task
// asked for ("Do not consider the test successful merely because the UI
// says Published").

import { test, expect } from '@playwright/test';
import { newPageAs } from '../../helpers/session.js';
import { accountFor } from '../../helpers/accounts.js';
import { getUserIdByEmail, getAssignmentsForStudent } from '../../helpers/api.js';

async function openAssignments(browser) {
  const page = await newPageAs(browser, 'teacher-i');
  await page.goto('/teacher/assignments');
  return page;
}

// Opens Library -> the seeded quiz -> Assign -> reaches the Preview/Edit
// Answers screen with "Approve & Save" available. Returns the page with
// that modal open, ready for the caller to set Assign-to + Publish.
async function openLibraryQuizForAssign(page) {
  await page.getByText('Library', { exact: true }).click();
  await expect(page.getByText('All Subjects', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('All Grades', { exact: true })).toBeVisible();

  const card = page.getByText('E2E Lifecycle Quiz', { exact: true }).first();
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.click();

  // Card click opens the read-only preview modal - use its own "Assign"
  // action to actually enter the editable Preview/Edit Answers screen.
  await page.getByText('Assign', { exact: true }).first().click();

  // Preview/Edit Answers screen: confirm both tabs and Approve & Save exist,
  // then approve to close it and land on the Assign & Publish step.
  await expect(page.getByText('Preview', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Edit Answers', { exact: true })).toBeVisible();
  await page.getByText('Approve & Save', { exact: true }).click();
}

test.describe.serial('Teacher Assignments — Library -> Assign flow, verified at the backend', () => {
  test('Quiz Library loads, All Subjects/All Grades filters work, and the seeded quiz opens for preview', async ({ browser }) => {
    const page = await openAssignments(browser);

    await page.getByText('Library', { exact: true }).click();
    await expect(page.getByText('All Subjects', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('All Grades', { exact: true })).toBeVisible();

    // Real quiz card from the seeded IB PYP library data - not empty state.
    await expect(page.getByText('E2E Lifecycle Quiz', { exact: true }).first()).toBeVisible({ timeout: 15000 });

    // Filtering to a subject/grade that has no match must show the real
    // empty state, not a stuck spinner or a stale list.
    await page.getByText('Physical Education', { exact: true }).click();
    await expect(page.getByText('No quizzes found', { exact: true })).toBeVisible({ timeout: 10000 });

    // Clearing back to "All Subjects" must restore the real list.
    await page.getByText('All Subjects', { exact: true }).click();
    await expect(page.getByText('E2E Lifecycle Quiz', { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // Open the quiz preview and confirm it's real, rendered content.
    await page.getByText('E2E Lifecycle Quiz', { exact: true }).first().click();
    await expect(page.getByText(/Mathematics/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Assign to All Students: every linked student receives it (via real GET /assignments), no unrelated student does', async ({ browser, request }) => {
    const page = await openAssignments(browser);
    await openLibraryQuizForAssign(page);

    const dialog = page.getByRole('dialog').or(page.locator('body'));
    await dialog.getByText('All students', { exact: true }).first().click();
    await page.getByText('Select a due date').click();
    await page.getByText('Today', { exact: true }).click();

    await page.getByText('Publish Assignment', { exact: true }).click();
    await expect(page.getByText(/Published|successfully/i).first().or(page.getByText('E2E Lifecycle Quiz')).first()).toBeVisible({ timeout: 15000 });

    // Backend truth, not the UI's word for it: call the real endpoint each
    // student's own app session would call.
    const student1Id = await getUserIdByEmail(request, accountFor('student-i1').email);
    const student2Id = await getUserIdByEmail(request, accountFor('student-i2').email);
    const unrelatedId = await getUserIdByEmail(request, accountFor('student-a').email);

    const [assignments1, assignments2, assignmentsUnrelated] = await Promise.all([
      getAssignmentsForStudent(request, student1Id),
      getAssignmentsForStudent(request, student2Id),
      getAssignmentsForStudent(request, unrelatedId),
    ]);

    const match1 = assignments1.filter((a) => a.title === 'E2E Lifecycle Quiz');
    const match2 = assignments2.filter((a) => a.title === 'E2E Lifecycle Quiz');
    const matchUnrelated = assignmentsUnrelated.filter((a) => a.title === 'E2E Lifecycle Quiz');

    expect(match1.length, 'student-i1 (linked to teacher-i) must receive the All-Students broadcast').toBeGreaterThan(0);
    expect(match2.length, 'student-i2 (linked to teacher-i) must receive the All-Students broadcast').toBeGreaterThan(0);
    expect(matchUnrelated.length, 'student-a (not linked to teacher-i, different curriculum) must NOT receive it').toBe(0);

    // Due date and broadcast (studentId === null) state, confirmed from the
    // student's own real read of the assignment - not the creation payload.
    const today = new Date().toISOString().split('T')[0];
    expect(match1[0].dueDate?.slice(0, 10)).toBe(today);
    expect(match1[0].studentId ?? null).toBeNull();
  });

  test('Assign to a Specific Student: only that student receives it - the other linked student and an unrelated student do not', async ({ browser, request }) => {
    const page = await openAssignments(browser);
    await openLibraryQuizForAssign(page);

    const dialog = page.getByRole('dialog').or(page.locator('body'));
    await dialog.getByText('Specific student', { exact: true }).first().click();
    await page.getByPlaceholder('Search student by name...').fill('E2E Student I1');
    await page.getByText('E2E Student I1', { exact: true }).click();

    await page.getByText('Select a due date').click();
    await page.getByText('Today', { exact: true }).click();

    const [request2] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/assignments') && req.method() === 'POST'),
      page.getByText('Publish Assignment', { exact: true }).click(),
    ]);
    const body = request2.postDataJSON();
    expect(body.studentId).toBeTruthy();

    const student1Id = await getUserIdByEmail(request, accountFor('student-i1').email);
    const student2Id = await getUserIdByEmail(request, accountFor('student-i2').email);
    const unrelatedId = await getUserIdByEmail(request, accountFor('student-a').email);

    const [assignments1, assignments2, assignmentsUnrelated] = await Promise.all([
      getAssignmentsForStudent(request, student1Id),
      getAssignmentsForStudent(request, student2Id),
      getAssignmentsForStudent(request, unrelatedId),
    ]);

    // A fresh publish each run (unique per test run via real timestamps
    // isn't available on a reused library title, so match on the specific
    // studentId field instead of the shared title alone).
    const match1 = assignments1.filter((a) => a.title === 'E2E Lifecycle Quiz' && (a.studentId) === student1Id);
    const match2 = assignments2.filter((a) => a.title === 'E2E Lifecycle Quiz' && (a.studentId) === student1Id);
    const matchUnrelated = assignmentsUnrelated.filter((a) => a.title === 'E2E Lifecycle Quiz' && (a.studentId) === student1Id);

    expect(match1.length, 'student-i1 (the selected student) must receive it').toBeGreaterThan(0);
    expect(match2.length, 'student-i2 (linked but NOT selected) must NOT receive the personal assignment').toBe(0);
    expect(matchUnrelated.length, 'student-a (unrelated) must NOT receive it').toBe(0);

    const today = new Date().toISOString().split('T')[0];
    expect(match1[0].dueDate?.slice(0, 10)).toBe(today);
  });
});
