// Feature: Class Progress - the donut + 3 progress bars card (Learning
// Path / Assignments / Challenges %, plus "Typical Study Time") - a
// DIFFERENT card from AI Teaching Insights (../ai-teaching-insights/),
// even though both are fed by the same backend totals.
//
// Only the Learning Path / Typical Study Time row lives here. The
// Assignments and Challenges rows are already verified inline in
// ../ai-teaching-insights/assignments.spec.js and challenges.spec.js
// (search "Class Progress" in those files) - duplicating those mutations
// into a second file would have this file and that file both creating
// assignments/challenges for the SAME student in parallel, racing each
// other's "final total" snapshot. Learned that the hard way: an earlier
// version of this file did exactly that and started failing once both
// files ran together.
//
// Assignments/Challenges rows use "submitted/assigned · X%" and
// "completed/assigned · X%" - unique text, unlike the Learning Path row
// (bare "{n}%", duplicate label - still a testability gap). The Learning
// Path row is instead verified via its "Typical Study Time" figure, whose
// label IS unique on the page.
//
// Uses teacher-a (read-only) + student-teacher-a (mutable, dedicated to
// Teacher Dashboard analytics specs). Deliberately uses completeLesson, NOT
// logStudyTime - study time is already mutated by
// ../ai-teaching-insights/learning-path.spec.js running in parallel on this
// same account, and concurrent logStudyTime calls race each other's median
// calculation (that's what caused an earlier flaky failure).
// completeLesson's last_active_date write is unconditional and safe to
// duplicate; its completed_topics array append has a low-risk lost-update
// race that doesn't affect anything this file checks.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';
import { accountFor } from '../../../helpers/accounts.js';
import { getStudentIdByEmail, completeLesson } from '../../../helpers/api.js';

const TEACHER = 'teacher-a';
const STUDENT = 'student-teacher-a';

function formatStudyTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

test.describe('Teacher Dashboard - Class Progress', () => {
  test.use({ storageState: statePath(TEACHER) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, TEACHER);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('a student completing a topic updates the Typical Study Time figure', async ({
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const teacherEmail = accountFor(TEACHER).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getStudentIdByEmail(request, { teacherEmail, studentEmail });

    // Loaded BEFORE this mutation (beforeEach), never reloaded after - this
    // exercises the real 30s auto-refresh, not a fresh page load.
    //
    // Topic name deliberately avoids the substring "Class Progress" - an
    // earlier version used that string and it showed up verbatim in the
    // Recent Activity feed, colliding with this page's own "Class Progress"
    // card header text.
    await completeLesson(request, studentId, {
      topic: `E2E Study Session ${Date.now()}`,
      subject: 'Mathematics',
    });

    // Read-only expected-value lookup: fetches the app's own live totals
    // purely to compute the expected Typical Study Time figure - not an
    // assertion in itself. The verification below is UI-only.
    const finalStudents = await request
      .get(`/student/by-teacher/${encodeURIComponent(teacherEmail)}`)
      .then((r) => r.json());
    const combinedStudyTimes = finalStudents.map(
      (s) => (s.learningPathTime || 0) + (s.assignmentTime || 0) + (s.challengeTime || 0),
    );
    const expectedTypicalStudyTime = formatStudyTime(median(combinedStudyTimes));

    const typicalStudyTimeValue = page
      .getByText('Typical Study Time')
      .locator('xpath=preceding-sibling::*[1]');
    await expect
      .poll(() => typicalStudyTimeValue.innerText(), { timeout: 40000 })
      .toBe(expectedTypicalStudyTime);
  });
});
