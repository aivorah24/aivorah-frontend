// This file tests the STUDENT LEADERBOARD/RANKINGS screen
// (LeaderboardScreen.tsx) - School/Grade/Curriculum/Overall scope tabs, the
// podium, the ranking table, and the student's own "my rank" card.
//
// ── Business rules confirmed by reading the source ──────────────────────
// - Default tab is 'school'. Switching tabs re-fetches with DIFFERENT query
//   params (LeaderboardScreen.tsx's fetchLeaderboard()):
//     School      -> ?school=<mySchool>
//     Grade       -> ?grade=<myGrade>&school=<mySchool>  (ALSO scoped by
//                    school - a real, non-obvious rule, not just grade alone)
//     Curriculum  -> ?curriculum=<myCurriculum>            (NOT scoped by school)
//     Overall     -> no filters at all
// - Server (GET /student/leaderboard, routes/student.js) sorts by xp_points
//   descending and assigns rank = array index + 1.
// - myEntry = leaderboard.find(id === studentId). Progress-to-next-rank:
//   rank 1 -> 100%; else min(myScore/aboveEntryScore, 1), or 0 if
//   aboveEntry's score is 0.
// - Podium only renders for length >= 1 (confirmed from source):
//     >=3 entries -> [rank2, rank1, rank3] (silver-gold-bronze visual order)
//     ==2 entries -> [null, rank1, rank2]
//     ==1 entry   -> [null, rank1, null]
//   medalColor is keyed by the entry's OWN rank (MEDAL_COLORS[rank-1]), not
//   its position in the visual array, so a rank-2 entry always renders
//   silver regardless of where it sits on the podium.
// - Table shows every entry the API returns (limit=500) - not paginated in
//   the UI itself.
// - "View Full Leaderboard" only appears when length > 6 - see KNOWN
//   APPLICATION BUG below for what happens when it's clicked.
// - Loading state (`loading`) only gates the INITIAL/tab-change fetch.
//   Refresh (pull-to-refresh) and refocus (useFocusEffect) both call
//   fetchLeaderboard(true), which uses `refreshing` instead - the existing
//   table content is never blanked back to a spinner for those.
// - Pull-to-refresh is NOT testable on this build - confirmed by reading
//   react-native-web's own RefreshControl (node_modules/react-native-web/
//   dist/exports/RefreshControl/index.js): on web it's a no-op stub that
//   renders a plain <View> with no gesture handling and no way to trigger
//   onRefresh at all. Refocus (tested below) and a full browser reload
//   (also tested below) are the two refresh paths that actually function
//   on web - pull-to-refresh only works on native.
//
// ── KNOWN APPLICATION BUGS (found while reading the source, reported not
// worked around) ──────────────────────────────────────────────────────────
// 1. "View Full Leaderboard" (only shown when there are more than 6 rows)
//    has onPress={() => {}} - a literal no-op. Clicking it does nothing at
//    all: no navigation, no expanded list, no error. Confirmed from source,
//    tested below as the real (non-)behavior.
// 2. fetchLeaderboard()'s catch{} is empty and never resets `leaderboard`.
//    A real network failure is indistinguishable from a genuine empty
//    board - both render "No rankings in this view yet." with no error
//    message at all (same class of bug as Daily Habits' bug #2, found and
//    fixed earlier in this suite - not fixed here since that's a separate,
//    unrequested change).
// 3. Non-array API responses ARE safely handled
//    (`if (Array.isArray(data)) setLeaderboard(data)`), but a real ARRAY of
//    malformed entries (e.g. missing `score`) is NOT - `s.score.toLocaleString()`
//    has no null-safety anywhere in the component, unlike Daily Habits'
//    (now-fixed) equivalent. Tested below as the real crash behavior.
//
// ── Test data strategy ──────────────────────────────────────────────────
// Two kinds of tests, per the task's own instructions (deterministic data,
// not hardcoded production values, not one test per row):
//   1. MOCKED leaderboard responses (page.route) for anything about
//      rendering/ordering/business-rule correctness - full control over
//      rank/score/streak shapes, including edge cases (1/2/3 entries, ties,
//      >6 entries, malformed data) that would be impractical or flaky to
//      construct from real production-shaped data.
//   2. REAL account integration (student-h) for anything that must prove
//      the UI is wired to the real backend - an extreme, guaranteed-highest
//      XP value to deterministically force rank #1 regardless of any real
//      peer's current XP, and a live read-only comparison against the real
//      API response.
// student-h is reused here (see accounts.js's updated OWNERSHIP note) -
// it's dedicated to profile.spec.js's profile-photo test only, which never
// touches student_stats.xp_points, so setStudentStats() here can't collide
// with it. Chosen specifically because no other spec in this repo currently
// mutates its xp_points (confirmed via a grep for setStudentStats usage).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { getUserIdByEmail, getStudentStats, setStudentStats } from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  tab,
  tableRow,
  podiumCard,
  emptyMessage,
  viewFullButton,
  rankCardTitle,
  rankCardRankValue,
} from '../../helpers/leaderboardLocators.js';

const ACCOUNT = 'student-h';

function entry(rank, id, name, score, streak, grade = 'Grade 5') {
  return { rank, id, name, grade, score, level: Math.ceil(rank / 2), streak, topics: rank };
}

async function openLeaderboard(page) {
  // '/leaderboard' does not collide with any backend REST route (the real
  // API is at '/student/leaderboard', a different path - confirmed by
  // reading server/index.js) - direct goto is safe, same reasoning as
  // Daily Habits' openDailyHabits().
  await page.goto('/leaderboard');
  await expect(page.getByText('Leaderboard', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  });
  await dismissAnnouncementIfPresent(page);
}

async function mockLeaderboard(page, data, { status = 200 } = {}) {
  await page.route('**/student/leaderboard?*', (route) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) }),
  );
}

test.describe('Student Leaderboard - structure, ordering, tabs (deterministic mock data)', () => {
  test.use({ storageState: statePath(ACCOUNT) });
  let ME_ID;

  test.beforeAll(async ({ request }) => {
    ME_ID = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
  });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  // A 5-person board with "me" at rank 2 - reused by most tests below.
  function fiveWithMeAtRank2() {
    return [
      entry(1, 'p1', 'Aria Gold', 900, 12),
      entry(2, ME_ID, 'Me Student', 700, 5),
      entry(3, 'p3', 'Cora Bronze', 500, 3),
      entry(4, 'p4', 'Dax Fourth', 300, 1),
      entry(5, 'p5', 'Eve Fifth', 100, 0),
    ];
  }

  test('page loads with header, LIVE badge, school chip, and School tab active by default', async ({
    page,
    request,
  }) => {
    let requestedUrl = null;
    page.on('request', (r) => {
      if (r.url().includes('/student/leaderboard')) requestedUrl = r.url();
    });
    await mockLeaderboard(page, fiveWithMeAtRank2());

    await openLeaderboard(page);

    await expect(page.getByText('See how you rank among your peers', { exact: true })).toBeVisible();
    await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
    await expect(page.getByText('Rankings', { exact: true })).toBeVisible();
    await expect(page.getByText(accountFor(ACCOUNT).school, { exact: true })).toBeVisible();

    // Default tab really is 'school', proven by the actual request params,
    // not just which tab looks visually active.
    await expect.poll(() => requestedUrl).toContain(`school=${accountFor(ACCOUNT).school}`);
    await expect.poll(() => requestedUrl).not.toContain('grade=');
    await expect.poll(() => requestedUrl).not.toContain('curriculum=');
  });

  test('sidebar "Leaderboard" link navigates to the real screen', async ({ page }) => {
    await mockLeaderboard(page, fiveWithMeAtRank2());

    await page.goto('/dashboard');
    await dismissAnnouncementIfPresent(page);
    // Two copies of the sidebar exist at once (mobile + desktop layout) -
    // same duplicate-layout situation dashboard.spec.js documents.
    await page.getByText('Leaderboard', { exact: true }).filter({ visible: true }).last().click();

    await expect(page.getByText('See how you rank among your peers', { exact: true })).toBeVisible({
      timeout: 15000,
    });
  });

  test('shows a loading indicator before content arrives', async ({ page }) => {
    await page.route('**/student/leaderboard?*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fiveWithMeAtRank2()) });
    });

    await page.goto('/leaderboard');
    await expect(page.getByRole('progressbar').first()).toBeVisible({ timeout: 10000 });
  });

  test('table renders every row in correct rank order with real fields, and highlights my own row', async ({
    page,
  }) => {
    await mockLeaderboard(page, fiveWithMeAtRank2());
    await openLeaderboard(page);

    const rows = fiveWithMeAtRank2();
    for (const r of rows) {
      const row = tableRow(page, r.name);
      await expect(row).toBeVisible({ timeout: 15000 });
      await expect(row.getByText(`${r.score.toLocaleString()} XP`, { exact: true })).toBeVisible();
      await expect(row.getByText(`${r.streak}d`, { exact: true })).toBeVisible();
      // Ranks 4+ show a plain numeral badge; ranks 1-3 show a medal icon
      // instead (no numeral) - confirmed from source (MEDAL_COLORS lookup +
      // conditional `s.rank <= 3 ? <medal icon> : <numeral>`).
      if (r.rank > 3) {
        await expect(row.getByText(String(r.rank), { exact: true })).toBeVisible();
      }
    }

    // "You" badge appears ONLY on my own row.
    await expect(tableRow(page, 'Me Student').getByText('You', { exact: true })).toBeVisible();
    await expect(tableRow(page, 'Aria Gold').getByText('You', { exact: true })).toHaveCount(0);
  });

  test('podium shows the correct silver-gold-bronze arrangement for 3+ entries', async ({ page }) => {
    await mockLeaderboard(page, fiveWithMeAtRank2());
    await openLeaderboard(page);

    // Visual order is [rank2, rank1, rank3] (gold in the center) - confirmed
    // from source - but each card's OWN rank (not position) still drives
    // its medal color, so rank-2 "Me Student" is silver even though it's
    // visually first in the DOM.
    await expect(podiumCard(page, 'Me Student')).toBeVisible({ timeout: 15000 });
    await expect(podiumCard(page, 'Aria Gold')).toBeVisible();
    await expect(podiumCard(page, 'Cora Bronze')).toBeVisible();
    await expect(podiumCard(page, 'Me Student').getByText('You', { exact: true })).toBeVisible();
    // 4th/5th place never appear on the podium, only in the table - proven
    // by their name appearing EXACTLY ONCE on screen (podiumCard()'s own
    // ancestor-climb can't prove absence here, since it would still resolve
    // to *some* element even for a table-only name).
    await expect(page.getByText('Dax Fourth', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Eve Fifth', { exact: true })).toHaveCount(1);
    // Ranks 1-3 appear twice (podium + table).
    await expect(page.getByText('Me Student', { exact: true })).toHaveCount(2);
  });

  test('podium shows [empty, rank1, rank2] when there are exactly 2 entries', async ({ page }) => {
    await mockLeaderboard(page, [entry(1, 'p1', 'Aria Gold', 900, 12), entry(2, ME_ID, 'Me Student', 700, 5)]);
    await openLeaderboard(page);

    await expect(podiumCard(page, 'Aria Gold')).toBeVisible({ timeout: 15000 });
    await expect(podiumCard(page, 'Me Student')).toBeVisible();
  });

  test('podium shows [empty, rank1, empty] when there is exactly 1 entry', async ({ page }) => {
    await mockLeaderboard(page, [entry(1, ME_ID, 'Me Student', 900, 12)]);
    await openLeaderboard(page);

    await expect(podiumCard(page, 'Me Student')).toBeVisible({ timeout: 15000 });
    await expect(rankCardTitle(page)).toHaveText("You're doing great!");
    await expect(page.getByText('Top of the board! 🏆', { exact: true })).toBeVisible();
  });

  test('my rank card shows the real XP gap and progress bar when not first place', async ({ page }) => {
    await mockLeaderboard(page, fiveWithMeAtRank2());
    await openLeaderboard(page);

    await expect(rankCardTitle(page)).toHaveText("You're doing great!");
    await expect(rankCardRankValue(page)).toHaveText('#2');
    // 700/900 = 77.77% -> Math.round -> 78%, and the exact "X / Y XP to
    // reach #N" copy - both computed directly from LeaderboardScreen.tsx's
    // own formula, not guessed.
    await expect(page.getByText('700 / 900 XP to reach #1', { exact: true })).toBeVisible();

    // The progress fill's own inline width style is the real, direct proof
    // of the computed percentage (LeaderboardScreen.tsx renders it as
    // `width: \`${Math.round(progressPct * 100)}%\``) - not just that the
    // text copy is correct.
    const fillWidth = await page
      .getByText('700 / 900 XP to reach #1', { exact: true })
      .locator('xpath=following-sibling::div[1]/div[1]')
      .evaluate((el) => el.style.width);
    expect(fillWidth).toBe('78%');
  });

  test('my rank card shows "Top of the board!" when I am rank 1', async ({ page }) => {
    await mockLeaderboard(page, [
      entry(1, ME_ID, 'Me Student', 900, 12),
      entry(2, 'p2', 'Aria Gold', 700, 5),
    ]);
    await openLeaderboard(page);

    await expect(rankCardRankValue(page)).toHaveText('#1');
    await expect(page.getByText('Top of the board! 🏆', { exact: true })).toBeVisible();
  });

  test('my rank card shows "Not ranked yet" when I have no entry in this scope', async ({ page }) => {
    await mockLeaderboard(page, [
      entry(1, 'p1', 'Aria Gold', 900, 12),
      entry(2, 'p2', 'Cora Bronze', 700, 5),
    ]);
    await openLeaderboard(page);

    await expect(rankCardTitle(page)).toHaveText('Not ranked yet');
    await expect(
      page.getByText('Complete lessons to earn XP and claim your spot on the board!', { exact: true }),
    ).toBeVisible();
  });

  test('switching tabs sends the correct query params for each scope and the displayed data actually changes', async ({
    page,
  }) => {
    const schoolBoard = [entry(1, ME_ID, 'Me Student', 900, 12), entry(2, 'p2', 'School Peer', 700, 5)];
    const gradeBoard = [entry(1, 'p3', 'Grade Peer', 800, 4), entry(2, ME_ID, 'Me Student', 600, 3)];
    const curriculumBoard = [entry(1, ME_ID, 'Me Student', 500, 2), entry(2, 'p4', 'Curriculum Peer', 400, 1)];
    const overallBoard = [entry(1, 'p5', 'Overall Peer', 1000, 20), entry(2, ME_ID, 'Me Student', 950, 19)];

    const seenUrls = [];
    await page.route('**/student/leaderboard?*', (route) => {
      const url = route.request().url();
      seenUrls.push(url);
      let body;
      if (url.includes('grade=')) body = gradeBoard;
      else if (url.includes('curriculum=')) body = curriculumBoard;
      else if (url.includes('school=')) body = schoolBoard;
      else body = overallBoard;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await openLeaderboard(page);
    await expect(tableRow(page, 'School Peer')).toBeVisible({ timeout: 15000 });

    await tab(page, 'Grade').click();
    await expect(tableRow(page, 'Grade Peer')).toBeVisible({ timeout: 15000 });
    await expect(tableRow(page, 'School Peer')).toHaveCount(0);
    expect(seenUrls.at(-1)).toContain('grade=');
    expect(seenUrls.at(-1)).toContain(`school=${accountFor(ACCOUNT).school}`);

    await tab(page, 'Curriculum').click();
    await expect(tableRow(page, 'Curriculum Peer')).toBeVisible({ timeout: 15000 });
    await expect(tableRow(page, 'Grade Peer')).toHaveCount(0);
    expect(seenUrls.at(-1)).toContain('curriculum=');
    expect(seenUrls.at(-1)).not.toContain('school=');

    await tab(page, 'Overall').click();
    await expect(tableRow(page, 'Overall Peer')).toBeVisible({ timeout: 15000 });
    await expect(tableRow(page, 'Curriculum Peer')).toHaveCount(0);
    expect(seenUrls.at(-1)).not.toContain('grade=');
    expect(seenUrls.at(-1)).not.toContain('school=');
    expect(seenUrls.at(-1)).not.toContain('curriculum=');

    await tab(page, 'School').click();
    await expect(tableRow(page, 'School Peer')).toBeVisible({ timeout: 15000 });
    expect(seenUrls.at(-1)).toContain(`school=${accountFor(ACCOUNT).school}`);
    expect(seenUrls.at(-1)).not.toContain('grade=');
  });

  test('shows the real empty-state message when a scope has no rankings', async ({ page }) => {
    await mockLeaderboard(page, []);
    await openLeaderboard(page);

    await expect(emptyMessage(page)).toBeVisible({ timeout: 15000 });
    await expect(rankCardTitle(page)).toHaveText('Not ranked yet');
  });

  test('"View Full Leaderboard" appears past 6 rows - KNOWN BUG: clicking it does nothing', async ({
    page,
  }) => {
    // "Me Student" at rank 2 - every other rank (0-based i != 1) is "Peer {i}".
    const sevenRows = Array.from({ length: 7 }, (_, i) =>
      entry(i + 1, i === 1 ? ME_ID : `p${i}`, i === 1 ? 'Me Student' : `Peer ${i}`, 900 - i * 50, i),
    );
    await mockLeaderboard(page, sevenRows);
    await openLeaderboard(page);

    await expect(viewFullButton(page)).toBeVisible({ timeout: 15000 });
    await viewFullButton(page).click();
    // Real (buggy) behavior: onPress={() => {}} - nothing happens at all.
    // Still on the same screen, same rows, no navigation, no error.
    await expect(page.getByText('See how you rank among your peers', { exact: true })).toBeVisible();
    await expect(tableRow(page, 'Peer 0')).toBeVisible();
  });

  test('a non-array API response is ignored safely (no crash, defensive code confirmed)', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await mockLeaderboard(page, { error: 'not an array' });

    await openLeaderboard(page);

    // `if (Array.isArray(data)) setLeaderboard(data)` - a non-array body is
    // silently ignored, leaderboard stays at its initial [] - renders as
    // the same empty state, no crash.
    await expect(emptyMessage(page)).toBeVisible({ timeout: 15000 });
    expect(pageErrors).toEqual([]);
  });

  test('KNOWN BUG: a malformed array item (missing score) crashes the page', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    // A real array, but one entry is missing `score` - unlike Daily Habits'
    // now-fixed equivalent, nothing here guards `s.score.toLocaleString()`.
    await mockLeaderboard(page, [{ rank: 1, id: 'p1', name: 'Broken Entry', grade: 'Grade 5', streak: 1 }]);

    await page.goto('/leaderboard');

    await expect
      .poll(() => pageErrors.some((m) => /score/i.test(m) || /toLocaleString/i.test(m) || /undefined/i.test(m)), {
        timeout: 10000,
      })
      .toBe(true);
  });

  test('KNOWN BUG: a network-level failure looks identical to a genuinely empty board', async ({
    page,
  }) => {
    await page.route('**/student/leaderboard?*', (route) => route.abort());

    await openLeaderboard(page);

    // fetchLeaderboard()'s catch{} never sets an error state - a real
    // failure renders exactly like "No rankings in this view yet.", with no
    // way for a student to tell the difference or retry.
    await expect(emptyMessage(page)).toBeVisible({ timeout: 15000 });
  });

  test('refocusing the screen refreshes data without flashing the loading spinner', async ({ page }) => {
    // Fixed response until swapped below - NOT counting calls, since the
    // screen genuinely fires TWO fetches on initial mount (the tab-change
    // useEffect AND useFocusEffect firing on first focus too, not only on
    // RE-focus - confirmed live: a call-count-based mock landed on the
    // "updated" branch before the test ever navigated away, because both
    // effects had already fired by the time the page settled).
    await mockLeaderboard(page, [entry(1, ME_ID, 'Me Student', 500, 2)]);

    await openLeaderboard(page);
    await expect(tableRow(page, 'Me Student')).toBeVisible({ timeout: 15000 });
    await expect(tableRow(page, 'New Arrival')).toHaveCount(0);

    // Swap in a DIFFERENT fixed response, then navigate away and back -
    // triggers useFocusEffect's fetchLeaderboard(true) on refocus.
    await page.unroute('**/student/leaderboard?*');
    await mockLeaderboard(page, [
      entry(1, ME_ID, 'Me Student', 500, 2),
      entry(2, 'p9', 'New Arrival', 400, 1),
    ]);
    await page.goto('/dashboard');
    await dismissAnnouncementIfPresent(page);
    await page.goto('/leaderboard');

    await expect(tableRow(page, 'New Arrival')).toBeVisible({ timeout: 15000 });
  });

  test('a full browser reload re-fetches and re-renders correctly (not just client-cached state)', async ({
    page,
  }) => {
    await mockLeaderboard(page, [entry(1, ME_ID, 'Me Student', 500, 2)]);
    await openLeaderboard(page);
    await expect(tableRow(page, 'Me Student')).toBeVisible({ timeout: 15000 });

    // Swap in a genuinely different response, then reload the whole page
    // (not an in-app navigation) - proves the screen re-fetches fresh data
    // on a hard reload rather than relying on any stale client-side state.
    await page.unroute('**/student/leaderboard?*');
    await mockLeaderboard(page, [
      entry(1, 'p1', 'Aria Gold', 900, 12),
      entry(2, ME_ID, 'Me Student', 700, 5),
    ]);
    await page.reload();
    await dismissAnnouncementIfPresent(page);

    await expect(page.getByText('See how you rank among your peers', { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(tableRow(page, 'Aria Gold')).toBeVisible({ timeout: 15000 });
    await expect(rankCardRankValue(page)).toHaveText('#2');
  });
});

test.describe('Student Leaderboard - real account integration', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('an extreme real XP value deterministically forces rank #1 on the real Overall board', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    // student-h's xpPoints is also touched here even though the account is
    // primarily owned by profile.spec.js (profile photo only - see
    // accounts.js's OWNERSHIP map). Safe to share because the fields don't
    // overlap (xpPoints vs. photo), but ONLY because this test restores the
    // original value below - an earlier version of this test left xpPoints
    // permanently at 10,000,000 with no cleanup, corrupting the account.
    const before = await getStudentStats(request, studentId);
    try {
      // Absurdly high on purpose - guaranteed higher than any real peer,
      // regardless of what any other concurrently-running spec/production
      // account's XP happens to be at this exact moment.
      await setStudentStats(request, studentId, { xpPoints: 10_000_000 });

      await page.goto('/leaderboard');
      await expect(page.getByText('Leaderboard', { exact: true }).first()).toBeVisible({ timeout: 15000 });
      await dismissAnnouncementIfPresent(page);
      await tab(page, 'Overall').click();

      await expect(rankCardRankValue(page)).toHaveText('#1', { timeout: 15000 });
      await expect(page.getByText('Top of the board! 🏆', { exact: true })).toBeVisible();
    } finally {
      await setStudentStats(request, studentId, { xpPoints: before.xpPoints });
    }
  });

  test('the real School leaderboard is genuinely sorted by XP descending with correct rank numbers', async ({
    page,
    request,
  }) => {
    // Read-only expected-value lookup (CLAUDE.md) - the exact same request
    // the screen itself makes, used only to compute the real expected order
    // to compare the UI against.
    const res = await request.get(
      `/student/leaderboard?limit=500&school=${encodeURIComponent(accountFor(ACCOUNT).school)}`,
    );
    const real = await res.json();
    expect(Array.isArray(real)).toBe(true);

    for (let i = 1; i < real.length; i++) {
      expect(real[i].score).toBeLessThanOrEqual(real[i - 1].score);
      expect(real[i].rank).toBe(i + 1);
    }

    await openLeaderboard(page);
    // Confirm the UI renders the real top entry's real name/score, not a
    // hardcoded assumption about who it is.
    if (real.length > 0) {
      const top = real[0];
      await expect(tableRow(page, top.name).or(podiumCard(page, top.name)).first()).toBeVisible({
        timeout: 15000,
      });
    }
  });
});
