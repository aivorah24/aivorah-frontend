// Feature: AI Teaching Insights - verifies the business journey "student
// completes a topic -> backend records it -> teacher's dashboard reflects
// real activity", checking EVERY row in the Learning Path column against
// live data (see tests/helpers/expectedTiles.js), not just one placeholder
// flip. Also checks the Class Progress card's Learning Path row where
// possible - its value is a bare "{n}%" with no distinguishing text and its
// label duplicates this column's header, so it's not independently
// assertable without a testID; flagged as a testability gap, not silently
// skipped.
//
// We seed the activity by calling the same backend endpoint the app itself
// calls when a student passes a quiz (POST /student/:id/complete-lesson) -
// see tests/helpers/api.js for why we don't drive the student quiz UI here.
//
// Uses teacher-a (read-only) + student-teacher-a (mutable, dedicated to this
// spec - see OWNERSHIP in tests/helpers/accounts.js). No other spec may
// write to student-teacher-a.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';
import { accountFor } from '../../../helpers/accounts.js';
import { getStudentIdByEmail, completeLesson, logStudyTime } from '../../../helpers/api.js';
import { computeLearningPathTiles } from '../../../helpers/expectedTiles.js';

const TEACHER = 'teacher-a';
const STUDENT = 'student-teacher-a';

test.describe('Teacher Dashboard - Learning Path Analytics', () => {
  test.use({ storageState: statePath(TEACHER) });

  test('completing a topic as a student auto-refreshes the teacher dashboard\'s topic/study insight numbers', async ({
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

    const studentId = await getStudentIdByEmail(request, { teacherEmail, studentEmail });

    // Load the dashboard BEFORE mutating anything, and never reload/re-visit
    // it after - this is what actually exercises the real auto-refresh path
    // (TeacherDashboardScreen's setInterval(fetchStudents, 30_000)), not
    // just "does a fresh page load show correct data."
    await applySession(context, TEACHER);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });

    // Read the "before" numbers straight from the same API the dashboard
    // itself calls, so the assertion is about the number CHANGING correctly,
    // not about a hardcoded expected value (activity accumulates run over
    // run since student-teacher-a is dedicated but not reset between runs).
    const before = await request
      .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
      .then((r) => r.json())
      .then((students) => students.find((s) => s.id === studentId));

    const topic = `E2E Learning Path Analytics Topic ${Date.now()}`;
    await completeLesson(request, studentId, {
      topic,
      subject: 'Mathematics',
      grade: before.grade,
      curriculum: before.curriculum,
    });
    // A real study session also logs study time WHILE working through the
    // lesson - completeLesson alone never touches it (see
    // tests/helpers/api.js's logStudyTime comment).
    await logStudyTime(request, studentId, { minutes: 15, subject: 'Mathematics' });

    // Confirm the backend actually committed before waiting on the UI -
    // keeps a backend bug from being misread as "auto-refresh is slow".
    await expect
      .poll(
        async () => {
          const after = await request
            .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
            .then((r) => r.json())
            .then((students) => students.find((s) => s.id === studentId));
          return after.completedTopics?.length ?? 0;
        },
        { timeout: 15000, message: 'completedTopics count did not increase' },
      )
      .toBeGreaterThan(before.completedTopics?.length ?? 0);

    // Compute each tile's expected title with the app's own formulas (see
    // tests/helpers/expectedTiles.js). No page.reload()/page.goto() from
    // here on - a 40s timeout comfortably covers the 30s auto-refresh
    // interval, so these only pass if the dashboard genuinely updated
    // itself in the background, the way a teacher watching the screen
    // live would actually see it happen.
    const finalStudents = await request
      .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
      .then((r) => r.json());
    const expected = computeLearningPathTiles(finalStudents);

    await expect(page.getByText(expected.needSupport, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 40000 });
    await expect(page.getByText(expected.topScore, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 40000 });
    await expect(page.getByText(expected.inactive, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 40000 });
    await expect(page.getByText(expected.studyTime, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 40000 });

    // The two rows that can flip to a real-data state as a direct result of
    // THIS test's action must have actually flipped - not just be showing
    // some value, but specifically not still be on their zero-activity
    // placeholder. Guards against expectedTiles.js and the app silently
    // agreeing on a placeholder due to a shared bug.
    expect(expected.topScore).not.toBe('No Data Yet');
    expect(expected.studyTime).not.toBe('No Study Yet');
  });
});
