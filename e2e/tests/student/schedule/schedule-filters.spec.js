// Student Schedule - category filter chips (All Events / Assignments &
// Deadlines / Personal Study) and Hide Completed.
//
// Uses student-k (dedicated to tests/student/schedule/*.spec.js).
//
// Hide Completed can only be tested deterministically through a REAL
// assignment completion, not a fake PUT: routes/schedule.js's
// filterCompleted() always recomputes isCompleted live from
// assignment_submissions for type='deadline' rows with a real assignment_id
// - it never trusts anything written to storage for that field (confirmed by
// reading the route). So this file creates a real quiz assignment (which
// schedule.js materializes into a 'deadline' schedule_events row at creation
// time - see assignments.js POST /), then actually submits it via the
// existing createAssignment/submitAssignment API helpers (same pattern
// challenges.spec.js uses for its own real-completion flow).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import {
  getUserIdByEmail,
  createScheduleEvent,
  deleteScheduleEvent,
  getScheduleForDate,
  createAssignment,
  submitAssignment,
} from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import { openSchedule, filterChip, hideCompletedToggle } from '../../helpers/scheduleLocators.js';

const ACCOUNT = 'student-k';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

async function openScheduleReady(page) {
  await openSchedule(page);
  await expect(page.getByText('My Schedule', { exact: true })).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
}

// Deletes only the exact titles passed in, scoped PER TEST (not shared
// across the whole file). playwright.config.js runs fullyParallel and
// student-k is shared across every file AND every test within this file -
// a cleanup keyed off a file-wide title set would let one test's
// beforeEach/afterEach delete another concurrently-running test's
// just-created event in the SAME file, not just across files.
async function cleanupTitles(request, titles) {
  const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
  const events = await getScheduleForDate(request, { studentId, date: todayISO() });
  const ours = events.filter((e) => titles.has(e.title));
  await Promise.all(ours.map((e) => deleteScheduleEvent(request, e.id)));
}

const PERSONAL_STUDY_TEST_TITLES = new Set(['E2E Study Item', 'E2E Worksheet Item']);
const HIDE_COMPLETED_TEST_TITLES = new Set(['E2E Hide Completed Assignment — Quiz due']);

test.describe('Student Schedule - category filters', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('Personal Study filter hides an Assignments & Deadlines-tagged event and All Events shows both', async ({
    page,
    request,
  }) => {
    await cleanupTitles(request, PERSONAL_STUDY_TEST_TITLES);
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);

    // A Personal Study event (Study Session tag -> type 'study', same
    // derivation deriveTypeFromTag() does in ScheduleScreen.tsx) and a
    // Worksheet/Assignment-tagged event (type 'assignment') on the same day.
    await createScheduleEvent(request, {
      title: 'E2E Study Item',
      date: todayISO(),
      startTime: '11:00',
      endTime: '11:30',
      studentId,
      tag: 'Study Session',
      type: 'study',
    });
    await createScheduleEvent(request, {
      title: 'E2E Worksheet Item',
      date: todayISO(),
      startTime: '12:00',
      endTime: '12:30',
      studentId,
      tag: 'Worksheet / Assignment',
      type: 'assignment',
    });

    await openScheduleReady(page);

    // All Events: both visible.
    await expect(page.getByText('E2E Study Item', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2E Worksheet Item', { exact: true })).toBeVisible();

    // Assignments & Deadlines: the day-grid excludes ALL timed events for
    // this filter (ScheduleScreen.tsx's dayEvents filter: `if (filterType
    // === 'assignments') return false` unconditionally) - both timed items
    // disappear, since neither is an all-day deadline/challenge chip.
    await filterChip(page, 'assignments').click();
    await expect(page.getByText('E2E Study Item', { exact: true })).toHaveCount(0);
    await expect(page.getByText('E2E Worksheet Item', { exact: true })).toHaveCount(0);

    // Personal Study: the timed grid excludes nothing by type here (only the
    // all-day lane excludes study items) - both are timed events, so the
    // Personal Study filter (which only touches the all-day lane's
    // `filterType === 'study'` branch) still shows both in the grid.
    await filterChip(page, 'study').click();
    await expect(page.getByText('E2E Study Item', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E Worksheet Item', { exact: true })).toBeVisible();

    await filterChip(page, 'all').click();
    await expect(page.getByText('E2E Study Item', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E Worksheet Item', { exact: true })).toBeVisible();

    await cleanupTitles(request, PERSONAL_STUDY_TEST_TITLES);
  });

  test('Hide Completed removes a genuinely completed assignment deadline from the all-day lane', async ({
    page,
    request,
  }) => {
    // Extra room over the default: this test's own assignment creation +
    // materialization into schedule_events can be slower under this repo's
    // parallel-test load against a single local dev server (same reasoning
    // challenges.spec.js documents for its own extended timeouts).
    test.setTimeout(60000);
    await cleanupTitles(request, HIDE_COMPLETED_TEST_TITLES);
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);

    const assignment = await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: 'E2E Hide Completed Assignment',
      dueDate: todayISO(),
      subject: 'Mathematics',
    });

    await openScheduleReady(page);

    // createAssignment() always creates a `type: 'quiz'` assignment, which
    // assignments.js's POST / materializes into schedule_events with the
    // title `${title} — Quiz due` (confirmed by reading the route) - not
    // the assignment's raw title alone. Due today, it also lands in the
    // Upcoming Deadlines side panel as a second copy of the same title
    // (ScheduleScreen.tsx renders both the all-day lane chip AND the
    // deadlines panel item from the same event) - .first() picks the
    // grid chip; both are driven by the same fetch/state, so they always
    // appear/disappear together.
    const chip = page
      .getByText('E2E Hide Completed Assignment — Quiz due', { exact: true })
      .first();
    await expect(chip).toBeVisible({ timeout: 20000 });

    // Not completed yet - Hide Completed must NOT remove it. (RNW doesn't
    // expose accessibilityState.checked as an aria-checked DOM attribute for
    // this component in this app build - confirmed by reading the live
    // rendered HTML - so the toggle's effect is asserted behaviorally below,
    // not via an attribute.)
    await hideCompletedToggle(page).click();
    await expect(chip).toBeVisible();

    // Turn it back off, complete the assignment for real, then turn it back
    // on - filterCompleted() recomputes isCompleted live on every fetch, so
    // the 30s poll (or a reload) will reflect it.
    await hideCompletedToggle(page).click();
    await submitAssignment(request, assignment.id, { studentId });

    await page.reload();
    await dismissAnnouncementIfPresent(page);
    await expect(chip).toBeVisible({ timeout: 10000 });

    await hideCompletedToggle(page).click();
    await expect(chip).toHaveCount(0);

    await hideCompletedToggle(page).click();
    await expect(chip).toBeVisible();
  });
});
