// Student Schedule - Upcoming Deadlines panel, and the screen's own
// auto-refresh: ScheduleScreen.tsx polls GET /schedule* every 30s
// (fetchEvents' setInterval) and also refetches on focus. These tests open
// the screen ONCE, then mutate schedule data via the API while it stays
// open (no page.reload()) and verify the real background poll picks the
// change up - not a reload-based shortcut, which would hide a broken
// auto-refresh.
//
// Uses student-k (dedicated to tests/student/schedule/*.spec.js).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import {
  getUserIdByEmail,
  createScheduleEvent,
  deleteScheduleEvent,
  getScheduleForDate,
  createAssignment,
} from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import { openSchedule, upcomingDeadlines } from '../../helpers/scheduleLocators.js';

const ACCOUNT = 'student-k';

// createAssignment() always creates a `type: 'quiz'` assignment (see its own
// comment in api.js for why). assignments.js's POST / materializes that into
// schedule_events with the title `${title} — Quiz due` (confirmed by
// reading the route directly) - NOT the assignment's raw title on its own.
const DEADLINE_SUFFIX = ' — Quiz due';

//This function (todayISO) returns today's date in ISO format (YYYY-MM-DD).
function todayISO() {
  return new Date().toISOString().split('T')[0];
}
//This function get today's date and adds n days to it, returning the result in ISO format (YYYY-MM-DD).
function isoPlusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
//This function opens the schedule page and waits for it to be ready by checking for the visibility of the "My Schedule" text. It also dismisses any announcements if present.
async function openScheduleReady(page) {
  await openSchedule(page);
  await expect(page.getByText('My Schedule', { exact: true })).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
}

// Deletes only the exact titles passed in, scoped PER TEST - see
// schedule-add-event.spec.js's comment on why a file-wide (or blanket
// 'E2E '-prefix) sweep is unsafe under fullyParallel with a shared account:
// it can delete another concurrently-running test's just-created event.
async function cleanupTitles(request, titles) {
  const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
  for (const date of [todayISO(), isoPlusDays(1), isoPlusDays(2)]) {
    const events = await getScheduleForDate(request, { studentId, date });
    const ours = events.filter((e) => titles.has(e.title));
    await Promise.all(ours.map((e) => deleteScheduleEvent(request, e.id)));
  }
}

const UPCOMING_TEST_TITLES = new Set([`E2E Upcoming Deadline Assignment${DEADLINE_SUFFIX}`]);
const AUTOREFRESH_TEST_TITLES = new Set([`E2E Auto Refresh Assignment${DEADLINE_SUFFIX}`]);
const STALE_TEST_TITLES = new Set([`E2E Stale Data Assignment${DEADLINE_SUFFIX}`]);

test.describe('Student Schedule - Upcoming Deadlines + auto-refresh', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('a deadline created via the API shows its title and due date in Upcoming Deadlines', async ({
    page,
    request,
  }) => {
    await cleanupTitles(request, UPCOMING_TEST_TITLES);
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: 'E2E Upcoming Deadline Assignment',
      dueDate: isoPlusDays(2),
      subject: 'Mathematics',
    });

    await openScheduleReady(page);

    const panel = upcomingDeadlines(page);
    await expect(
      panel.getByText(`E2E Upcoming Deadline Assignment${DEADLINE_SUFFIX}`, { exact: true }),
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(panel.getByText(`Due ${isoPlusDays(2)}`, { exact: true })).toBeVisible();

    await cleanupTitles(request, UPCOMING_TEST_TITLES);
  });

  test('a new deadline assigned while the screen is already open appears via auto-refresh, without a reload', async ({
    page,
    request,
  }) => {
    // ScheduleScreen.tsx polls every 30s - give comfortable room over that.
    test.setTimeout(60000);
    await cleanupTitles(request, AUTOREFRESH_TEST_TITLES);

    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);

    // Load the screen BEFORE the assignment exists, and never reload/re-visit
    // it - this exercises the real background poll, not a fresh load.
    await openScheduleReady(page);
    // Due today, this also lands in the Upcoming Deadlines panel as a
    // second copy of the same title (see schedule-filters.spec.js's Hide
    // Completed test for why) - .first() picks the grid chip.
    const chip = page
      .getByText(`E2E Auto Refresh Assignment${DEADLINE_SUFFIX}`, { exact: true })
      .first();
    await expect(chip).toHaveCount(0);

    await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: 'E2E Auto Refresh Assignment',
      dueDate: todayISO(),
      subject: 'Mathematics',
    });

    // No page.reload() here - the 30s setInterval in fetchEvents() is the
    // only thing that can make this appear. A generous timeout past 30s
    // that would fail if auto-refresh were broken (falling back to only the
    // initial empty load).
    await expect(chip).toBeVisible({ timeout: 40000 });

    await cleanupTitles(request, AUTOREFRESH_TEST_TITLES);
  });

  test('a deadline removed via the API disappears via auto-refresh, without a reload (no stale data)', async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);
    await cleanupTitles(request, STALE_TEST_TITLES);

    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const assignment = await createAssignment(request, {
      teacherId: 'e2e-test-harness',
      studentId,
      title: 'E2E Stale Data Assignment',
      dueDate: todayISO(),
      subject: 'Mathematics',
    });

    await openScheduleReady(page);
    // Due today, this also lands in the Upcoming Deadlines panel as a
    // second copy of the same title - .first() picks the grid chip.
    const chip = page
      .getByText(`E2E Stale Data Assignment${DEADLINE_SUFFIX}`, { exact: true })
      .first();
    await expect(chip).toBeVisible({ timeout: 10000 });

    // Find and delete the materialized schedule_events row for this
    // assignment's deadline (not the assignment itself - this checks the
    // Schedule screen's own data source, schedule_events, going stale).
    const events = await getScheduleForDate(request, { studentId, date: todayISO() });
    const deadlineRow = events.find((e) => e.assignmentId === assignment.id);
    expect(
      deadlineRow,
      'expected a materialized deadline schedule_events row for this assignment',
    ).toBeTruthy();
    await deleteScheduleEvent(request, deadlineRow.id);

    await expect(chip).toHaveCount(0, { timeout: 40000 });
  });
});
