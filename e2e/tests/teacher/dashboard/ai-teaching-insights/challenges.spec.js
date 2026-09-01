// Feature: AI Teaching Insights - verifies the full business journey
// "student completes a challenge -> backend records it -> every row in the
// AI Teaching Insights Challenges column updates" (Attempted, Completed,
// Top Scorer). Also checks the Class Progress card's Challenges row at the
// end - same pattern as assignments.spec.js, see its header comment.
//
// student-teacher-a is seeded as CBSE/Grade 3 specifically because the
// `challenges` table has zero rows for NCERT (any grade) - see the seed
// script comment in ai-mentor/server/scripts/seed-e2e-suite.js.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';
import { accountFor } from '../../../helpers/accounts.js';
import {
  getStudentIdByEmail,
  getTeacherIdByEmail,
  listChallenges,
  assignChallenge,
  completeChallenge,
} from '../../../helpers/api.js';
import { computeChallengeTiles } from '../../../helpers/expectedTiles.js';

const TEACHER = 'teacher-a';
const STUDENT = 'student-teacher-a';

test.describe('Teacher Dashboard - Challenge Analytics', () => {
  test.use({ storageState: statePath(TEACHER) });

  test("a student completing a challenge auto-refreshes the teacher dashboard's challenge insight numbers", async ({
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

    const challenges = await listChallenges(request, {
      grade: 'Grade 3',
      curriculum: 'CBSE',
      studentId,
    });
    const unfinished = challenges.find((c) => c.status !== 'completed');
    expect(
      unfinished,
      'expected at least one not-yet-completed CBSE/Grade 3 challenge for this student',
    ).toBeTruthy();

    const assignment = unfinished.assignmentId
      ? { id: unfinished.assignmentId }
      : await assignChallenge(request, { challengeId: unfinished.id, studentId, teacherId });
    await completeChallenge(request, assignment.id, { studentId, score: 90 });

    // Read-only expected-value lookup: fetches the app's own live totals
    // purely to compute every Challenge tile's expected title - not an
    // assertion in itself. No page.reload()/goto() from here on - a 40s
    // timeout comfortably covers the 30s auto-refresh interval, so the real
    // verification below only passes if the dashboard genuinely updated
    // itself in the background.
    const [finalStudents, finalInsights] = await Promise.all([
      request.get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`).then((r) => r.json()),
      request
        .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}/insights`)
        .then((r) => r.json()),
    ]);
    const expected = computeChallengeTiles(finalStudents, finalInsights);

    await expect(
      page.getByText(expected.attempted, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 40000 });
    await expect(
      page.getByText(expected.completed, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 40000 });
    await expect(
      page.getByText(expected.topScorer, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 40000 });

    expect(expected.attempted).not.toBe('No Challenges Yet');
    expect(expected.completed).not.toBe('None Completed');
    expect(expected.topScorer).not.toBe('No Scores Yet');

    // The "Class Progress" card's Challenges row shows "completed/assigned · X%",
    // computed the exact way TeacherDashboardScreen does (challCompletePct =
    // round(completed/assigned*100)) - a real value check, not a guessed string.
    const totals = finalInsights.totals;
    const challCompletePct =
      totals.totalChallengesAssigned > 0
        ? Math.round((totals.totalChallengesCompleted / totals.totalChallengesAssigned) * 100)
        : 0;
    await expect(
      page.getByText(
        `${totals.totalChallengesCompleted}/${totals.totalChallengesAssigned} · ${challCompletePct}%`,
      ),
    ).toBeVisible({ timeout: 40000 });
  });
});
