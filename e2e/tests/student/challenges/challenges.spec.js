// This file tests the STUDENT CHALLENGES screen (ChallengesScreen.tsx) - the
// page a student uses to browse, start, answer, and submit timed quiz
// "challenges" for XP.
//
// We test:
// 1. The page loads with its main sections (stats row, Live Class
//    Leaderboard CTA, Available/Assigned/Completed tabs) and a challenge
//    card shows its real fields (title, difficulty, XP, duration, action).
// 2. Tabs filter the list correctly.
// 3. The full Start -> answer -> submit -> result flow, including the
//    question count, the countdown timer, changing an answer before
//    submitting, Submit Answers staying disabled until every question is
//    answered, the result screen, the challenge moving out of
//    Available/Assigned into Completed, and that state surviving a reload.
// 4. The quiz modal can be closed safely mid-attempt without corrupting the
//    challenge's state.
// 5. The screen's own 30s auto-refresh: a challenge assigned via the API
//    while the page is already open appears under Assigned without a
//    page.reload(), and can then be started/completed from there
//    (Assigned -> In Progress -> Completed).
// 6. Stat tiles (Total XP, Challenges, Topics Done, Streak) show the real
//    values, not just their labels - stats are set via API (setup), then
//    checked on screen.
// 7. Tab badge counts (the number next to Available/Assigned/Completed)
//    match the real number of challenges in each status.
// 8. Live Class Leaderboard actually navigates to the real Leaderboard
//    screen, not just that the CTA is visible.
//
// Uses student-j - dedicated to this spec (see tests/helpers/accounts.js).
// Deliberately IB PYP/Grade 4, not CBSE: 19 of its 22 challenges
// (pyp_g4_advanced_1-4, pyp_g4_olympiad_1-4, pyp_g4_school_1-4,
// pyp_g4_science_*, pyp_g4_socialstudies_*) have their questions
// pre-stored in the challenge_questions table (routes/ncert.js's
// GET /ncert/quiz serves those instantly with ZERO AI calls). The other 3
// (pyp_g4_advanced_5/6/7) have no stored questions and fall through to
// on-demand Groq generation - pickChallenge() below excludes those by id so
// this file's quiz-flow tests never depend on Groq/its shared rate-limited
// key, confirmed by directly querying GET /ncert/quiz for each id before
// writing this. CBSE/Grade 3+ has real challenges too but NO pre-stored
// questions at all, which is what broke this file the first time (see prior
// runs' "Failed to generate quiz" 500s - a real Groq daily-token-quota
// exhaustion, not a test bug). Starting/completing challenges writes XP,
// challengesCompleted and challenge_assignments rows, so this account can't
// be shared.
//
// Test-data note: challenge_assignments/student_stats are NOT part of the
// profile snapshot global-setup/teardown restore (only the `users` table and
// user_preferences are - see resetProfile.js), so completions accumulate
// across runs against this repo's small fixed challenge pool. POST
// /challenges/assign resets a 'completed' row back to 'assigned' instead of
// rejecting it (routes/challenges.js) - the app's own built-in mechanism for
// this, which pickChallenge() below relies on to stay repeatable
// indefinitely without ever needing a database wipe.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import {
  listChallenges,
  listAssignedChallenges,
  getUserIdByEmail,
  assignChallengeAsStudent,
  assignChallenge,
  setStudentStats,
  completeLesson,
} from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  tab,
  tabCount,
  statTileValue,
  startButtonForCard,
  quizModal,
  closeQuizButton,
  questionBlock,
  submitAnswersButton,
  timerDisplay,
  resultScore,
  doneButton,
} from '../../helpers/challengesLocators.js';

const ACCOUNT = 'student-j';
const GRADE = 'Grade 4';
const CURRICULUM = 'IB PYP';

// The 3 IB PYP/Grade 4 challenges with NO pre-stored questions - confirmed
// via direct GET /ncert/quiz calls before writing this file. Excluded so
// picking by offset can never land the quiz-flow tests on one that needs a
// real (rate-limited) Groq call.
const AI_ONLY_IDS = new Set(['pyp_g4_advanced_5', 'pyp_g4_advanced_6', 'pyp_g4_advanced_7']);

// Picks a challenge from the real seeded IB PYP/Grade 4 pool by a stable
// offset (sorted by id, AI-only ones filtered out) so parallel tests in this
// file never race for the same one - each test below uses its own offset.
// Resets a previously completed pick back to 'assigned' via the app's own
// reset-on-reassign behavior, so the same pool works forever across repeats.
async function pickChallenge(request, studentId, offset) {
  const list = await listChallenges(request, { grade: GRADE, curriculum: CURRICULUM, studentId });
  const sorted = list
    .filter((c) => !AI_ONLY_IDS.has(c.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const picked = sorted[offset];
  expect(
    picked,
    `expected a challenge at offset ${offset} in the IB PYP/Grade 4 pool`,
  ).toBeTruthy();

  if (picked.status === 'completed') {
    await assignChallengeAsStudent(request, {
      challengeId: picked.id,
      studentId,
      studentEmail: accountFor(ACCOUNT).email,
    });
    picked.status = 'assigned';
  }
  return picked;
}

// Answers one question, whichever type it turns out to be. Questions come
// from the real /ncert/quiz generator, so a given challenge's mix of mcq /
// fill_blank / open_ended isn't knowable ahead of time - detect by what
// actually rendered rather than assuming every question is multiple-choice.
//
// Inside a question's block, the DOM order is fixed by ChallengesScreen.tsx's
// JSX: [0] "Q{n} of {n}" label, [1] the question text, [2..] the answer
// options (dir="auto" divs) for mcq - so option N is index 2+N.
async function answerQuestion(page, qi, total, optionIndex = 0) {
  const block = questionBlock(page, qi, total);
  const textInput = block.locator('textarea, input');
  if (await textInput.count()) {
    await textInput.first().fill('Test answer');
    return;
  }
  await block
    .locator('div[dir="auto"]')
    .nth(2 + optionIndex)
    .click();
}

async function openChallenges(page) {
  await page.goto('/challenges');
  await expect(page.getByText('Challenges', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  });
  await dismissAnnouncementIfPresent(page);
}

test.describe('Student Challenges', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await openChallenges(page);
  });

  test.describe('Page load, tabs, and card content', () => {
    test('page loads with stats, leaderboard CTA, tabs, and at least one challenge card', async ({
      page,
    }) => {
      await expect(page.getByText('Total XP', { exact: true })).toBeVisible();
      await expect(page.getByText('Challenges', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Topics Done', { exact: true })).toBeVisible();
      await expect(page.getByText('Streak', { exact: true })).toBeVisible();

      await expect(page.getByText('Live Class Leaderboard', { exact: true })).toBeVisible();

      await expect(tab(page, 'Available')).toBeVisible();
      await expect(tab(page, 'Assigned')).toBeVisible();
      await expect(tab(page, 'Completed')).toBeVisible();

      // At least one card renders with a Start action - the seeded IB PYP/
      // Grade 4 pool always has challenges, so Available is never empty.
      // Explicit timeout: this file runs quiz-answering tests in parallel
      // in the same run, which can slow the shared dev server enough that
      // the default 5s expect timeout isn't reliable.
      await expect(page.getByText(/^(Start Challenge|Start Now)$/).first()).toBeVisible({
        timeout: 15000,
      });
    });

    test('a challenge card shows its title, difficulty, XP reward, and duration', async ({
      page,
      request,
    }) => {
      const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
      const target = await pickChallenge(request, studentId, 0);

      await page.reload();
      await dismissAnnouncementIfPresent(page);
      // Reassigning above may have moved it to Assigned - check whichever
      // tab it's actually in rather than assuming Available.
      if (target.status === 'assigned') await tab(page, 'Assigned').click();

      const card = page.getByText(target.title, { exact: true }).first();
      await expect(card).toBeVisible({ timeout: 15000 });

      const cardRegion = card.locator('xpath=ancestor::div[.//div[contains(text(),"Start")]][1]');
      await expect(cardRegion.getByText(target.difficulty, { exact: true })).toBeVisible();
      await expect(cardRegion.getByText(`${target.xpReward} XP`, { exact: true })).toBeVisible();
      await expect(
        cardRegion.getByText(`${target.timeLimitMinutes} min`, { exact: true }),
      ).toBeVisible();
    });

    test('switching tabs filters the list to the matching status', async ({ page }) => {
      // Available is populated (seeded pool). Switch away and back - each
      // tab shows either matching cards or its own empty-state copy, never
      // a stale mix of the previous tab's cards.
      await tab(page, 'Assigned').click();
      const assignedEmpty = page.getByText('No assigned challenges yet', { exact: true });
      const anyStartNow = page.getByText('Start Now', { exact: true }).first();
      await expect(assignedEmpty.or(anyStartNow)).toBeVisible({ timeout: 10000 });

      await tab(page, 'Completed').click();
      const completedEmpty = page.getByText('No completed challenges yet', { exact: true });
      const anyDoneBadge = page.getByText(/^\d{1,3}% · \+\d+ XP$/).first();
      await expect(completedEmpty.or(anyDoneBadge)).toBeVisible({ timeout: 10000 });

      await tab(page, 'Available').click();
      await expect(page.getByText('Start Challenge', { exact: true }).first()).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Real data reflected on screen', () => {
    // These three check that what's ON SCREEN actually matches the real
    // backend, not just that the labels/elements exist (the earlier "page
    // loads with stats..." test only checks visibility, never the values).
    // Kept as separate tests, not folded into that one, so each has its own
    // clear pass/fail signal.

    test('stat tiles show the real XP, Challenges, Topics Done, and Streak values', async ({
      page,
      request,
    }) => {
      const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);

      // xpPoints and currentStreak are plain stored fields, directly
      // settable via PUT /student/:id (confirmed via routes/student.js).
      // challengesCompleted and completedTopics are NOT settable this way -
      // by design: challengesCompleted is always computed LIVE from real
      // challenge_assignments rows on every GET (so a stale PUT can never
      // make it drift from reality - see that GET handler's own comment),
      // and completedTopics is deliberately excluded from this PUT entirely
      // ("managed exclusively by POST /complete-lesson" - see that PUT
      // handler's comment on why: a stale client tab blindly PUTing its
      // whole stats object must never be able to overwrite real progress).
      // So those two are driven for real instead of faked.
      // completeLesson() awards its own real XP server-side, so it has to
      // run BEFORE the absolute stats PUT below - otherwise its XP award
      // would land after and silently change xpPoints away from 850.
      await completeLesson(request, studentId, {
        topic: 'e2e-stat-tile-topic',
        subject: 'Mathematics',
        grade: GRADE,
        curriculum: CURRICULUM,
      });
      await setStudentStats(request, studentId, { xpPoints: 850, currentStreak: 6 });

      // Read the same real truth the screen itself will fetch, right
      // before reloading - same merge ChallengesScreen.tsx does (see the
      // tab-badge-count test above for why listChallenges() alone isn't
      // enough).
      const [gradeList, assignedElsewhere] = await Promise.all([
        listChallenges(request, { grade: GRADE, curriculum: CURRICULUM, studentId }),
        listAssignedChallenges(request, { studentId }),
      ]);
      const merged = [...gradeList];
      for (const a of assignedElsewhere) {
        if (!merged.find((c) => c.id === a.id)) merged.push(a);
      }
      const realChallengesCompleted = merged.filter((c) => c.status === 'completed').length;

      await page.reload();
      await dismissAnnouncementIfPresent(page);

      await expect(statTileValue(page, 'Total XP')).toHaveText('850', { timeout: 15000 });
      await expect(statTileValue(page, 'Streak')).toHaveText('6d');
      await expect(statTileValue(page, 'Challenges')).toHaveText(String(realChallengesCompleted));
      // Topics Done just needs to reflect that at least the lesson we
      // completed above counts - the exact total also includes whatever
      // this account completed in prior runs, which we don't control.
      const topicsDone = Number(await statTileValue(page, 'Topics Done').innerText());
      expect(topicsDone).toBeGreaterThan(0);
    });

    test('tab badge counts match the real number of Available/Assigned/Completed challenges', async ({
      page,
      request,
    }) => {
      const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);

      await page.reload();
      await dismissAnnouncementIfPresent(page);

      // Other tests in this file run in PARALLEL against the same shared
      // student-j pool, so a count fetched too early can go stale by the
      // time we check it. Poll: re-fetch the real count right before each
      // comparison instead of computing it once up front, keeping the
      // fetch-vs-render window as tight as possible.
      const STATUS_BY_TAB = {
        Available: 'available',
        Assigned: 'assigned',
        Completed: 'completed',
      };
      for (const [name, status] of Object.entries(STATUS_BY_TAB)) {
        await expect(async () => {
          // Same merge ChallengesScreen.tsx's fetchChallenges() does: the
          // grade-filtered list PLUS any cross-grade assigned challenges
          // not already in it (a parent/teacher can assign from a
          // DIFFERENT grade than student-j's own IB PYP/Grade 4 - those
          // only show up via the second call, not listChallenges() alone).
          const [gradeList, assignedElsewhere] = await Promise.all([
            listChallenges(request, { grade: GRADE, curriculum: CURRICULUM, studentId }),
            listAssignedChallenges(request, { studentId }),
          ]);
          const merged = [...gradeList];
          for (const a of assignedElsewhere) {
            if (!merged.find((c) => c.id === a.id)) merged.push(a);
          }
          const count = merged.filter((c) => c.status === status).length;

          if (count > 0) {
            await expect(tabCount(page, name)).toHaveText(String(count));
          } else {
            // ChallengesScreen.tsx only renders the badge when count > 0 -
            // no badge at all is the correct rendering of a zero count.
            await expect(tabCount(page, name)).toHaveCount(0);
          }
        }).toPass({ timeout: 20000 });
      }
    });

    test('Live Class Leaderboard navigates to the real Leaderboard screen', async ({ page }) => {
      await page.getByText('Live Class Leaderboard', { exact: true }).click();

      await expect(page.getByText('Leaderboard', { exact: true }).first()).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page.getByText('See how you rank among your peers', { exact: true }),
      ).toBeVisible();
    });
  });

  test.describe('Start -> answer -> submit -> result', () => {
    test('completing a challenge moves it from Available/Assigned into Completed and survives a reload', async ({
      page,
      request,
    }) => {
      test.setTimeout(60000);

      const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
      const target = await pickChallenge(request, studentId, 1);

      await page.reload();
      await dismissAnnouncementIfPresent(page);
      if (target.status === 'assigned') await tab(page, 'Assigned').click();

      await startButtonForCard(page, target.title).click();

      // Modal opens with an accessible dialog role, and question count
      // matches this challenge's own questionCount from the API - not a
      // hardcoded number, since different challenges have different counts.
      await expect(quizModal(page)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Loading questions...'))
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          // Fast local responses can resolve before this assertion lands -
          // the questions-visible check below is the real proof either way.
        });

      const firstQuestion = questionBlock(page, 1, target.questionCount);
      await expect(firstQuestion).toBeVisible({ timeout: 20000 });
      await expect(
        page.getByText(`Q${target.questionCount} of ${target.questionCount}`),
      ).toBeVisible();

      // Timer visible and counting down (mm:ss format, matching this
      // challenge's own timeLimitMinutes).
      await expect(timerDisplay(page)).toBeVisible();
      const firstReading = await timerDisplay(page).innerText();
      await expect
        .poll(async () => timerDisplay(page).innerText(), { timeout: 8000 })
        .not.toBe(firstReading);

      // Submit stays disabled while questions are unanswered.
      await expect(submitAnswersButton(page)).toHaveAttribute('aria-disabled', 'true');
      await expect(page.getByText('Answer all questions to submit')).toBeVisible();

      for (let qi = 1; qi <= target.questionCount; qi++) {
        await answerQuestion(page, qi, target.questionCount);
      }

      // Change the first question's answer before submitting - picking a
      // different option should still leave the quiz fully answered (an
      // mcq question only; fill_blank/open_ended re-fill with new text,
      // which is exercised the same way by answerQuestion itself).
      const q1Block = questionBlock(page, 1, target.questionCount);
      const isMcq = (await q1Block.locator('textarea, input').count()) === 0;
      if (isMcq) {
        await answerQuestion(page, 1, target.questionCount, 1);
      } else {
        await answerQuestion(page, 1, target.questionCount);
      }

      // Once enabled, the app removes aria-disabled rather than setting it
      // to "false" - assert it's not "true" rather than a specific value.
      await expect(submitAnswersButton(page)).not.toHaveAttribute('aria-disabled', 'true');

      await submitAnswersButton(page).click();

      // Result screen: a score percentage and the leaderboard section render,
      // and Submit Answers is gone - structurally impossible to submit twice.
      await expect(resultScore(page)).toBeVisible({ timeout: 20000 });
      await expect(page.getByText('Challenge Rankings', { exact: true })).toBeVisible();
      await expect(page.getByText('Submit Answers', { exact: true })).toHaveCount(0);

      await doneButton(page).click();
      await expect(quizModal(page)).toBeHidden();

      // No longer offered as Available/Assigned; now shows Completed with
      // its score/XP badge.
      await tab(page, 'Available').click();
      await expect(page.getByText(target.title, { exact: true })).toHaveCount(0);
      await tab(page, 'Assigned').click();
      await expect(page.getByText(target.title, { exact: true })).toHaveCount(0);

      await tab(page, 'Completed').click();
      const completedCard = page.getByText(target.title, { exact: true });
      await expect(completedCard).toBeVisible();

      // Persistence: reload and the Completed state is still there, not
      // just an unsaved client-side flag.
      await page.reload();
      await dismissAnnouncementIfPresent(page);
      await tab(page, 'Completed').click();
      await expect(page.getByText(target.title, { exact: true })).toBeVisible({ timeout: 15000 });
    });

    test('the quiz modal can be closed safely without corrupting challenge state', async ({
      page,
      request,
    }) => {
      const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
      const target = await pickChallenge(request, studentId, 2);

      await page.reload();
      await dismissAnnouncementIfPresent(page);
      if (target.status === 'assigned') await tab(page, 'Assigned').click();

      await startButtonForCard(page, target.title).click();
      await expect(quizModal(page)).toBeVisible({ timeout: 10000 });
      await expect(questionBlock(page, 1, target.questionCount)).toBeVisible({ timeout: 20000 });

      await closeQuizButton(page).click();
      await expect(quizModal(page)).toBeHidden();

      // Still usable afterwards - the card is still there with a Start
      // action (now "Start Now", since the auto-assign already happened),
      // not stuck mid-quiz or duplicated.
      await tab(page, 'Assigned').click();
      await expect(startButtonForCard(page, target.title)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Auto-refresh on assignment + Assigned -> In Progress -> Completed', () => {
    test('a challenge assigned via the API while the page is open appears under Assigned without a reload, and can be completed from there', async ({
      page,
      request,
    }) => {
      // ChallengesScreen polls every 30s (fetchChallenges' setInterval) -
      // give this comfortable room over that interval.
      test.setTimeout(75000);

      const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
      const target = await pickChallenge(request, studentId, 3);

      // Load the screen BEFORE assigning, and never reload/re-visit it until
      // after the auto-refresh assertion below - this exercises the real
      // background poll, not just "does a fresh load show correct data."
      await page.reload();
      await dismissAnnouncementIfPresent(page);

      // pickChallenge() may have already reset it to 'assigned' as setup -
      // explicitly (re-)assign here so this test's own action is what the
      // auto-refresh reacts to, regardless of pool state from prior runs.
      await assignChallenge(request, {
        challengeId: target.id,
        studentId,
        teacherId: 'e2e-test-harness',
      });

      await tab(page, 'Assigned').click();
      await expect(page.getByText(target.title, { exact: true })).toBeVisible({ timeout: 40000 });

      await startButtonForCard(page, target.title).click();
      await expect(quizModal(page)).toBeVisible({ timeout: 10000 });
      const firstQuestion = questionBlock(page, 1, target.questionCount);
      await expect(firstQuestion).toBeVisible({ timeout: 20000 });

      for (let qi = 1; qi <= target.questionCount; qi++) {
        await answerQuestion(page, qi, target.questionCount);
      }
      await submitAnswersButton(page).click();

      await expect(resultScore(page)).toBeVisible({ timeout: 20000 });
      await doneButton(page).click();

      await tab(page, 'Completed').click();
      await expect(page.getByText(target.title, { exact: true })).toBeVisible();

      await page.reload();
      await dismissAnnouncementIfPresent(page);
      await tab(page, 'Completed').click();
      await expect(page.getByText(target.title, { exact: true })).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Loading, Empty and Error states', () => {
    // These three states depend on what the server replies, so we answer for
    // it, same pattern as learning-paths.spec.js. page.route only affects
    // THIS test's page - other tests/workers running at the same time are
    // untouched. Scoped narrowly to the bare "/challenges?..." and
    // "/challenges/assigned?..." endpoints only - NOT "/challenges/assign",
    // "/challenges/:id/complete", or "/challenges/leaderboard", which share
    // the same path prefix.
    const CHALLENGES_API = '**/challenges?*';
    const CHALLENGES_ASSIGNED_API = '**/challenges/assigned?*';

    test('shows a loading indicator while challenges are still coming', async ({ page }) => {
      // Hold the answer back so the loading state stays on screen long
      // enough to check - without this the list arrives too fast to ever
      // see it land. openChallenges() itself can burn up to ~4s inside
      // dismissAnnouncementIfPresent's own wait before this test even gets
      // to check for the spinner, so the delay needs enough margin past
      // that worst case, not just past the network call itself.
      await page.route(CHALLENGES_API, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 8000));
        await route.continue();
      });

      await openChallenges(page);

      // ActivityIndicator gets a real role="progressbar" on web for free -
      // confirmed by reading the rendered DOM directly.
      await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 10000 });
    });

    test('shows a friendly empty-state message when the student has no challenges at all', async ({
      page,
    }) => {
      // Reply with empty lists on BOTH endpoints ChallengesScreen merges
      // together (the grade-filtered list and the cross-grade assigned
      // list) - otherwise student-j's real assignments from other tests in
      // this file could leak in and this wouldn't be a genuine empty state.
      await page.route(CHALLENGES_API, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
      );
      await page.route(CHALLENGES_ASSIGNED_API, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
      );

      await openChallenges(page);

      await expect(page.getByText('No challenges available', { exact: true })).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('Pull down to refresh', { exact: true })).toBeVisible();
      await expect(page.getByText(/^(Start Challenge|Start Now)$/)).toHaveCount(0);

      // Assigned tab has its own copy.
      await tab(page, 'Assigned').click();
      await expect(page.getByText('No assigned challenges yet', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Ask your teacher or parent to assign a challenge', { exact: true }),
      ).toBeVisible();

      // Completed tab has its own copy too.
      await tab(page, 'Completed').click();
      await expect(page.getByText('No completed challenges yet', { exact: true })).toBeVisible();
    });

    // KNOWN BUG: fetchChallenges()'s catch{} in ChallengesScreen.tsx is
    // completely empty - a failed request is swallowed silently with no
    // error state at all (confirmed by reading the source - there is no
    // error useState, no "Could not load" copy anywhere in the file, unlike
    // My Learning Paths' equivalent screen). The student sees the SAME
    // "No challenges available" empty-state copy whether they truly have
    // none or the server is unreachable, with no way to tell the difference
    // or retry. Written for the correct/expected behavior on purpose, so
    // this is red until the app adds a real error state.
    test('shows an error message when challenges cannot be loaded (known bug - falls back to empty-state copy instead)', async ({
      page,
    }) => {
      await page.route(CHALLENGES_API, (route) => route.abort());

      await openChallenges(page);

      await expect(page.getByText(/could not load|something went wrong|try again/i)).toBeVisible({
        timeout: 15000,
      });
    });
  });
});
