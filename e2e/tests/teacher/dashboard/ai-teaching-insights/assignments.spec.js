// Feature: AI Teaching Insights - verifies the full business journey
// "student submits an assignment -> backend records it -> every row in the
// AI Teaching Insights Assignments column updates" (Pending, Avg Score,
// Submitted - all three, checked against live data via
// tests/helpers/expectedTiles.js, not just one placeholder flip).
//
// Also checks the Class Progress card's Assignments row (submitted/assigned
// · X%) at the end - a different, separate card fed by the same backend
// totals; see ai-teaching-insights.spec.js for this column's own pure
// UI/interaction tests (render + modal open/close).
//
// Seeds activity via the same backend endpoints the app itself calls
// (POST /assignments to create, POST /assignments/:id/submit to submit) -
// see tests/helpers/api.js for why we don't drive the student UI here.
//
// Uses teacher-a (read-only) + student-teacher-a (mutable, dedicated to
// Teacher Dashboard analytics specs - see OWNERSHIP in accounts.js).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';
import { accountFor } from '../../../helpers/accounts.js';
import { getStudentIdByEmail, getTeacherIdByEmail, createAssignment, submitAssignment } from '../../../helpers/api.js';
import { computeAssignmentTiles } from '../../../helpers/expectedTiles.js';

const TEACHER = 'teacher-a';
const STUDENT = 'student-teacher-a';

test.describe('Teacher Dashboard - Assignment Analytics', () => {
  test.use({ storageState: statePath(TEACHER) });

  test('a student submitting an assignment auto-refreshes the teacher dashboard\'s assignment insight numbers', async ({
    context,
    page,
    request,
  }) => {
    // Playwright's default 30s test timeout is shorter than the 40s the
    // final assertions may need to catch the dashboard's own 30s
    // auto-refresh interval - raise it so the test isn't killed early.
    test.setTimeout(60000);

    const teacherEmail = accountFor(TEACHER).email;
    const studentEmail = accountFor(STUDENT).email;

    // Load the dashboard BEFORE mutating anything, and never reload/re-visit
    // it after - exercises the real auto-refresh path
    // (TeacherDashboardScreen's setInterval(fetchStudents, 30_000)), not
    // just "does a fresh page load show correct data."
    await applySession(context, TEACHER);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });

    const [studentId, teacherId] = await Promise.all([
      getStudentIdByEmail(request, { teacherEmail, studentEmail }),
      getTeacherIdByEmail(teacherEmail),
    ]);

    const before = await request
      .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}/insights`)
      .then((r) => r.json());
    const beforeSubmissions = before.totals?.totalSubmissions ?? 0;

    const assignment = await createAssignment(request, {
      teacherId,
      studentId,
      title: `E2E Assignment Analytics ${Date.now()}`,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      subject: 'Mathematics',
    });
    await submitAssignment(request, assignment.id, { studentId });

    // Confirm the backend actually committed before waiting on the UI -
    // keeps a backend bug from being misread as "auto-refresh is slow".
    await expect
      .poll(
        async () => {
          const after = await request
            .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}/insights`)
            .then((r) => r.json());
          return after.totals?.totalSubmissions ?? 0;
        },
        { timeout: 15000, message: 'totalSubmissions did not increase' },
      )
      .toBeGreaterThan(beforeSubmissions);

    // Compute every Assignment tile's expected title with the app's own
    // formulas (tests/helpers/expectedTiles.js). No page.reload()/goto()
    // from here on - a 40s timeout comfortably covers the 30s auto-refresh
    // interval, so these only pass if the dashboard genuinely updated
    // itself in the background.
    const [finalStudents, finalInsights] = await Promise.all([
      request.get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`).then((r) => r.json()),
      request.get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}/insights`).then((r) => r.json()),
    ]);
    const expected = computeAssignmentTiles(finalStudents, finalInsights);

    await expect(page.getByText(expected.pending, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 40000 });
    await expect(page.getByText(expected.avgScore, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 40000 });
    await expect(page.getByText(expected.submitted, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 40000 });

    // These three rows can only reach a real-data state because of THIS
    // test's submission - confirm they actually flipped off their
    // zero-activity placeholders, not just that expectedTiles.js and the
    // app happen to agree on a placeholder.
    expect(expected.avgScore).not.toBe('No Scores Yet');
    expect(expected.submitted).not.toBe('No Submissions');

    // The "Class Progress" card's Assignments row (donut card, separate from
    // the AI Teaching Insights tiles above) shows "submitted/assigned · X%" -
    // computed the exact way TeacherDashboardScreen does (assignSubmitPct =
    // round(submitted/assigned*100)), so this is a real value check, not a
    // guessed string.
    const totals = finalInsights.totals;
    const assignSubmitPct = totals.totalAssignmentsAssigned > 0
      ? Math.round((totals.totalSubmissions / totals.totalAssignmentsAssigned) * 100)
      : 0;
    await expect(
      page.getByText(`${totals.totalSubmissions}/${totals.totalAssignmentsAssigned} · ${assignSubmitPct}%`),
    ).toBeVisible({ timeout: 40000 });
  });
});
