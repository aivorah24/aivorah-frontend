// Feature: Parent Dashboard - Weekly Snapshot card (Learning Journey,
// Mission Progress, Growth Points, Attendance Record + View Monthly Logs).
// Same treatment as Teacher's class-progress/ sub-feature: mutate real
// student state via API, load the dashboard through the real UI, verify
// the dashboard's own real API call reflects it correctly - never mocked.
//
// Confirmed via code read (ParentDashboardScreen.tsx):
//   - Learning Journey value = formatStudyTime(child.studyTimeMinutes) (line 613/395)
//   - Mission Progress value = "{completedTopics.length}{totalTopics ? ' / '+totalTopics : ' topics'}" (line 627/396-397)
//   - Growth Points value = child.xpPoints.toLocaleString() (line 649)
//   - Attendance Record is B2B-only (isB2B = !!user?.schoolId, line 197) -
//     confirmed TSRA parents DO have school_id set, so this card renders.
//   - "View Monthly Logs" opens a modal titled "{child.name}'s Attendance" (line 1099)
//
// Also covers Subject Performance, Learning Mood, and Learning Highlights -
// these conceptually belong to the "Activity Overview" group (see
// ../activity-overview/activity-overview.spec.js), but that spec uses
// read-only parent-e/student-a/student-b, which can't be mutated. Anything
// here that needs to push a child's stats past a real threshold uses this
// file's own mutable accounts instead.
//
// PARALLEL-SAFE ACCOUNT SPLIT: this file used to run all its tests serially
// against one account, because several of them write the SAME student_stats
// fields (currentStreak/xpPoints/studyTimeMinutes) via absolute PUT sets -
// running them in parallel raced and produced values neither test expected.
// Each test below now uses its own dedicated parent/student pair (parent-f,
// f2..f7 - see OWNERSHIP in accounts.js) so the whole file runs in parallel
// with everything else. Tests that share parent-f/student-parent-f (the
// original account) were verified to touch zero overlapping fields with
// each other - see each one's own comment.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../../helpers/auth.js';
import { accountFor } from '../../../helpers/accounts.js';
import {
  getChildIdByParentEmail,
  completeLesson,
  logStudyTime,
  trackQuizResult,
  markAttendance,
} from '../../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../../helpers/dismissAnnouncement.js';
import { assertAttendanceStat } from '../../../helpers/assertAttendanceStat.js';

const WEEK_DAYS_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatStudyTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── parent-f / student-parent-f ──────────────────────────────────────────
// Hosts 4 tests that were verified to touch zero overlapping fields with
// each other: topic+study-time (completedTopics/xpPoints/studyTimeMinutes),
// a Subject Performance quiz (only writes an analytics_events row, never
// touches student_stats), and two pure-navigation tests with no mutation
// at all. Safe together even running in parallel.
test.describe('Parent Dashboard - Weekly Snapshot (parent-f group)', () => {
  const PARENT = 'parent-f';
  const STUDENT = 'student-parent-f';
  test.use({ storageState: statePath(PARENT) });

  test('completing a topic and logging study time updates Learning Journey, Mission Progress, and Growth Points', async ({
    context,
    page,
    request,
  }) => {
    // Playwright's default 30s test timeout is shorter than the 40s the
    // final assertions may need to catch the dashboard's own 30s
    // auto-refresh interval - raise it so the test isn't killed early.
    test.setTimeout(60000);

    const parentEmail = accountFor(PARENT).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getChildIdByParentEmail(request, {
      parentEmail,
      childEmail: studentEmail,
    });

    // Load the dashboard BEFORE mutating anything, and never reload/re-visit
    // it after - this exercises the real auto-refresh path
    // (ParentDashboardScreen polls children every 30s), not just "does a
    // fresh page load show correct data."
    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    await completeLesson(request, studentId, {
      topic: `E2E Weekly Snapshot Topic ${Date.now()}`,
      subject: 'Mathematics',
    });
    await logStudyTime(request, studentId, { minutes: 20, subject: 'Mathematics' });

    // Read-only expected-value lookup: fetches the app's own live totals
    // purely to compute the expected UI strings with the app's own
    // formulas - not an assertion in itself. No page.reload()/goto() from
    // here on - a 40s timeout comfortably covers the 30s auto-refresh
    // interval, so the real verification below only passes if the
    // dashboard genuinely updated itself in the background.
    const children = await request
      .get(`/parent/${encodeURIComponent(parentEmail)}/children`)
      .then((r) => r.json());
    const child = children.find((c) => c.id === studentId);

    const expectedLearningJourney = formatStudyTime(child.studyTimeMinutes);
    const expectedMissionProgress = `${child.completedTopics.length}${child.totalTopics ? ` / ${child.totalTopics}` : ' topics'}`;
    const expectedGrowthPoints = child.xpPoints.toLocaleString();

    const learningJourneyValue = page
      .getByText('Learning Journey', { exact: true })
      .locator('xpath=../..');
    await expect
      .poll(
        () => learningJourneyValue.getByText(expectedLearningJourney, { exact: true }).count(),
        {
          timeout: 40000,
        },
      )
      .toBeGreaterThan(0);

    const missionProgressValue = page
      .getByText('Mission Progress', { exact: true })
      .locator('xpath=../..');
    await expect
      .poll(
        () => missionProgressValue.getByText(expectedMissionProgress, { exact: true }).count(),
        {
          timeout: 40000,
        },
      )
      .toBeGreaterThan(0);

    const growthPointsValue = page
      .getByText('Growth Points', { exact: true })
      .locator('xpath=../..');
    await expect
      .poll(() => growthPointsValue.getByText(expectedGrowthPoints, { exact: true }).count(), {
        timeout: 40000,
      })
      .toBeGreaterThan(0);
  });

  test('completing a Social Studies quiz with a perfect score shows up in Subject Performance', async ({
    context,
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const parentEmail = accountFor(PARENT).email;
    const studentEmail = accountFor(STUDENT).email;

    // student-parent-f is seeded NCERT (accounts.js) - real quiz screens for
    // NCERT students fire eventType 'ncert_quiz_result' (trackQuizResult
    // picks this automatically from curriculum). Only writes an
    // analytics_events row - never touches student_stats, so this is safe
    // to run in parallel with the topic/study-time test above.
    await trackQuizResult(request, {
      studentEmail,
      curriculum: 'NCERT',
      topic: 'e2e-social-studies-quiz',
      subject: 'Social Studies',
      score: 100,
    });

    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    // Subject Performance renders "{subject}" and "{Math.round(avgScore)}%"
    // as siblings inside the same subjectRow (ParentDashboardScreen.tsx
    // line 806-816) - scope to that row so a 100% score elsewhere on the
    // page (e.g. Weekly Progress ring) can't accidentally satisfy this.
    const subjectRow = page.getByText('Social Studies', { exact: true }).locator('xpath=../..');
    await expect
      .poll(() => subjectRow.getByText('100%', { exact: true }).count(), {
        timeout: 40000,
        message: 'Social Studies did not appear in Subject Performance with a 100% score',
      })
      .toBeGreaterThan(0);
  });

  test('tapping "View All Highlights" routes to the Progress & Reports screen', async ({
    context,
    page,
  }) => {
    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    // navigation.navigate('ParentProgress') (ParentDashboardScreen.tsx line
    // 792) - ParentProgressScreen's own Header renders title="Progress &
    // Reports" (ParentProgressScreen.tsx line 271), not a guessed heading.
    // Pure navigation, no mutation - safe alongside the other parent-f tests.
    await page.getByText('View All Highlights', { exact: true }).click();
    await expect(page.getByText('Progress & Reports', { exact: true })).toBeVisible({
      timeout: 15000,
    });
  });

  test('an unread message triggers the dashboard alert banner and routes to Messages', async ({
    context,
    page,
    request,
  }) => {
    const parentEmail = accountFor(PARENT).email;
    const teacherEmail = accountFor('teacher-a').email;

    // Real send endpoint (POST /messages) - the same call any sender uses.
    // Confirmed via code read (routes/messages.js notifications-summary):
    // a parent's unreadAssignments can never be > 0 - "Assignment
    // notifications are for STUDENTS only... parents are notified via real
    // messages" - so the message branch is the only real way to trigger
    // this banner for a parent account. teacher-a is read-only but sending
    // it a message doesn't mutate teacher-a itself, only parent-f's inbox -
    // a different domain from student_stats, safe alongside the other
    // parent-f tests.
    await request.post('/messages', {
      data: {
        senderEmail: teacherEmail,
        senderName: 'E2E Teacher A',
        senderRole: 'teacher',
        recipientEmail: parentEmail,
        recipientName: 'E2E Parent F',
        content: `E2E alert-banner check ${Date.now()}`,
      },
    });

    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    // The banner text is "{unreadCount} new message{s}" (line 447) - not
    // exact since the count itself isn't asserted here, just that a real
    // unread message produced a real, clickable banner.
    const messageBanner = page
      .getByText(/new message/i)
      .filter({ visible: true })
      .first();
    await expect(messageBanner).toBeVisible({ timeout: 15000 });
    await messageBanner.click();
    await expect(page.getByText('Messages', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
  });
});

// ── parent-f2 / student-parent-f2 ────────────────────────────────────────
// Attendance DISPLAY only (no mutation) - isolated from the marking test
// below so its own read-then-check window can't be disturbed by a
// concurrent write to the same student's attendance table.
test.describe('Parent Dashboard - Weekly Snapshot (parent-f2 group)', () => {
  const PARENT = 'parent-f2';
  const STUDENT = 'student-parent-f2';
  test.use({ storageState: statePath(PARENT) });

  test('Attendance Record shows real attendance data, and View Monthly Logs opens the attendance history', async ({
    context,
    page,
    request,
  }) => {
    const parentEmail = accountFor(PARENT).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getChildIdByParentEmail(request, {
      parentEmail,
      childEmail: studentEmail,
    });

    const attendance = await request
      .get(`/attendance/student/${studentId}/summary`)
      .then((r) => r.json());

    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    await expect(page.getByText('Attendance Record', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText(`Overall attendance: ${attendance.summary.ratePct}%`, { exact: false }),
    ).toBeVisible();

    await page.getByText('View Monthly Logs', { exact: true }).click();
    await expect(
      page
        .getByText(/'s Attendance$/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({
      timeout: 15000,
    });
  });
});

// ── parent-f3 / student-parent-f3 ────────────────────────────────────────
// Marks a NEW attendance record - isolated from the display-only test
// above (see that test's comment).
test.describe('Parent Dashboard - Weekly Snapshot (parent-f3 group)', () => {
  const PARENT = 'parent-f3';
  const STUDENT = 'student-parent-f3';
  test.use({ storageState: statePath(PARENT) });

  test('marking a new attendance record via the API updates the Attendance Record card', async ({
    context,
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const parentEmail = accountFor(PARENT).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getChildIdByParentEmail(request, {
      parentEmail,
      childEmail: studentEmail,
    });

    // Attendance is fetched only when selectedChild.id changes (line
    // 346-383), NOT on the dashboard's 30s poll (that poll only re-fetches
    // the `children` list, line 321-344) - confirmed via code read. So
    // unlike Learning Mood/Highlights below, this genuinely does NOT
    // auto-refresh in the background; loading the page AFTER mutating is
    // the correct way to observe a real change here, not a workaround.
    const before = await request
      .get(`/attendance/student/${studentId}/summary`)
      .then((r) => r.json());

    // A unique, far-future marker date so this never collides with a real
    // date or a previous test run's marker - each run adds exactly one new
    // 'absent' day rather than flipping an existing one back and forth.
    const markerDate = `2099-01-${String((before.summary.total % 27) + 1).padStart(2, '0')}`;
    await markAttendance(request, { date: markerDate, studentId, status: 'absent' });

    // Read-only expected-value lookup: fetches the post-mutation totals
    // purely to compute what the UI SHOULD show next - not an assertion in
    // itself. Synchronization/verification happens entirely through the
    // browser below.
    const after = await request
      .get(`/attendance/student/${studentId}/summary`)
      .then((r) => r.json());

    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    await expect(page.getByText(`Overall attendance: ${after.summary.ratePct}%`)).toBeVisible({
      timeout: 15000,
    });
    // See assertAttendanceStat's comment - Present/Absent/Late/Total Days
    // can share the same value, so this scopes to each stat's own label
    // rather than searching the whole card for a bare number.
    await assertAttendanceStat(page, 'Absent', after.summary.absent);
    await assertAttendanceStat(page, 'Total Days', after.summary.total);
  });
});

// ── parent-f4 / student-parent-f4 ────────────────────────────────────────
// Activity Overview graph - isolated because it mutates studyTimeMinutes,
// which the topic/study-time test and the Top Interest test also touch.
test.describe('Parent Dashboard - Weekly Snapshot (parent-f4 group)', () => {
  const PARENT = 'parent-f4';
  const STUDENT = 'student-parent-f4';
  test.use({ storageState: statePath(PARENT) });

  test("logging 2 hours of study today updates today's bar in the Activity Overview graph", async ({
    context,
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const parentEmail = accountFor(PARENT).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getChildIdByParentEmail(request, {
      parentEmail,
      childEmail: studentEmail,
    });

    // Real endpoint the app itself calls for the graph (line 349,
    // GET /student/:id/weekly) - read today's starting minutes first, since
    // study-time is an atomic DB-side increment, not an absolute set (see
    // logStudyTime's comment) - other activity in this account could already
    // have logged time today.
    //
    // KNOWN RISK, not fixed here: "today" is computed client-side
    // (Playwright's local clock), same as the server does internally
    // (routes/student.js line 492, its own `new Date()`) - if the two
    // environments ever run in different timezones, a test right around
    // midnight could disagree with the server on which day is "today" and
    // become flaky. The server DOES compute a `future` flag per day
    // internally but never includes it in the JSON response (line 522-529),
    // so there's currently no way to derive "today" from the API response
    // alone without a server-side change. Left as a flagged gap rather than
    // silently changing the API contract in a test-only session.
    const todayName = WEEK_DAYS_ORDER[new Date().getDay()];
    const before = await request.get(`/student/${studentId}/weekly`).then((r) => r.json());
    const beforeMins = (before?.days ?? []).find((d) => d.day === todayName)?.studyMinutes ?? 0;

    // 2 hours, same as a real lesson screen logs while a student works
    // through it (source: 'learningPath' - see logStudyTime's comment).
    await logStudyTime(request, studentId, { minutes: 120, subject: 'Mathematics' });

    // The graph is fetched only when selectedChild.id changes (line
    // 346-383), NOT on the dashboard's 30s poll - confirmed via code read,
    // same real limitation as Attendance/Subject Performance above. Load
    // AFTER mutating, not before, since this widget genuinely doesn't
    // self-refresh in the background.
    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    const expectedMins = beforeMins + 120;
    const expectedLabel = formatStudyTime(expectedMins);

    // The day label ("Mon"/"Tue"/...) and its time label sit in the same
    // barColumn - scope to today's column so this can't match a stale
    // label from a different day (ParentDashboardScreen.tsx line 741-745).
    const todayColumn = page.getByText(todayName, { exact: true }).locator('xpath=..');
    await expect(todayColumn.getByText(expectedLabel, { exact: true })).toBeVisible({
      timeout: 15000,
    });
  });
});

// ── parent-f5 / student-parent-f5 ────────────────────────────────────────
// Learning Mood, sets currentStreak=3 - isolated from the Learning
// Highlights test below, which sets currentStreak=4.
test.describe('Parent Dashboard - Weekly Snapshot (parent-f5 group)', () => {
  const PARENT = 'parent-f5';
  const STUDENT = 'student-parent-f5';
  test.use({ storageState: statePath(PARENT) });

  test("Learning Mood's label and message change to match the child's real streak/study-time", async ({
    context,
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const parentEmail = accountFor(PARENT).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getChildIdByParentEmail(request, {
      parentEmail,
      childEmail: studentEmail,
    });

    // Mood formula (ParentDashboardScreen.tsx line 831-840):
    //   currentStreak >= 3           -> 'Focused' / "{streak}-day streak going strong"
    //   else studyTimeMinutes > 60   -> 'Active'   / "{formatStudyTime} total study time"
    //   else                         -> 'Warming Up' / "Just getting started"
    // Mood is derived from the `children` list, which the dashboard re-polls
    // every 30s (line 321-344) regardless of which child is selected - load
    // the page BEFORE mutating and never reload/goto again, so this only
    // passes if the screen genuinely refreshed itself in the background.
    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    // Push the streak to 3+ via the same full-stats-sync endpoint the app's
    // own client tabs use (PUT /student/:id) - nothing else writes
    // current_streak (confirmed via code read, see achievements.spec.js).
    await request.put(`/student/${studentId}`, { data: { currentStreak: 3 } });

    await expect
      .poll(() => page.getByText('Focused', { exact: true }).count(), { timeout: 40000 })
      .toBeGreaterThan(0);
    await expect(page.getByText('3-day streak going strong', { exact: true })).toBeVisible();
  });
});

// ── parent-f6 / student-parent-f6 ────────────────────────────────────────
// Learning Highlights, sets xpPoints=777 + currentStreak=4 - isolated from
// the Learning Mood test above (see its comment).
test.describe('Parent Dashboard - Weekly Snapshot (parent-f6 group)', () => {
  const PARENT = 'parent-f6';
  const STUDENT = 'student-parent-f6';
  test.use({ storageState: statePath(PARENT) });

  test("Learning Highlights' XP and streak rows update to match the child's real performance", async ({
    context,
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const parentEmail = accountFor(PARENT).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getChildIdByParentEmail(request, {
      parentEmail,
      childEmail: studentEmail,
    });

    // Highlight rows (ParentDashboardScreen.tsx line 758-779):
    //   xpPoints > 0     -> "New Personal Best" / "XP points: {xpPoints.toLocaleString()}"
    //   currentStreak>=1 -> "{currentStreak}-Day Streak" / "Consistent daily learning"
    // Also derived from the polled `children` list (line 321-344) - same as
    // Learning Mood above, load first and never reload, so this only passes
    // if the 30s auto-refresh genuinely picks the change up.
    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    // Set via the same full-stats-sync endpoint the app's own client tabs
    // use (PUT /student/:id).
    await request.put(`/student/${studentId}`, { data: { xpPoints: 777, currentStreak: 4 } });

    await expect
      .poll(() => page.getByText('New Personal Best', { exact: true }).count(), { timeout: 40000 })
      .toBeGreaterThan(0);
    await expect(page.getByText('XP points: 777', { exact: true })).toBeVisible();
    await expect(page.getByText('4-Day Streak', { exact: true })).toBeVisible();
    await expect(page.getByText('Consistent daily learning', { exact: true })).toBeVisible();
  });
});

// ── parent-f7 / student-parent-f7 ────────────────────────────────────────
// Top Interest / Learning Style / Study Time chips + AI Weekly Insight -
// isolated because it mutates completedTopics + studyTimeMinutes, which the
// topic/study-time test and the Activity Overview graph test also touch.
test.describe('Parent Dashboard - Weekly Snapshot (parent-f7 group)', () => {
  const PARENT = 'parent-f7';
  const STUDENT = 'student-parent-f7';
  test.use({ storageState: statePath(PARENT) });

  test('the Top Interest / Learning Style / Study Time chips and AI Weekly Insight update after real activity, without a reload', async ({
    context,
    page,
    request,
  }) => {
    test.setTimeout(60000);

    const parentEmail = accountFor(PARENT).email;
    const studentEmail = accountFor(STUDENT).email;
    const studentId = await getChildIdByParentEmail(request, {
      parentEmail,
      childEmail: studentEmail,
    });

    // Same source as Learning Mood/Highlights above - the insight chips and
    // AI Weekly Insight headline are also derived from the polled
    // `children` list (line 486-598), so load first and never reload.
    await applySession(context, PARENT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    // Topic strings use a real "Subject|Topic" convention (topSubjectFor
    // splits on '|' - ParentDashboardScreen.tsx line 493-501), so this is
    // the same shape completeLesson calls use elsewhere in this suite, not
    // an invented format.
    await completeLesson(request, studentId, {
      topic: `Science|e2e-insight-topic-${Date.now()}`,
      subject: 'Science',
    });
    // Push study time over the "Deep Explorer" threshold (>=120 min,
    // line 503) so Learning Style also has a real, checkable change.
    await logStudyTime(request, studentId, { minutes: 130, subject: 'Science' });

    const child = await request
      .get(`/parent/${encodeURIComponent(parentEmail)}/children`)
      .then((r) => r.json())
      .then((children) => children.find((c) => c.id === studentId));

    const topInterestTile = page.getByText('Top Interest', { exact: true }).locator('xpath=../..');
    await expect
      .poll(() => topInterestTile.getByText('Science', { exact: true }).count(), { timeout: 40000 })
      .toBeGreaterThan(0);

    // studyTimeMinutes >= 120 -> 'Deep Explorer' (line 503).
    const learningStyleTile = page
      .getByText('Learning Style', { exact: true })
      .locator('xpath=../..');
    await expect(learningStyleTile.getByText('Deep Explorer', { exact: true })).toBeVisible();

    // studyTimeMinutes >= 60 -> "{hours}h logged this month" (line 506-508).
    const expectedHours = Math.round(child.studyTimeMinutes / 60);
    const studyTimeTile = page.getByText('Study Time', { exact: true }).locator('xpath=../..');
    await expect(
      studyTimeTile.getByText(`${expectedHours}h logged this month`, { exact: true }),
    ).toBeVisible();

    // AI Weekly Insight headline picks up the same new topic.
    await expect(
      page.getByText(`${child.name} is progressing well in`, { exact: false }),
    ).toBeVisible();
  });
});
