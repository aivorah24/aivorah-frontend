// Student Assignments screen (AssignmentsScreen.tsx) - page load, summary
// stats, filter tabs, empty/loading/error states, and the full
// create -> open -> answer -> submit flow through the real UI.
//
// Uses student-r, dedicated to tests/student/assignments/*.spec.js (see
// tests/helpers/accounts.js). Its account is backdated (created_at
// 2020-01-01, see seed-student-assignments-r.js) so a genuinely overdue
// assignment can be created without tripping the app's `joinedAfterDue`
// suppression (routes/assignments.js: joinedAfterDue = studentJoinedAt >
// dueDate - a freshly-created account could never show a real overdue item).
//
// Assignment titles created by this file are always prefixed 'E2E Assign '
// so cleanup can target exactly what each test created, safe under
// fullyParallel (same convention as schedule-deadlines.spec.js).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { newPageAs } from '../../helpers/session.js';
import { accountFor } from '../../helpers/accounts.js';
import {
  getUserIdByEmail,
  getAssignmentsForStudent,
  createAssignment,
  deleteAssignment,
  saveQuizToLibrary,
} from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openAssignments,
  statValue,
  filterTab,
  emptyState,
  errorState,
  retryButton,
  loadingState,
  assignmentCard,
  assignmentStartButton,
} from '../../helpers/assignmentsLocators.js';

const ACCOUNT = 'student-r';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}
function isoPlusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

async function openAssignmentsReady(page) {
  await openAssignments(page);
  await expect(page.getByText('Assignments', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  });
  await dismissAnnouncementIfPresent(page);
}

// Every title this file creates gets a per-run-unique suffix - a fixed
// title collided across runs whenever a previous run's own cleanup didn't
// get to run (e.g. a test failing before reaching its `finally`), which
// then broke a LATER run's exact-text locators with a strict-mode
// "resolved to N elements" error against the leftover row.
const RUN_ID = Date.now();
function uniqueTitle(base) {
  return `${base} ${RUN_ID}`;
}

// Deletes only the exact assignment ids this test created - never a
// blanket sweep (would race a concurrently-running sibling test's own
// in-progress assignment, same reasoning as schedule-deadlines.spec.js).
// Deletion failures are NOT swallowed - a silently-swallowed failure here
// is exactly what let stale rows accumulate and break later runs above.
async function cleanup(request, ids) {
  await Promise.all(ids.filter(Boolean).map((id) => deleteAssignment(request, id)));
}

test.describe('Student Assignments - page load, stats, tabs, states', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('page loads with title, subtitle, summary cards, and filter tabs', async ({ page }) => {
    await openAssignmentsReady(page);

    await expect(page.getByText('Assignments', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Your tasks and upcoming deadlines', { exact: true })).toBeVisible({
      timeout: 10000,
    });

    await expect(statValue(page, 'Pending')).toBeVisible();
    await expect(statValue(page, 'Completed')).toBeVisible();
    await expect(statValue(page, 'Ready')).toBeVisible();

    await expect(filterTab(page, 'All')).toBeVisible();
    await expect(filterTab(page, 'Pending')).toBeVisible();
    await expect(filterTab(page, 'Completed')).toBeVisible();
    await expect(filterTab(page, 'Quizzes')).toBeVisible();
    // 'All' is the default active tab.
    await expect(filterTab(page, 'All')).toHaveText('All');
  });

  test('summary card counts match the real pending/completed assignment counts from the API', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const created = await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: uniqueTitle('E2E Assign Stats Card'),
      dueDate: isoPlusDays(3),
      subject: 'Mathematics',
    });

    try {
      await openAssignmentsReady(page);
      await expect(assignmentCard(page, created.id)).toBeVisible({ timeout: 15000 });

      // Read-only expected-value lookup (see CLAUDE.md) - same call the
      // screen itself makes - used to compute what the UI SHOULD show.
      // student-r is shared by every test in this file (see CLAUDE.md's
      // parallel-execution rule), so this reads the count and reloads the
      // screen immediately after, keeping the window where a sibling
      // test's own mutation could change the account's totals as small as
      // possible (a page.reload() forces a fresh fetch right after the read,
      // rather than comparing against whatever the screen already had
      // in memory from its own earlier, less closely-timed load).
      const all = await getAssignmentsForStudent(request, studentId);
      const expectedPending = all.filter((a) => a.status === 'pending').length;
      const expectedCompleted = all.filter((a) => a.status === 'completed').length;

      await page.reload();
      await dismissAnnouncementIfPresent(page);
      await expect(statValue(page, 'Pending')).toHaveText(String(expectedPending), {
        timeout: 15000,
      });
      await expect(statValue(page, 'Completed')).toHaveText(String(expectedCompleted), {
        timeout: 15000,
      });
    } finally {
      await cleanup(request, [created.id]);
    }
  });

  test('tabs filter to the correct content: a quiz assignment shows under All, Pending, and Quizzes but not Completed', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const created = await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: uniqueTitle('E2E Assign Tab Filter'),
      dueDate: isoPlusDays(3),
      subject: 'Mathematics',
    });

    try {
      await openAssignmentsReady(page);

      await expect(assignmentCard(page, created.id)).toBeVisible({ timeout: 15000 });

      await filterTab(page, 'Pending').click();
      await expect(assignmentCard(page, created.id)).toBeVisible({ timeout: 15000 });

      await filterTab(page, 'Quizzes').click();
      await expect(assignmentCard(page, created.id)).toBeVisible({ timeout: 15000 });

      await filterTab(page, 'Completed').click();
      await expect(assignmentCard(page, created.id)).toHaveCount(0);

      await filterTab(page, 'All').click();
      await expect(assignmentCard(page, created.id)).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanup(request, [created.id]);
    }
  });

  test('Completed tab shows the correct empty-state message when there are no completed assignments', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    // Guarantee at least one PENDING assignment exists so 'All'/'Pending'
    // are non-empty, isolating this test to the Completed tab specifically.
    const created = await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: uniqueTitle('E2E Assign Empty Completed'),
      dueDate: isoPlusDays(3),
      subject: 'Mathematics',
    });

    try {
      const all = await getAssignmentsForStudent(request, studentId);
      const hasCompleted = all.some((a) => a.status === 'completed');
      test.skip(hasCompleted, 'account already has a completed assignment from another test run');

      await openAssignmentsReady(page);
      await filterTab(page, 'Completed').click();

      await expect(emptyState(page)).toBeVisible();
      await expect(page.getByText('No completed assignments yet.', { exact: true })).toBeVisible();
    } finally {
      await cleanup(request, [created.id]);
    }
  });

  test('a genuinely overdue pending assignment shows "Ready to submit" due label and a Closed status', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const created = await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: uniqueTitle('E2E Assign Overdue'),
      dueDate: isoPlusDays(-2),
      subject: 'Mathematics',
    });

    try {
      await openAssignmentsReady(page);
      const card = assignmentCard(page, created.id);
      await expect(card).toBeVisible({ timeout: 15000 });
      await expect(card.getByText('Ready to submit', { exact: true })).toBeVisible();
      // Real business rule (routes/assignments.js's isPastDue -> `closed`):
      // an assignment past its due date is auto-closed server-side and no
      // longer accepts submissions, so the status badge reads "Closed" (not
      // "Let's go!") and the Start button is hidden - confirmed by reading
      // AssignmentsScreen.tsx's `isClosed` guard directly.
      await expect(card.getByText('Closed', { exact: true })).toBeVisible();
      await expect(assignmentStartButton(page, created.id)).toHaveCount(0);
    } finally {
      await cleanup(request, [created.id]);
    }
  });

  test('a pending assignment can be opened, answered, and submitted through the real UI, then appears under Completed with its score', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const title = uniqueTitle('E2E Assign Submit Flow');
    const created = await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title,
      dueDate: isoPlusDays(3),
      subject: 'Mathematics',
    });

    try {
      await openAssignmentsReady(page);

      await assignmentStartButton(page, created.id).click({ timeout: 15000 });

      // Question screen: ModalTopBar shows the assignment title + "Question
      // 1 of 1" subtitle (createAssignment() always creates exactly one MCQ
      // question - see api.js's own comment). The Modal portals to the end
      // of the DOM, so its own copy of the title is the LAST match - the
      // card underneath (still in the DOM, just covered) is the other one.
      await expect(page.getByText(title, { exact: true }).last()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Question 1 of 1 · Mathematics', { exact: true })).toBeVisible();

      // The correct option per createAssignment()'s fixed question (7 + 5).
      await page.getByText('12', { exact: true }).click();
      await page.getByText('Review & Submit', { exact: true }).click();

      // Review screen -> Submit Quiz.
      await expect(page.getByText('Review Answers', { exact: true })).toBeVisible();
      await page.getByText('Submit Quiz', { exact: true }).click();

      // Result screen (separate full-screen modal, see AssignmentsScreen.tsx's
      // `submittedResult` render) - MCQ grading is deterministic, so a
      // correct single-question answer always scores 100%. "100%" alone can
      // match other completed cards elsewhere on the (still-mounted) page,
      // so pair it with its unique subtitle from the same result card.
      await expect(page.getByText('100%', { exact: true }).first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText('Excellent work!', { exact: true })).toBeVisible();

      // Re-navigating (rather than closing the result modal by hand) is
      // simpler and equally real - the app persists the submission
      // server-side regardless of how the modal is dismissed.
      await openAssignmentsReady(page);
      await filterTab(page, 'Completed').click();
      const card = assignmentCard(page, created.id);
      await expect(card).toBeVisible({ timeout: 15000 });
      await expect(card.getByText('Score: 100%', { exact: true })).toBeVisible();
    } finally {
      await cleanup(request, [created.id]);
    }
  });

  test('loading state shows a spinner before the list appears', async ({ page }) => {
    await page.route('**/assignments?studentId=*', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    await openAssignments(page);
    await expect(loadingState(page)).toBeVisible();
    await expect(loadingState(page)).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText('Assignments', { exact: true }).first()).toBeVisible();
  });

  test('when the assignments API fails, the screen shows a distinct error state (not the empty state), and Try again recovers it', async ({
    page,
  }) => {
    let shouldFail = true;
    await page.route('**/assignments?studentId=*', (route) => {
      if (shouldFail) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: '{"error":"boom"}',
        });
      }
      return route.continue();
    });

    await openAssignmentsReady(page);

    // Fixed: load() used to swallow the fetch error and silently render the
    // same empty state as "you have zero assignments" - indistinguishable
    // from a real empty account. It now tracks a separate `loadError` flag
    // and shows a distinct error state with a retry action instead.
    await expect(loadingState(page)).toHaveCount(0);
    await expect(errorState(page)).toBeVisible();
    await expect(emptyState(page)).toHaveCount(0);
    await expect(
      page.getByText("Couldn't load your assignments. Check your connection and try again.", {
        exact: true,
      }),
    ).toBeVisible();

    // Recovery: once the API is healthy again, Try again should load real
    // data and clear the error state.
    shouldFail = false;
    await retryButton(page).click();
    await expect(errorState(page)).toHaveCount(0, { timeout: 15000 });
  });

  test('refreshing the page reloads the assignment correctly', async ({ page, request }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const created = await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: uniqueTitle('E2E Assign Refresh'),
      dueDate: isoPlusDays(3),
      subject: 'Mathematics',
    });

    try {
      await openAssignmentsReady(page);
      await expect(assignmentCard(page, created.id)).toBeVisible({ timeout: 15000 });

      await page.reload();
      await expect(page.getByText('Assignments', { exact: true }).first()).toBeVisible({
        timeout: 15000,
      });
      await dismissAnnouncementIfPresent(page);
      await expect(assignmentCard(page, created.id)).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanup(request, [created.id]);
    }
  });

  test('navigating away and back to Assignments reloads it correctly', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const created = await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: uniqueTitle('E2E Assign Nav Away'),
      dueDate: isoPlusDays(3),
      subject: 'Mathematics',
    });

    try {
      await openAssignmentsReady(page);
      await expect(assignmentCard(page, created.id)).toBeVisible({ timeout: 15000 });

      await page.goto('/schedule');
      await expect(page.getByText('My Schedule', { exact: true })).toBeVisible({ timeout: 15000 });

      await openAssignmentsReady(page);
      await expect(assignmentCard(page, created.id)).toBeVisible({ timeout: 15000 });
    } finally {
      await cleanup(request, [created.id]);
    }
  });

  test('layout stays usable on a mobile viewport, with no horizontal scrolling', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAssignmentsReady(page);

    await expect(statValue(page, 'Pending')).toBeVisible();
    await expect(filterTab(page, 'All')).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  // Cross-persona: the teacher's OWN assigning action, driven for real
  // through TeacherAssignmentsScreen.tsx (not simulated via API like every
  // other test above), then verified end to end through the student's own
  // real UI. Uses teacher-d, linked only to student-r (see accounts.js).
  //
  // Reuses a Quiz Library quiz rather than the full AI-generation upload
  // wizard - generating a quiz via AI is slow and non-deterministic (real
  // model calls, different output per run), which would make this test both
  // slow and flaky. The Quiz Library "Assign" path is fully deterministic
  // (no AI call) and is itself a real, supported teacher journey.
  //
  // This test caught two real product bugs while being built (both fixed):
  //  1. TeacherAssignmentsScreen.tsx's Library "Assign" button read
  //     `q.quiz_data` from the LIST endpoint, which never includes quiz_data
  //     (GET /quiz/list omits it for listing performance) - Publish always
  //     failed with "This quiz has no tasks. Please re-generate before
  //     publishing." Fixed to fetch the full quiz via GET /quiz/:id first.
  //  2. AssignmentsScreen.tsx's `load()` silently showed the empty state on
  //     any API failure - see the "when the assignments API fails" test above.
  test('a teacher assigns a real quiz through the Teacher Assignments UI, and it is received and submitted by the student', async ({
    page,
    request,
    browser,
  }) => {
    // Two real personas driving a heavier multi-step UI each (teacher's
    // wizard, student's interactive-quiz iframe) - comfortably over the
    // default per-test timeout.
    test.setTimeout(180000);
    const teacherId = await getUserIdByEmail(request, accountFor('teacher-d').email);
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const title = uniqueTitle('E2E Teacher Assign');

    const saved = await saveQuizToLibrary(request, {
      teacherId,
      title,
      subject: 'Mathematics',
      grade: 'Grade 3',
      curriculum: 'CBSE',
    });

    let createdAssignmentId = null;
    const teacherPage = await newPageAs(browser, 'teacher-d');
    try {
      // ── Teacher's real journey: Library -> Assign -> Specific student -> Publish ──
      await teacherPage.goto('/teacher/assignments');
      await expect(teacherPage.getByText('Assignments', { exact: true }).first()).toBeVisible({
        timeout: 15000,
      });
      await dismissAnnouncementIfPresent(teacherPage);

      await teacherPage.getByTestId('teacher-quiz-library-tab').click();
      await expect(teacherPage.getByText(title, { exact: true })).toBeVisible({ timeout: 15000 });

      await teacherPage.getByTestId(`library-quiz-assign-${saved.id}`).click();
      await expect(teacherPage.getByTestId('teacher-interactive-preview-close')).toBeVisible({
        timeout: 15000,
      });
      await teacherPage.getByTestId('teacher-interactive-preview-close').click();

      await teacherPage.getByTestId('teacher-assign-specific-student').click();
      await teacherPage.getByTestId(`teacher-assign-student-row-${studentId}`).click();

      await teacherPage.getByTestId('teacher-assignment-due-date').click();
      await teacherPage.getByTestId('teacher-assignment-due-date-today').click();

      await teacherPage.getByTestId('teacher-publish-assignment').click();
      // The wizard modal closes and the new assignment appears in the
      // teacher's own list - real confirmation the publish succeeded.
      await expect(teacherPage.getByTestId('teacher-publish-assignment')).toHaveCount(0, {
        timeout: 15000,
      });
      await expect(teacherPage.getByText(title, { exact: true }).first()).toBeVisible({
        timeout: 15000,
      });

      // ── Student's real journey: the assignment is RECEIVED ──
      await openAssignmentsReady(page);
      const all = await getAssignmentsForStudent(request, studentId);
      const created = all.find((a) => a.title === title);
      expect(created, 'expected the teacher-published assignment to reach student-r').toBeTruthy();
      createdAssignmentId = created.id;

      const card = assignmentCard(page, created.id);
      await expect(card).toBeVisible({ timeout: 15000 });
      await expect(card.getByText(title, { exact: true })).toBeVisible();

      // ── Student opens and SUBMITS it for real (interactive quiz iframe) ──
      await assignmentStartButton(page, created.id).click({ timeout: 15000 });
      const quizFrame = page.frameLocator('iframe[title="Interactive Quiz"]');
      // The correct MCQ option per saveQuizToLibrary()'s fixed question (7 + 5).
      await quizFrame.getByText('12', { exact: false }).click({ timeout: 15000 });
      await quizFrame.getByText('Check', { exact: true }).click();

      const submitBtn = page.getByTestId('assignments-interactive-submit');
      await expect(submitBtn).toBeEnabled({ timeout: 15000 });
      await submitBtn.click();
      // The click only dispatches the DOM event - the button's onPress does
      // an async PUT /assignments/:id/complete and only closes this modal
      // (removing the iframe) once that resolves. Navigating away (below)
      // before that finishes aborts the in-flight request's JS continuation,
      // so the assignment never actually gets marked completed - wait for
      // the real, server-confirmed completion signal instead of a fixed delay.
      await expect(page.locator('iframe[title="Interactive Quiz"]')).toHaveCount(0, {
        timeout: 20000,
      });

      await openAssignmentsReady(page);
      await filterTab(page, 'Completed').click();
      const completedCard = assignmentCard(page, created.id);
      await expect(completedCard).toBeVisible({ timeout: 15000 });
      await expect(completedCard.getByText(title, { exact: true })).toBeVisible();
    } finally {
      await teacherPage.close();
      if (createdAssignmentId) await cleanup(request, [createdAssignmentId]);
    }
  });
});
