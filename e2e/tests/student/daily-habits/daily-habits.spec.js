// This file tests the STUDENT DAILY HABITS screen (DailyHabitsScreen.tsx) -
// where a student checks off parent-assigned daily tasks to earn coins and
// build a streak.
//
// We test:
// 1. Navigation (sidebar link) + real stat values on load.
// 2. Loading state (spinner before content).
// 3. Empty state (zero parent-assigned tasks).
// 4/5. Error states - a real server error and a real network failure both
//    show a proper "Could not load habits" message (see FIXED APPLICATION
//    BUGS below for what this looked like before the fix).
// 6. A real parent-assigned habit renders with its real label/coins.
// 7/8. Checking and unchecking a habit - real coin/streak/progress deltas,
//    verified against the real underlying state (checkbox color, coin-pop,
//    Today count, Total Coins), not just "something changed".
// 9. Persistence across a reload.
// 10. Auto-refresh: a task a parent adds while the screen is already open
//    appears without a manual reload (DailyHabitsScreen.tsx polls every 10s).
// 11. Streak milestone: reaching a 10-day streak shows the real milestone
//    banner with the correct copy - see seedHabitStreak.js for why direct
//    DB seeding is the only way to test this at all.
//
// ── Business rules confirmed by reading the source ──────────────────────
// - Habits are ENTIRELY parent-assigned - DailyHabitsScreen.tsx's own
//   comment: "Parent-assigned tasks (only source of habits)". There is no
//   student-side "add habit" action at all - the only way to get a habit
//   onto this screen is the parent's own POST /habits/parent-tasks, which
//   this file's setup calls directly (this is a DIFFERENT persona's action
//   the student's journey depends on - explicitly allowed as setup under
//   CLAUDE.md's E2E Persona Rule, same pattern as challenges.spec.js
//   assigning a challenge to a student on the parent's behalf).
// - Checking a habit toggles it (POST /habits/checkin - same endpoint,
//   already-checked -> uncheck, coinsChange negative; not-yet-checked ->
//   check, coinsChange = the habit's own coins value).
// - The Sidebar.tsx/DrawerContent.tsx "PRO" badge on Daily Habits (and
//   Bedtime Stories) has been removed - see FIXED APPLICATION BUGS below.
//
// ── FIXED APPLICATION BUGS (found while running this suite, then fixed in
// the app - not worked around in the tests) ──────────────────────────────
// 1. CRASH BUG (fixed): fetchData() used to never check res.ok, so a real
//    server error (e.g. 500 with a `{ error: ... }` body) still satisfied
//    `data` truthily. The progress card's `+{data.today.coinsEarned} coins`
//    accessed `.coinsEarned` directly on `data.today` with no optional
//    chaining - a malformed body with no `.today` threw
//    `Cannot read properties of undefined (reading 'coinsEarned')`, and
//    with no error boundary, that uncaught exception unmounted the ENTIRE
//    React tree (not just the data section - the Header disappeared too).
//    Fixed by (a) checking res.ok in fetchData() and throwing before
//    setData() ever runs on a bad response, and (b) adding `?.` to the
//    coinsEarned access as defense-in-depth. Now: `error` state is shown,
//    "Daily Habits" header still renders, no crash - see test below.
// 2. SILENT-BLANK BUG (fixed): if the fetch() call itself threw (network
//    failure/abort, not just a non-2xx response), the catch{} block was
//    empty - `data` stayed null forever and the whole content block (gated
//    on `data &&`) rendered nothing, with no error message or retry option.
//    Fixed by adding a real `error` useState, set in the catch block and
//    rendered as "Could not load habits. Please try again." - see test
//    below.
// Both are tested below as the screen's now-correct behavior (previously
// these were "KNOWN BUG" tests asserting the broken behavior on purpose;
// renamed and rewritten now that the fix is verified live).
//
// ── Account choice ────────────────────────────────────────────────────────
// student-a (shared, read-only) for anything that must see a GUARANTEED
// empty/predictable state (nav/loading/empty/error tests) - no spec, this
// one included, ever creates parent_daily_tasks for student-a.
//
// student-parent-d / parent-d (mutable) for anything that needs a REAL
// habit task - reused from tests/parent/challenges/challenges.spec.js.
// Confirmed safe to share (see accounts.js's updated OWNERSHIP note):
// habits_checkins/parent_daily_tasks/student_preferences.total_coins is a
// completely separate domain from that file's challenge_assignments/
// student_stats writes. Each test below creates its own uniquely-labeled
// task and deletes ONLY that task afterwards (never a file-wide cleanup),
// and every stat/count assertion re-reads the real total via a fresh
// read-only API lookup immediately before comparing (never a hardcoded
// expected total) - both needed because this repo's fullyParallel config
// means other tests in THIS file may be creating their own tasks for the
// same shared child at the same moment.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import {
  getChildIdByParentEmail,
  getHabitsToday,
  createHabitTask,
  deleteHabitTask,
} from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import { seedBackdatedCheckins, clearHabitCheckins } from '../../helpers/seedHabitStreak.js';
import {
  statTileValue,
  progressSummaryText,
  emptyHabitsMessage,
  habitCard,
  habitCheckbox,
  habitCoinPop,
} from '../../helpers/dailyHabitsLocators.js';

const ACCOUNT_EMPTY = 'student-a';
const ACCOUNT_MAIN = 'student-parent-d';

// GOLD from DailyHabitsScreen.tsx - the checked checkbox's real
// backgroundColor. Confirmed via a live DOM dump: unchecked is
// `rgba(0, 0, 0, 0)`, checked is this exact color.
const GOLD_RGB = 'rgb(186, 164, 103)';
const TRANSPARENT_RGB = 'rgba(0, 0, 0, 0)';

async function openDailyHabits(page) {
  // '/daily-habits' (LINKING_SCREENS in App.tsx) does not collide with any
  // backend REST route (only '/habits/*' is registered - confirmed by
  // reading server/index.js), unlike Bedtime Stories' '/stories' collision -
  // so a direct goto is safe here, same reasoning worldLocators.js's
  // openWorldAndYou() documents for its own non-colliding route.
  await page.goto('/daily-habits');
  await expect(page.getByText('Daily Habits', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  });
  await dismissAnnouncementIfPresent(page);
}

test.describe('Student Daily Habits - navigation, loading, empty, error states', () => {
  test.use({ storageState: statePath(ACCOUNT_EMPTY) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT_EMPTY);
  });

  test('sidebar "Daily Habits" link navigates to the real screen (no PRO badge)', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await dismissAnnouncementIfPresent(page);
    // Two copies of the sidebar exist at once (mobile + desktop layout) -
    // same duplicate-layout situation dashboard.spec.js documents.
    await page
      .getByText('Daily Habits', { exact: true })
      .filter({ visible: true })
      .last()
      .click();

    await expect(page.getByText('Build your best self, one day at a time', { exact: true })).toBeVisible({
      timeout: 15000,
    });
  });

  test('page loads with real stat values from the API', async ({ page, request }) => {
    // Read-only expected-value lookup (CLAUDE.md) - the same data
    // DailyHabitsScreen.tsx itself fetches, used only to compute the real
    // expected numbers to compare the UI against.
    const expected = await getHabitsToday(request, accountFor(ACCOUNT_EMPTY).email);

    await openDailyHabits(page);

    await expect(statTileValue(page, 'Day Streak')).toHaveText(String(expected.streak));
    await expect(statTileValue(page, 'Total Coins')).toHaveText(String(expected.totalCoins));
    await expect(statTileValue(page, 'Today')).toHaveText(
      `${expected.today.completed.length}/${expected.parentTasks.length}`,
    );
  });

  test('shows a loading indicator before content arrives', async ({ page }) => {
    await page.route('**/habits/today?*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue();
    });

    await page.goto('/daily-habits');
    // ActivityIndicator gets a real role="progressbar" on web for free -
    // same technique already confirmed/used in challenges.spec.js.
    await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows the real empty-state message when the student has no assigned habits', async ({
    page,
    request,
  }) => {
    // Read-only confirmation that this account genuinely has zero tasks
    // right now, so the empty state we're about to assert is real, not
    // accidentally true because of a race.
    const expected = await getHabitsToday(request, accountFor(ACCOUNT_EMPTY).email);
    expect(expected.parentTasks.length, 'student-a must have zero parent_daily_tasks for this test to be meaningful').toBe(0);

    await openDailyHabits(page);

    await expect(emptyHabitsMessage(page)).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText('Ask your parent to assign daily habits for you.', { exact: true }),
    ).toBeVisible();
    await expect(statTileValue(page, 'Today')).toHaveText('0/0');
    await expect(progressSummaryText(page)).toHaveText('0 of 0 habits completed');
  });

  test('a malformed error response shows an error message instead of crashing (fixed)', async ({
    page,
  }) => {
    // Server-side failure that still returns a JSON body with no `.today`
    // field (e.g. a caught exception serialized as { error: ... }).
    // fetchData() now checks res.ok BEFORE calling setData(), so this
    // malformed body never reaches the render at all - confirmed live via a
    // captured `pageerror` listener that must stay empty.
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.route('**/habits/today?*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom' }) }),
    );

    await openDailyHabits(page);

    await expect(
      page.getByText('Could not load habits. Please try again.', { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    // The Header still renders (proven by openDailyHabits() itself already
    // waiting on it), and critically: no uncaught exception at all.
    expect(pageErrors).toEqual([]);
  });

  test('a network-level failure shows an error message instead of a silent blank screen (fixed)', async ({
    page,
  }) => {
    await page.route('**/habits/today?*', (route) => route.abort());

    await openDailyHabits(page);

    await expect(
      page.getByText('Could not load habits. Please try again.', { exact: true }),
    ).toBeVisible({ timeout: 15000 });
  });
});

// Creates a real parent-assigned task for a given parent/student pair -
// setup only (POST /habits/parent-tasks, the same endpoint the parent's own
// "Add Task" flow calls).
async function makeHabit(request, { parentKey, studentKey }, label, coins) {
  const parentEmail = accountFor(parentKey).email;
  const studentEmail = accountFor(studentKey).email;
  const childId = await getChildIdByParentEmail(request, { parentEmail, childEmail: studentEmail });
  const task = await createHabitTask(request, { parentEmail, childId, label, icon: 'star', coins });
  return { task, parentEmail, studentEmail };
}

// ── Account isolation note ──────────────────────────────────────────────
// Today/Total Coins are AGGREGATES across every habit a child has, not
// scoped to any one task - so two tests mutating them on the SAME account
// at the same time genuinely race (confirmed live: a first run of this file
// with all 4 of these tests sharing student-parent-d produced real
// intermittent failures - "4/3" instead of the expected "2/3", Total Coins
// off by another concurrent test's own delta). Per CLAUDE.md's own rule
// ("the fix is account isolation, not serialization"), each aggregate-
// dependent test below gets its OWN dedicated child, borrowed from other
// specs' already-seeded pairs (habits_checkins/parent_daily_tasks/
// student_preferences.total_coins is a separate domain from all of their
// own respective fields, confirmed by reading each one's routes before
// reusing it here - same reasoning as the parent-d/student-parent-d note
// above). Only the two NON-aggregate tests below (card presence,
// auto-refresh) still safely share student-parent-d with each other.

test.describe('Student Daily Habits - populated habit + auto-refresh (non-aggregate)', () => {
  test.use({ storageState: statePath(ACCOUNT_MAIN) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT_MAIN);
  });

  test('a real parent-assigned habit renders with its own label and coin value', async ({
    page,
    request,
  }) => {
    const label = `E2E Habit Render ${test.info().workerIndex}-${Date.now()}`;
    const { task } = await makeHabit(request, { parentKey: 'parent-d', studentKey: ACCOUNT_MAIN }, label, 6);
    try {
      await openDailyHabits(page);

      await expect(habitCard(page, label)).toBeVisible({ timeout: 15000 });
      await expect(habitCard(page, label).getByText('+6', { exact: true })).toBeVisible();
      // Real, not fake - the whole point of this test.
      await expect(habitCheckbox(page, label)).toHaveCSS('background-color', TRANSPARENT_RGB);
    } finally {
      await deleteHabitTask(request, task.id);
    }
  });

  test('a habit a parent adds while the screen is open appears without a manual reload', async ({
    page,
    request,
  }) => {
    // DailyHabitsScreen.tsx polls GET /habits/today every 10s
    // (setInterval(fetchData, 10*1000)) - give comfortable room over that.
    test.setTimeout(45000);

    const parentEmail = accountFor('parent-d').email;
    const studentEmail = accountFor(ACCOUNT_MAIN).email;
    const childId = await getChildIdByParentEmail(request, { parentEmail, childEmail: studentEmail });

    await openDailyHabits(page);
    // Never reload/re-visit after this point - proves the real background
    // poll works, not just "does a fresh load show correct data" (same
    // reasoning as challenges.spec.js's own auto-refresh test).

    const label = `E2E Habit AutoRefresh ${test.info().workerIndex}-${Date.now()}`;
    const task = await createHabitTask(request, { parentEmail, childId, label, icon: 'zap', coins: 2 });
    try {
      await expect(habitCard(page, label)).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteHabitTask(request, task.id);
    }
  });
});

test.describe('Student Daily Habits - checking a habit (aggregate stats)', () => {
  const ACCOUNT = 'student-parent-f';
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('checking a habit updates the checkbox, shows a coin pop, and increases Today + Total Coins by the real amount', async ({
    page,
    request,
  }) => {
    const label = `E2E Habit Check ${Date.now()}`;
    const { task, studentEmail } = await makeHabit(request, { parentKey: 'parent-f', studentKey: ACCOUNT }, label, 5);
    try {
      await openDailyHabits(page);
      await expect(habitCard(page, label)).toBeVisible({ timeout: 15000 });

      // Dedicated account (see the isolation note above) - no other test
      // mutates this account's habits, so a single baseline read is safe.
      const before = await getHabitsToday(request, studentEmail);
      const beforeToday = before.today.completed.length;
      const beforeCoins = before.totalCoins;

      await habitCard(page, label).click();

      // Real UI signal, not the API response: the checkbox actually turns
      // GOLD, and the transient "+N" coin-pop actually appears.
      await expect(habitCheckbox(page, label)).toHaveCSS('background-color', GOLD_RGB, {
        timeout: 10000,
      });
      await expect(habitCoinPop(page, label)).toBeVisible({ timeout: 5000 });
      await expect(habitCoinPop(page, label)).toContainText('+5');

      await expect(statTileValue(page, 'Today')).toHaveText(`${beforeToday + 1}/${before.parentTasks.length}`);
      await expect(statTileValue(page, 'Total Coins')).toHaveText(String(beforeCoins + 5));
      await expect(progressSummaryText(page)).toBeVisible();
    } finally {
      await deleteHabitTask(request, task.id);
    }
  });
});

test.describe('Student Daily Habits - unchecking a habit (aggregate stats)', () => {
  const ACCOUNT = 'student-parent-g';
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('unchecking a completed habit reverts the checkbox, Today count, and Total Coins', async ({
    page,
    request,
  }) => {
    const label = `E2E Habit Uncheck ${Date.now()}`;
    const { task, studentEmail } = await makeHabit(request, { parentKey: 'parent-g', studentKey: ACCOUNT }, label, 4);
    try {
      await openDailyHabits(page);
      await expect(habitCard(page, label)).toBeVisible({ timeout: 15000 });

      // Check it first (setup for this test's real subject: unchecking).
      await habitCard(page, label).click();
      await expect(habitCheckbox(page, label)).toHaveCSS('background-color', GOLD_RGB, {
        timeout: 10000,
      });
      const afterCheck = await getHabitsToday(request, studentEmail);

      await habitCard(page, label).click();

      await expect(habitCheckbox(page, label)).toHaveCSS('background-color', TRANSPARENT_RGB, {
        timeout: 10000,
      });
      await expect(statTileValue(page, 'Today')).toHaveText(
        `${afterCheck.today.completed.length - 1}/${afterCheck.parentTasks.length}`,
      );
      await expect(statTileValue(page, 'Total Coins')).toHaveText(String(afterCheck.totalCoins - 4));
    } finally {
      await deleteHabitTask(request, task.id);
    }
  });
});

test.describe('Student Daily Habits - persistence across reload (aggregate stats)', () => {
  const ACCOUNT = 'student-parent-f2';
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('a checked habit and its coins survive a reload (server-backed, not just client state)', async ({
    page,
    request,
  }) => {
    const label = `E2E Habit Persist ${Date.now()}`;
    const { task, studentEmail } = await makeHabit(request, { parentKey: 'parent-f2', studentKey: ACCOUNT }, label, 3);
    try {
      await openDailyHabits(page);
      await expect(habitCard(page, label)).toBeVisible({ timeout: 15000 });

      await habitCard(page, label).click();
      await expect(habitCheckbox(page, label)).toHaveCSS('background-color', GOLD_RGB, {
        timeout: 10000,
      });
      const afterCheck = await getHabitsToday(request, studentEmail);

      await page.reload();
      await dismissAnnouncementIfPresent(page);

      await expect(habitCard(page, label)).toBeVisible({ timeout: 15000 });
      await expect(habitCheckbox(page, label)).toHaveCSS('background-color', GOLD_RGB);
      await expect(statTileValue(page, 'Total Coins')).toHaveText(String(afterCheck.totalCoins));
    } finally {
      await deleteHabitTask(request, task.id);
    }
  });
});

test.describe('Student Daily Habits - streak milestone banner', () => {
  // Own dedicated account (see seedHabitStreak.js's header comment for why
  // direct DB seeding is required at all) - streak is a per-user aggregate
  // across every habit, so it needs the same sole-ownership isolation as
  // the other aggregate-dependent describe blocks above.
  const ACCOUNT = 'student-parent-f3';
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('reaching a 10-day streak shows the milestone banner', async ({ page, request }) => {
    const label = `E2E Habit Streak ${Date.now()}`;
    const { task, studentEmail } = await makeHabit(
      request,
      { parentKey: 'parent-f3', studentKey: ACCOUNT },
      label,
      3,
    );
    try {
      // Backdate the 9 PRECEDING days directly (the only way - see
      // seedHabitStreak.js). Checking the habit for real below, through the
      // UI, makes today the 10th consecutive day.
      await seedBackdatedCheckins(studentEmail, task.id, 9);

      await openDailyHabits(page);
      await expect(habitCard(page, label)).toBeVisible({ timeout: 15000 });

      await habitCard(page, label).click();
      await expect(habitCheckbox(page, label)).toHaveCSS('background-color', GOLD_RGB, {
        timeout: 10000,
      });

      // Real business outcome: the stat tile shows the real computed
      // streak, AND the milestone banner (only rendered when
      // streak > 0 && streak % 10 === 0 - confirmed from source) actually
      // appears with the correct copy for a non-100 milestone.
      await expect(statTileValue(page, 'Day Streak')).toHaveText('10');
      await expect(
        page.getByText('10-day streak! Keep going to 100 days!', { exact: true }),
      ).toBeVisible();
    } finally {
      await clearHabitCheckins(studentEmail, task.id);
      await deleteHabitTask(request, task.id);
    }
  });
});
