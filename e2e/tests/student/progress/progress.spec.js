// This file tests the STUDENT MY PROGRESS screen (ProgressScreen.tsx) -
// the overall-completion hero ring, XP-to-next-level bar, weekly/monthly
// activity bar chart, completed-topic chips, and the achievements grid.
//
// ── Business rules confirmed by reading the source ──────────────────────
// - overallPct = round(completedTopics.size / stats.totalTopics * 100),
//   clamped to 100; 0 if totalTopics is 0. Drives both the ring and the
//   hero title copy: 0% -> "Ready to start learning!", <50% -> "Great
//   start, keep going!", <80% -> "Amazing progress this week!", else
//   "Outstanding work!".
// - Weekly Activity: GET /student/:id/weekly?range=week|month.
//   FIXED APPLICATION BUG (this session): the "Month" tab used to only
//   flip local `periodTab` state - there was exactly one useEffect
//   fetching weeklyDays and it wasn't keyed on periodTab, so "Month" never
//   fetched anything of its own and just re-showed the same week's data.
//   Fixed by (a) adding a `range` query param to GET /student/:id/weekly
//   (week = current Mon-Sun, month = 1st-to-last-day of the current
//   calendar month, both zeroing future days) and (b) keying the screen's
//   fetch effect on periodTab too, so switching tabs now genuinely
//   refetches and re-renders different data. Tested below as the
//   now-correct behavior.
// - Subject Performance section has been REMOVED from the screen entirely
//   (product decision, not an app bug) - no longer fetches /curriculum,
//   no longer renders. Nothing in this file references it.
// - Achievements are computed entirely from real `stats` (GET /student/:id
//   via StudentDataContext) - 8 fixed milestones, each independently
//   unlocked/locked; never fetched separately, so they cannot be tested via
//   mocking without also mocking the student stats endpoint.
// - Completed Topics section only renders at all when completedSet.size > 0
//   (no "empty" copy - the whole section, header included, is omitted).
// - Loading state gates the WHOLE screen (`loading`, now also re-set to
//   true on every periodTab switch so the tab genuinely reflects a fresh
//   fetch - see FIXED APPLICATION BUG above). Even a fetch() rejection
//   clears it via the .catch(() => ({days: []})) fallback, so loading can
//   never hang forever on a network failure.
//
// ── Test data strategy ──────────────────────────────────────────────────
// This screen has no student-driven mutation path in its own UI (no "add
// topic" button - topics are completed elsewhere, e.g. Learning Paths), so
// every test here uses either:
//   1. MOCKED /student/:id/weekly responses (page.route) - full control
//      over week vs. month bar data, loading delay, and error/malformed-
//      response edge cases.
//   2. The REAL, read-only GET /student/:id response for student-a (never
//      mocked) - to prove the hero stats/achievements are genuinely wired
//      to the real backend, cross-checked against a live read-only lookup
//      (CLAUDE.md-allowed) rather than a hardcoded expected value.
// No account is mutated by this file at all - student-a (mutable: false)
// is safe to use throughout.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { getUserIdByEmail, getStudentStats } from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  statValue,
  heroTitle,
  heroSub,
  overallPctText,
  periodTab,
  emptyWeeklyMessage,
  achievementLockedText,
  unlockedCountText,
} from '../../helpers/progressLocators.js';

const ACCOUNT = 'student-a';

async function openProgress(page) {
  // '/progress' is explicitly listed in server/index.js's SPA_PATHS and
  // does not collide with any REST route (only '/student/*' is registered
  // under that prefix) - confirmed by reading server/index.js, same
  // reasoning other openX() helpers in this repo document for their own
  // routes.
  await page.goto('/progress');
  await expect(page.getByText('My Progress', { exact: true }).first()).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
}

function weekDays({ studyMinutes = [0, 0, 0, 0, 0, 0, 0], xp = [0, 0, 0, 0, 0, 0, 0], topics = [0, 0, 0, 0, 0, 0, 0] } = {}) {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return {
    days: names.map((day, i) => ({
      date: `2026-08-${String(3 + i).padStart(2, '0')}`,
      day,
      studyMinutes: studyMinutes[i],
      xp: xp[i],
      topicsCompleted: topics[i],
    })),
  };
}

async function mockWeekly(page, data, { status = 200 } = {}) {
  await page.route('**/student/*/weekly*', (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) }),
  );
}

// Serves DIFFERENT data depending on the request's own range=week|month
// query param - lets a test prove the two tabs genuinely fetch separately,
// rather than trusting a single fixed mock.
async function mockWeeklyByRange(page, { week, month }) {
  await page.route('**/student/*/weekly*', (route) => {
    const url = new URL(route.request().url());
    const data = url.searchParams.get('range') === 'month' ? month : week;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
}

test.describe('Student Progress - navigation, loading, weekly activity (mocked)', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('sidebar navigates to My Progress and the real hero stats render', async ({ page }) => {
    await page.goto('/dashboard');
    await dismissAnnouncementIfPresent(page);
    // Two copies of the sidebar exist at once (mobile + desktop layout) -
    // same duplicate-layout situation other spec files in this repo
    // document for their own sidebar clicks (e.g. bedtime-stories'
    // story-list.spec.js) - the visible, topmost (last) one is the real one.
    await page.getByText('Progress', { exact: true }).filter({ visible: true }).last().click();
    await expect(page.getByText('My Progress', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Track your growth and achievements, .+\./)).toBeVisible();
    await expect(overallPctText(page)).toBeVisible();
  });

  test('shows a loading spinner before content renders', async ({ page }) => {
    await page.route('**/student/*/weekly*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(weekDays()) });
    });
    const navigation = page.goto('/progress');
    await expect(page.getByText('Loading your progress…', { exact: true })).toBeVisible({ timeout: 10000 });
    await navigation;
  });

  test('empty week (no activity) shows the empty-bar message and zeroed totals', async ({ page }) => {
    await mockWeekly(page, weekDays());
    await openProgress(page);
    await expect(emptyWeeklyMessage(page)).toBeVisible({ timeout: 15000 });
    await expect(statValue(page, 'Total Study')).toHaveText('0m');
    await expect(statValue(page, 'XP Earned')).toHaveText('+0');
    await expect(statValue(page, 'Topics')).toHaveText('0');
  });

  test('a real week of activity renders the correct bars, minute labels, and totals', async ({ page }) => {
    await mockWeekly(page, weekDays({ studyMinutes: [20, 0, 45, 10, 0, 60, 5], xp: [40, 0, 90, 20, 0, 120, 10], topics: [1, 0, 2, 0, 0, 3, 0] }));
    await openProgress(page);
    await expect(emptyWeeklyMessage(page)).toHaveCount(0);
    // Minute labels only render for non-zero days (Tue/Fri have 0 minutes,
    // so "0m" must NOT appear as a bar label - confirmed from source:
    // `{d.studyMinutes > 0 ? \`${d.studyMinutes}m\` : ''}`).
    await expect(page.getByText('20m', { exact: true })).toBeVisible();
    await expect(page.getByText('45m', { exact: true })).toBeVisible();
    await expect(page.getByText('60m', { exact: true })).toBeVisible();
    // Totals are real sums, not copied from any single day.
    await expect(statValue(page, 'Total Study')).toHaveText('2h 20m'); // 20+0+45+10+0+60+5 = 140
    await expect(statValue(page, 'XP Earned')).toHaveText('+280');
    await expect(statValue(page, 'Topics')).toHaveText('6');
  });

  test('switching to the "Month" tab actually refetches and shows different data (FIXED - was a known bug)', async ({ page }) => {
    await mockWeeklyByRange(page, {
      week:  weekDays({ studyMinutes: [30, 0, 0, 0, 0, 0, 0], xp: [60, 0, 0, 0, 0, 0, 0], topics: [1, 0, 0, 0, 0, 0, 0] }),
      month: weekDays({ studyMinutes: [30, 0, 0, 0, 0, 0, 200], xp: [60, 0, 0, 0, 0, 0, 400], topics: [1, 0, 0, 0, 0, 0, 5] }),
    });
    await openProgress(page);
    await expect(statValue(page, 'Total Study')).toHaveText('30m');

    await periodTab(page, 'Month').click();
    // Real request query param genuinely changes to range=month, and the
    // server-computed totals for the month response are what render - not
    // the week's stale figures.
    await expect(statValue(page, 'Total Study')).toHaveText('3h 50m'); // 30 + 200 = 230
    await expect(statValue(page, 'XP Earned')).toHaveText('+460');
    await expect(statValue(page, 'Topics')).toHaveText('6');

    await periodTab(page, 'Week').click();
    await expect(statValue(page, 'Total Study')).toHaveText('30m');
  });

  test('a weekly fetch failure does not hang loading forever (falls back to empty week)', async ({ page }) => {
    await page.route('**/student/*/weekly*', (route) => route.abort('failed'));
    await openProgress(page);
    // Confirmed from source: fetch(...).catch(() => ({ days: [] })) - a
    // thrown/aborted fetch resolves to an empty week, loading still clears,
    // and the empty-bar message renders instead of a hung spinner.
    await expect(emptyWeeklyMessage(page)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Loading your progress…')).toHaveCount(0);
  });

  test('a malformed (non-object) weekly response is handled without crashing the screen', async ({ page }) => {
    await mockWeekly(page, []); // .days is undefined on an array
    await openProgress(page);
    // Confirmed from source: `weekly.days ?? []` - undefined .days falls
    // back to an empty array safely, no crash, empty-bar state renders.
    await expect(emptyWeeklyMessage(page)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('My Progress', { exact: true }).first()).toBeVisible();
  });
});

test.describe('Student Progress - real account integration (read-only)', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('hero stats and achievements match the real GET /student/:id response', async ({ page, request }) => {
    // Read-only expected-value lookup (CLAUDE.md) - the exact same request
    // the app itself makes, used only to compute what the UI SHOULD show,
    // never asserted on directly.
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const real = await getStudentStats(request, studentId);

    await openProgress(page);

    await expect(statValue(page, 'XP Points')).toHaveText(real.xpPoints.toLocaleString());
    await expect(statValue(page, 'Day Streak')).toHaveText(String(real.currentStreak));
    await expect(statValue(page, 'Topics Done')).toHaveText(String((real.completedTopics ?? []).length));
    await expect(statValue(page, 'Credits')).toHaveText(String(Math.floor(real.xpPoints / 100)));

    // Achievement unlock state is a pure function of the same real stats -
    // cross-checked against the actual documented milestone thresholds.
    const completedCount = (real.completedTopics ?? []).length;
    const expectUnlocked = async (label, unlocked) => {
      if (unlocked) {
        await expect(achievementLockedText(page, label)).toHaveCount(0);
      } else {
        await expect(achievementLockedText(page, label)).toBeVisible();
      }
    };
    await expectUnlocked(`${real.currentStreak}-Day Streak`, real.currentStreak >= 1);
    await expectUnlocked('First Topic', completedCount >= 1);
    await expectUnlocked('5 Topics Done', completedCount >= 5);
    await expectUnlocked('10 Topics Done', completedCount >= 10);
    await expectUnlocked('500 XP', real.xpPoints >= 500);
    await expectUnlocked('1 Hour Studied', real.studyTimeMinutes >= 60);
    await expectUnlocked('Level 2+', real.level >= 2);
    await expectUnlocked('Challenge Done', real.challengesCompleted >= 1);

    const unlockedTotal = [
      real.currentStreak >= 1,
      completedCount >= 1,
      completedCount >= 5,
      completedCount >= 10,
      real.xpPoints >= 500,
      real.studyTimeMinutes >= 60,
      real.level >= 2,
      real.challengesCompleted >= 1,
    ].filter(Boolean).length;
    await expect(unlockedCountText(page)).toHaveText(`${unlockedTotal}/8 unlocked`);
  });

  test('the overall ring/title and hero subtitle reflect the real completion percentage', async ({ page, request }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const real = await getStudentStats(request, studentId);
    const completedCount = (real.completedTopics ?? []).length;
    const total = real.totalTopics ?? 0;
    const expectedPct = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;

    await openProgress(page);

    await expect(overallPctText(page)).toHaveText(`${expectedPct}%`);
    const expectedTitle =
      expectedPct === 0 ? 'Ready to start learning!' :
      expectedPct < 50  ? 'Great start, keep going!' :
      expectedPct < 80  ? 'Amazing progress this week!' :
                           'Outstanding work!';
    await expect(heroTitle(page)).toHaveText(expectedTitle);
    await expect(heroSub(page)).toHaveText(
      `${completedCount} of ${total} topics completed · ${real.currentStreak}-day streak · Level ${real.level}`,
    );
  });

  test('reloading the page preserves the same real progress values', async ({ page, request }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const real = await getStudentStats(request, studentId);

    await openProgress(page);
    await expect(statValue(page, 'XP Points')).toHaveText(real.xpPoints.toLocaleString(), { timeout: 15000 });

    await page.reload();
    await dismissAnnouncementIfPresent(page);
    await expect(page.getByText('My Progress', { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(statValue(page, 'XP Points')).toHaveText(real.xpPoints.toLocaleString());
    await expect(statValue(page, 'Day Streak')).toHaveText(String(real.currentStreak));
  });
});
