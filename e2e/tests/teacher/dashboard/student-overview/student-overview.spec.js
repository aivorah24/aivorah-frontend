// Feature: Student Overview - the card showing total/active/needs-attention
// student counts plus the Recent Activity feed (one physical card in the
// UI, two related capabilities: class-size navigation and activity
// drill-down). Separate from AI Teaching Insights and the Class Progress
// card (../ai-teaching-insights/), which live below it on the page.
//
// Uses teacher-a - read-only, so any number of tests/specs can share it.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';
import { accountFor } from '../../../helpers/accounts.js';
import { getStudentIdByEmail, completeLesson } from '../../../helpers/api.js';
import { computeStudentOverview } from '../../../helpers/expectedTiles.js';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

const ACCOUNT = 'teacher-a';
const STUDENT = 'student-teacher-a';

test.describe('Teacher Dashboard - Student Overview', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('shows real Total Students / Active Today / Need Attention counts, and auto-refreshes when a student becomes active', async ({
    page,
    request,
  }) => {
    // Playwright's default 30s test timeout is shorter than the 40s the
    // final assertions may need to catch the dashboard's own 30s
    // auto-refresh interval - raise it so the test isn't killed early.
    test.setTimeout(60000);

    const teacherEmail = accountFor(ACCOUNT).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getStudentIdByEmail(request, { teacherEmail, studentEmail });

    // The dashboard is already loaded (beforeEach) BEFORE this mutation, and
    // we never reload/re-visit it below - this exercises the real
    // auto-refresh path (setInterval(fetchStudents, 30_000)), not just
    // "does a fresh page load show correct data."

    // completeLesson unconditionally sets last_active_date = today (see
    // routes/student.js's complete-lesson handler - that patch field isn't
    // gated behind the alreadyDone check), so it's what we use here rather
    // than logStudyTime - study time is shared/mutated by
    // ../ai-teaching-insights/learning-path.spec.js running in PARALLEL on
    // this same dedicated account, and two concurrent logStudyTime calls
    // race each other's median calculation. completeLesson's completed_topics
    // array can theoretically race too, but nothing in this file reads that
    // field, so it doesn't affect this test's correctness.
    // Topic name deliberately avoids card-header substrings like "Student
    // Overview" - an earlier version collided with dashboard.spec.js's
    // non-exact text match once it showed up in the Recent Activity feed.
    await completeLesson(request, studentId, {
      topic: `E2E Active Check ${Date.now()}`,
      subject: 'Mathematics',
    });

    // Confirm the backend actually committed before waiting on the UI -
    // keeps a backend bug from being misread as "auto-refresh is slow".
    await expect
      .poll(
        async () => {
          const after = await request
            .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
            .then((r) => r.json())
            .then((students) => students.find((s) => s.id === studentId));
          return after.lastActive;
        },
        { timeout: 15000, message: 'lastActive was not updated' },
      )
      .toBeTruthy();

    // Compute the exact expected numbers with the app's own formulas (see
    // tests/helpers/expectedTiles.js) from the SAME live data the dashboard
    // itself just fetched.
    const finalStudents = await request
      .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
      .then((r) => r.json());
    const expected = computeStudentOverview(finalStudents);

    const totalStudentsValue = page.getByText('Total Students').locator('xpath=preceding-sibling::*[1]');
    const activeTodayValue = page.getByText('Active Today').locator('xpath=preceding-sibling::*[1]');
    const needAttentionValue = page.getByText('Need Attention').locator('xpath=preceding-sibling::*[1]');

    // No page.reload()/goto() anywhere in this test - expect.poll keeps
    // re-reading the DOM until it matches, which only succeeds once the
    // dashboard's own 30s auto-refresh interval has actually fired and
    // re-rendered with the new numbers.
    await expect
      .poll(() => totalStudentsValue.innerText(), { timeout: 40000 })
      .toBe(String(expected.totalStudents));
    await expect
      .poll(() => activeTodayValue.innerText(), { timeout: 40000 })
      .toBe(String(expected.activeToday));
    await expect
      .poll(() => needAttentionValue.innerText(), { timeout: 40000 })
      .toBe(String(expected.needAttention));
  });

  test('clicking Student Overview opens the Students screen with matching count, and back returns to the dashboard', async ({
    page,
  }) => {
    const totalStudentsText = await page
      .getByText('Total Students')
      .locator('xpath=preceding-sibling::*[1]')
      .innerText();

    // Click the card itself, not the nested Active Today / Need Attention
    // sub-stats - those stop propagation and route elsewhere.
    //
    // Seen occasionally flaky ONLY under heavy parallel load (many workers
    // sharing the CPU) - the dashboard's 30s auto-refresh can re-render
    // mid-click. Passes reliably alone/lightly loaded; not a wrong selector.
    await page.getByText('Student Overview').click();

    await expect(page.getByText('Students', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(`${totalStudentsText} enrolled`)).toBeVisible();

    await page.goBack();
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible();
  });

  // KNOWN FLAKINESS RISK: student-teacher-a's completed_topics keeps
  // accumulating fake E2E-generated topic strings across every spec run,
  // never reset between runs (see accounts.js OWNERSHIP). That inflates
  // topicsCount / progressPct over the course of a day's test runs, and
  // several OTHER specs mutate this same account concurrently (completeLesson
  // calls in ai-teaching-insights/learning-path.spec.js and
  // class-progress.spec.js). Under heavy parallel load, needsAttention /
  // lastActive can genuinely flip between when this test fetches its
  // "before" snapshot and when the Students screen re-fetches its own fresh
  // copy a few seconds later - a real race, not a selector bug. Flagging
  // this rather than silently living with occasional false failures; worth
  // deciding with Sai whether student-teacher-a's completed_topics should
  // be reset between runs, or whether these two tests need their own
  // dedicated, less-shared account.

  // Clicking "Active Today" navigates with initialTab: 'Active Today' (see
  // TeacherDashboardScreen's overviewStat TouchableOpacity), which
  // TeacherStudentsScreen filters to s.lastActive?.startsWith(todayISO) -
  // real filtering logic, verified in the app code, not guessed. There's no
  // separate visible "active" tab pill for this filter (only 'Needs
  // Attention'/'All'/grade tabs render as pills - see TeacherStudentsScreen's
  // TABS array), so we verify the filter behaviorally: only students active
  // today should be visible; anyone who isn't should not be.
  test('clicking Active Today opens Students filtered to students active today', async ({ page, request }) => {
    const teacherEmail = accountFor(ACCOUNT).email;
    const students = await request
      .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
      .then((r) => r.json());
    const today = todayISO();
    const activeToday = students.filter((s) => s.lastActive === today);
    const notActiveToday = students.filter((s) => s.lastActive !== today);

    await page.getByText('Active Today').click();
    await expect(page.getByText('Students', { exact: true }).first()).toBeVisible();

    // .filter({ visible: true }) handles the known mobile/desktop
    // duplicate-layout issue (see other specs' notes on this) - only count
    // actually-visible copies, not hidden layout duplicates.
    for (const s of activeToday) {
      await expect(page.getByText(s.name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    }
    for (const s of notActiveToday) {
      await expect(page.getByText(s.name, { exact: true }).filter({ visible: true })).toHaveCount(0);
    }
  });

  // Clicking "Need Attention" navigates with initialTab: 'Needs Attention',
  // which IS a real tab in TeacherStudentsScreen's TABS array and filters to
  // s.needsAttention - verified in the app code.
  test('clicking Need Attention opens Students filtered to students needing attention', async ({ page, request }) => {
    const teacherEmail = accountFor(ACCOUNT).email;
    const students = await request
      .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
      .then((r) => r.json());
    const needAttention = students.filter((s) => s.needsAttention);
    const notNeedAttention = students.filter((s) => !s.needsAttention);

    await page.getByText('Need Attention').click();
    await expect(page.getByText('Students', { exact: true }).first()).toBeVisible();

    for (const s of needAttention) {
      await expect(page.getByText(s.name, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    }
    for (const s of notNeedAttention) {
      await expect(page.getByText(s.name, { exact: true }).filter({ visible: true })).toHaveCount(0);
    }
  });

  // KNOWN BUG: Recent Activity rows shouldn't need to navigate anywhere -
  // they're an informational feed, not a workflow entry point (confirmed
  // with Sai). The app currently DOES navigate to Student Progress on click
  // (TeacherDashboardScreen's actRowCompact TouchableOpacity). Written for
  // the CORRECT (no-navigation) behavior on purpose, so it shows red until
  // the app is fixed - same convention as tests/student/dashboard.spec.js.
  test('clicking a recent activity row does not navigate away (known bug - currently does)', async ({ page }) => {
    const noActivity = page.getByText('No recent activity');
    if (await noActivity.isVisible().catch(() => false)) {
      test.skip(true, 'teacher-a has no recent activity right now - nothing to click');
    }

    // Rows are identified by their relative-time text (e.g. "2h ago",
    // "Just now") - the one piece of stable, always-present text on each
    // row, since student names/actions vary with real data.
    const activityRow = page
      .getByText(/^(Just now|\d+[mhd] ago|Yesterday)$/)
      .filter({ visible: true })
      .first();
    await activityRow.click();

    await expect(page.getByText('Student Progress', { exact: true }).filter({ visible: true }).first()).not.toBeVisible({
      timeout: 5000,
    });
  });
});
