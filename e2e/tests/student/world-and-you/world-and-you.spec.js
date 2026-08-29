// Student "The World & You" (WorldAndYouScreen.tsx + the embedded
// DailyTidbitCard.tsx) - GK Fact, Current Affairs, the Current Affairs
// comprehension quiz, On This Day, and Brain Teaser.
//
// ── Read before running ─────────────────────────────────────────────────
// Uses student-l, a NEW dedicated account added to tests/helpers/accounts.js
// for this spec (completing the quiz writes real XP via POST /daily-tidbit/
// quiz-complete - see accounts.js's comment on student-l). This account is
// NOT YET SEEDED: before these tests can run,
//   1. create the Firebase + Supabase user the same way student-k/student-j
//      were created (see server/scripts/seed-e2e-accounts.js / the pattern
//      in seed-student-j.js),
//   2. add E2E_STUDENT_L=<email> to .env,
//   3. run global-setup.js so a session for it lands in .auth/student-l.json
//      the same way it does for every other account.
// Grade doesn't matter for this feature (content is generated per-grade by
// the server, not fixture data), so any grade/curriculum works.
//
// ── Why content assertions aren't hardcoded ─────────────────────────────
// GK fact / current affairs headline+summary / quiz questions+options+
// correct-answer-index are ALL generated fresh per day by the server via an
// LLM (Groq) - see server/routes/daily-tidbit.js. There is no fixture/seed
// data to assert against. Every test that checks this content captures the
// REAL network response via page.waitForResponse() first, then asserts the
// UI renders exactly what that response contained - this is what makes the
// "determine the expected answer from the application data" requirement
// possible without ever guessing which option is correct.
//
// ── Test isolation ───────────────────────────────────────────────────────
// The GK/Current-Affairs content is cached in the BROWSER's AsyncStorage
// (web = localStorage) per grade+day (`daily_tidbit_v3_<grade>_<date>`), and
// quiz completion is tracked the same way, per headline+day
// (`quiz_done_<hash>_<date>`) - confirmed by reading DailyTidbitCard.tsx
// directly. Playwright gives every test a fresh browser context (empty
// localStorage) unless storageState carries it, and this account's harvested
// session predates this feature, so every test starts with a clean slate -
// the first load always hits the real server, and the quiz can always be
// started fresh. This is also why these tests are safe to run in parallel
// under this repo's fullyParallel config despite sharing one account: they
// never touch a shared, mutable resource that could race except xp_points
// itself, which is additive (each test's own delta is still correct
// regardless of run order or a concurrent test's own XP award).
//
// ── Known product discrepancies found while reading the source (reported,
// not "fixed" by weakening a test - see CLAUDE.md) ─────────────────────
// 1. Quiz completion is tracked ONLY client-side (AsyncStorage), never
//    server-side. A student who clears storage, uses a different device, or
//    a fresh browser context can retake the same day's quiz and be awarded
//    XP again with no idempotency check on the server (POST /daily-tidbit/
//    quiz-complete has no "already awarded today" guard at all).
// 2. WorldAndYouScreen.tsx's own /world/daily fetch never checks
//    `res.ok` - only `json.error` after parsing - so a non-2xx response
//    with a valid JSON body lacking `.error` would silently render stale/
//    partial data instead of the error state.
// 3. The refresh icon on DailyTidbitCard checks AsyncStorage BEFORE hitting
//    the network (loadTidbit()) - pressing it on a day that's already
//    cached is a no-op that never reaches the server. Not tested here as a
//    pass/fail behavior since it's ambiguous whether this is a bug or
//    intentional "don't waste an LLM call" caching - flagging it in the
//    final report instead.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { getUserIdByEmail, getStudentXp } from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  openWorldAndYou,
  worldHeader,
  worldLoadError,
  revealAnswerButton,
  tidbitTab,
  tidbitLoadError,
  startQuizButton,
  quizErrorText,
  quizAlreadyDoneBanner,
  quizCounter,
  quizBox,
  quizOption,
  quizOptionButton,
  xpEarnedText,
} from '../../helpers/worldLocators.js';

const ACCOUNT = 'student-l';

function tidbitResponsePromise(page) {
  return page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/daily-tidbit' && r.request().method() === 'GET',
  );
}

function worldDailyResponsePromise(page) {
  return page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/world/daily' && r.request().method() === 'GET',
  );
}

function quizResponsePromise(page) {
  return page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/daily-tidbit/quiz' && r.request().method() === 'POST',
  );
}

function quizCompleteResponsePromise(page) {
  return page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === '/daily-tidbit/quiz-complete' &&
      r.request().method() === 'POST',
  );
}

// Opens the screen and returns both real API payloads it fetched on load -
// used by every test that needs to assert against real, non-hardcoded
// content instead of guessing what today's generated text says.
async function openAndCapture(page) {
  const tidbitPromise = tidbitResponsePromise(page);
  const worldPromise = worldDailyResponsePromise(page);
  await openWorldAndYou(page);
  const [tidbitRes, worldRes] = await Promise.all([tidbitPromise, worldPromise]);
  const tidbit = await tidbitRes.json();
  const world = await worldRes.json();
  await expect(
    worldHeader(page),
    'the World & You header must render after navigation',
  ).toBeVisible({ timeout: 15000 });
  await dismissAnnouncementIfPresent(page);
  return { tidbit, world };
}

// Starts the quiz and returns the real, server-generated questions - the
// ONLY source of truth for which option index is correct (never assumed).
async function startQuizAndCapture(page) {
  const quizPromise = quizResponsePromise(page);
  await startQuizButton(page).click();
  const quizRes = await quizPromise;
  const { questions } = await quizRes.json();
  expect(
    questions?.length,
    'the quiz must generate at least one question before a test can drive it',
  ).toBeGreaterThan(0);
  return questions;
}

test.describe('Student "The World & You" - navigation and page load', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('student can navigate to The World & You and the page loads without an error state', async ({
    page,
  }) => {
    const { tidbit, world } = await openAndCapture(page);

    await expect(
      page.getByText('Learn something new every day', { exact: true }),
      'the screen subtitle must render',
    ).toBeVisible();

    // No unexpected error state from either of the two independent fetches
    // this screen makes.
    await expect(worldLoadError(page)).toHaveCount(0);
    await expect(tidbitLoadError(page)).toHaveCount(0);

    // Required content sections actually loaded - proven by data, not just
    // "some text exists".
    expect(tidbit.gk?.fact, 'GK fact must be present in the API response').toBeTruthy();
    expect(
      tidbit.currentAffairs?.headline,
      'current affairs headline must be present in the API response',
    ).toBeTruthy();
    expect(world.funChallenge?.question, 'Brain Teaser question must be present').toBeTruthy();
  });
});

test.describe('Student "The World & You" - Daily Knowledge (GK Fact)', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('GK Fact tab shows the real category and fact text from the API, not empty content', async ({
    page,
  }) => {
    const { tidbit } = await openAndCapture(page);

    // GK Fact is the default tab (tab === 'gk' initial state) - proven by
    // asserting its content is visible without clicking anything first.
    expect(tidbit.gk.category.trim().length, 'category must not be empty').toBeGreaterThan(0);
    expect(tidbit.gk.fact.trim().length, 'fact must not be empty').toBeGreaterThan(0);

    await expect(
      page.getByText(tidbit.gk.category, { exact: true }),
      'the rendered category badge must match the real API response exactly',
    ).toBeVisible();
    await expect(
      page.getByText(tidbit.gk.fact, { exact: true }),
      'the rendered fact text must match the real API response exactly',
    ).toBeVisible();

    await expect(page.getByText('Did You Know?', { exact: true })).toBeVisible();
    await expect(page.getByText(/Daily Knowledge/, { exact: false })).toBeVisible();
  });
});

test.describe('Student "The World & You" - Current Affairs', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('student can open the Current Affairs tab and see the real headline and summary', async ({
    page,
  }) => {
    const { tidbit } = await openAndCapture(page);

    await tidbitTab(page, 'Current Affairs').click();

    await expect(
      page.getByText(tidbit.currentAffairs.headline, { exact: true }),
      'the rendered headline must match the real API response exactly',
    ).toBeVisible();
    await expect(
      page.getByText(tidbit.currentAffairs.summary, { exact: true }),
      'the rendered summary must match the real API response exactly',
    ).toBeVisible();
    await expect(page.getByText('Today in the World', { exact: true })).toBeVisible();
  });

  test('student can return to the GK Fact tab without leaving a broken state', async ({
    page,
  }) => {
    const { tidbit } = await openAndCapture(page);

    await tidbitTab(page, 'Current Affairs').click();
    await expect(page.getByText(tidbit.currentAffairs.headline, { exact: true })).toBeVisible();

    await tidbitTab(page, 'GK Fact').click();

    // Real return-to-main-page proof: the GK content is back, and nothing
    // from the Current Affairs tab (headline/summary/quiz button) lingers.
    await expect(page.getByText(tidbit.gk.fact, { exact: true })).toBeVisible();
    await expect(page.getByText(tidbit.currentAffairs.headline, { exact: true })).toHaveCount(0);
    await expect(startQuizButton(page)).toHaveCount(0);
  });
});

test.describe('Student "The World & You" - Current Affairs quiz', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await openAndCapture(page);
    await tidbitTab(page, 'Current Affairs').click();
  });

  test('starting the quiz shows the real question count and real answer options from the API', async ({
    page,
  }) => {
    const questions = await startQuizAndCapture(page);
    const q0 = questions[0];

    await expect(
      quizCounter(page, 1, questions.length),
      'question counter must reflect the REAL number of generated questions, not an assumed count',
    ).toBeVisible();
    await expect(page.getByText(q0.question, { exact: true })).toBeVisible();

    for (const optionText of q0.options) {
      await expect(
        quizOption(page, optionText),
        `option "${optionText}" from the real API response must be rendered`,
      ).toBeVisible();
    }
  });

  test('selecting the correct answer highlights it as correct and reflects the selected state', async ({
    page,
  }) => {
    const questions = await startQuizAndCapture(page);
    const q0 = questions[0];
    const correctOptionText = q0.options[q0.correct];
    const optionButton = quizOptionButton(page, correctOptionText);

    const bgBefore = await optionButton.evaluate((el) => getComputedStyle(el).backgroundColor);
    await optionButton.click();

    // Business outcome, not just "button was clicked": the tapped option's
    // own background must visibly change to reflect being answered/correct
    // (DailyTidbitCard.tsx sets a distinct green background once
    // `answered` is true and this option is the correct one).
    await expect
      .poll(
        async () => optionButton.evaluate((el) => getComputedStyle(el).backgroundColor),
        {
          message: 'the correct option must visibly change background color once answered',
          timeout: 5000,
        },
      )
      .not.toBe(bgBefore);
    const bgAfterAnswering = await optionButton.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    // Options lock after answering - re-clicking a different option must
    // not change the recorded selection (handleAnswer() returns early
    // while `answered` is true).
    const otherOptionText = q0.options.find((o) => o !== correctOptionText);
    if (otherOptionText) {
      await quizOptionButton(page, otherOptionText).click();
      // The originally-selected option must still show the same
      // answered/highlighted background it had right after the first
      // click - proves the second click was a no-op, not a re-selection.
      const bgAfterSecondClick = await optionButton.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      expect(
        bgAfterSecondClick,
        'clicking a second option after answering must not change the first option\'s answered-state styling',
      ).toBe(bgAfterAnswering);
    }
  });

  test('selecting an incorrect answer reveals the correct answer and does not award a point for it', async ({
    page,
  }) => {
    const questions = await startQuizAndCapture(page);
    const q0 = questions[0];
    // Guaranteed different from the correct index for any options.length >= 2.
    const wrongIdx = (q0.correct + 1) % q0.options.length;
    const wrongOptionText = q0.options[wrongIdx];
    const correctOptionText = q0.options[q0.correct];

    const wrongButton = quizOptionButton(page, wrongOptionText);
    const correctButton = quizOptionButton(page, correctOptionText);
    const wrongBgBefore = await wrongButton.evaluate((el) => getComputedStyle(el).backgroundColor);
    const correctBgBefore = await correctButton.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    await wrongButton.click();

    // Business outcome: BOTH the wrong (selected) option AND the correct
    // option change color once answered - the app reveals the right answer
    // immediately on a wrong pick, not just marks the wrong one.
    await expect
      .poll(async () => wrongButton.evaluate((el) => getComputedStyle(el).backgroundColor), {
        message: 'the incorrectly-selected option must change background color once answered',
        timeout: 5000,
      })
      .not.toBe(wrongBgBefore);
    await expect
      .poll(async () => correctButton.evaluate((el) => getComputedStyle(el).backgroundColor), {
        message: 'the correct option must be revealed (change color) even though it wasn\'t picked',
        timeout: 5000,
      })
      .not.toBe(correctBgBefore);

    // If this was the only question, the final score must show 0 correct -
    // proves the wrong answer was NOT counted.
    if (questions.length === 1) {
      const completePromise = quizCompleteResponsePromise(page);
      await completePromise;
      await expect(
        page.getByText('0/1 correct', { exact: true }),
        'a single-question quiz answered incorrectly must show 0/1 correct, not a false positive score',
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('student can complete the full quiz and receives a final score matching every real answer given', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const xpBefore = await getStudentXp(request, studentId);

    const questions = await startQuizAndCapture(page);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const correctOptionText = q.options[q.correct];
      await quizOptionButton(page, correctOptionText).click();
      if (i < questions.length - 1) {
        await expect(
          quizCounter(page, i + 2, questions.length),
          `must advance to question ${i + 2} of ${questions.length} after answering`,
        ).toBeVisible({ timeout: 5000 });
      }
    }

    const completeRes = await quizCompleteResponsePromise(page);
    const { xpAwarded } = await completeRes.json();
    const expectedXp = questions.length * 10; // routes/daily-tidbit.js: xpAwarded = correct * 10

    expect(
      xpAwarded,
      'answering every question correctly must award exactly questions.length * 10 XP (server-side formula)',
    ).toBe(expectedXp);

    // Final result state - the actual business outcome the student sees.
    await expect(
      page.getByText('Perfect score!', { exact: true }),
      'a fully-correct run must show the Perfect score! banner',
    ).toBeVisible({ timeout: 5000 });
    await expect(xpEarnedText(page, expectedXp)).toBeVisible();

    // Cross-check against the backend's own record of xp_points (read-only
    // expected-value lookup, not the test's final assertion - the UI check
    // above already is) - proves the XP was actually persisted, not just
    // rendered client-side.
    const xpAfter = await getStudentXp(request, studentId);
    expect(
      xpAfter,
      'xp_points in the backend must increase by exactly the awarded amount',
    ).toBe(xpBefore + expectedXp);
  });

  test('navigating away mid-quiz and returning resets to the quiz start state, not a stuck/invalid one', async ({
    page,
  }) => {
    const questions = await startQuizAndCapture(page);
    // Answer only the first question (skip this scenario entirely for a
    // single-question quiz, where "mid-quiz" isn't reachable).
    test.skip(questions.length < 2, 'quiz has fewer than 2 questions today - no mid-quiz state to test');

    await quizOptionButton(page, questions[0].options[questions[0].correct]).click();
    await expect(quizCounter(page, 2, questions.length)).toBeVisible({ timeout: 5000 });

    await page.goto('/dashboard');
    await openWorldAndYou(page);
    await expect(worldHeader(page)).toBeVisible({
      timeout: 15000,
    });
    await dismissAnnouncementIfPresent(page);
    await tidbitTab(page, 'Current Affairs').click();

    // Not stuck on question 2, not showing an error - back to the clean
    // "Test Your Knowledge" entry point, since the quiz wasn't completed
    // (no already_done flag was ever written).
    await expect(startQuizButton(page)).toBeVisible({ timeout: 10000 });
    await expect(quizAlreadyDoneBanner(page)).toHaveCount(0);
  });
});

// This test completes the real Current Affairs quiz for real XP, same as
// the "student can complete the full quiz ..." test above - given its own
// dedicated account (student-l2) so the two can run in parallel without
// racing the same account's xp_points (see accounts.js's comment on
// student-l2).
test.describe('Student "The World & You" - Current Affairs quiz - reopen after completion', () => {
  const REOPEN_ACCOUNT = 'student-l2';
  test.use({ storageState: statePath(REOPEN_ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, REOPEN_ACCOUNT);
    await openAndCapture(page);
    await tidbitTab(page, 'Current Affairs').click();
  });

  test('reopening the quiz after completing it today shows the already-completed state instead of a new quiz', async ({
    page,
  }) => {
    const questions = await startQuizAndCapture(page);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await quizOptionButton(page, q.options[q.correct]).click();
      if (i < questions.length - 1) {
        await expect(quizCounter(page, i + 2, questions.length)).toBeVisible({ timeout: 5000 });
      }
    }
    await quizCompleteResponsePromise(page);
    await expect(page.getByText(/Perfect score!|\d+\/\d+ correct/)).toBeVisible({
      timeout: 5000,
    });

    // Simulate the student navigating away and back within the same
    // session (SPA route change - the card fully unmounts/remounts,
    // resetting its in-memory quizState back to 'idle').
    await page.goto('/dashboard');
    await openWorldAndYou(page);
    await expect(worldHeader(page)).toBeVisible({
      timeout: 15000,
    });
    await dismissAnnouncementIfPresent(page);
    await tidbitTab(page, 'Current Affairs').click();

    // startQuiz() checks the AsyncStorage "done today" flag before ever
    // calling the quiz API again - the already_done banner must show
    // without a new POST /daily-tidbit/quiz request firing.
    let newQuizRequestFired = false;
    page.on('request', (req) => {
      if (req.method() === 'POST' && new URL(req.url()).pathname === '/daily-tidbit/quiz') {
        newQuizRequestFired = true;
      }
    });
    await startQuizButton(page).click();
    await expect(quizAlreadyDoneBanner(page)).toBeVisible({ timeout: 5000 });
    expect(
      newQuizRequestFired,
      'reopening an already-completed quiz must not regenerate a new one',
    ).toBe(false);
  });
});

// Same isolation reason as the block above - this test also completes the
// real quiz for real XP, so it gets its own dedicated account (student-l3)
// rather than sharing with student-l/student-l2.
test.describe('Student "The World & You" - Current Affairs quiz - persists across refresh', () => {
  const REFRESH_ACCOUNT = 'student-l3';
  test.use({ storageState: statePath(REFRESH_ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, REFRESH_ACCOUNT);
    await openAndCapture(page);
    await tidbitTab(page, 'Current Affairs').click();
  });

  test('completion persists across a full page refresh on the same day', async ({ page }) => {
    const questions = await startQuizAndCapture(page);
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await quizOptionButton(page, q.options[q.correct]).click();
      if (i < questions.length - 1) {
        await expect(quizCounter(page, i + 2, questions.length)).toBeVisible({ timeout: 5000 });
      }
    }
    await quizCompleteResponsePromise(page);
    await expect(page.getByText(/Perfect score!|\d+\/\d+ correct/)).toBeVisible({
      timeout: 5000,
    });

    // Hard refresh, not an SPA navigation - proves the AsyncStorage
    // completion flag survives a real reload, not just an in-memory state.
    await page.reload();
    await expect(worldHeader(page)).toBeVisible({
      timeout: 15000,
    });
    await dismissAnnouncementIfPresent(page);
    await tidbitTab(page, 'Current Affairs').click();

    await startQuizButton(page).click();
    await expect(quizAlreadyDoneBanner(page)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Student "The World & You" - error / boundary states', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('a failed /daily-tidbit response shows the tidbit error state without crashing the rest of the page', async ({
    page,
  }) => {
    // Regex, not a glob string: Playwright glob patterns treat "?" as a
    // single-char wildcard (shell-glob semantics), which would also match
    // "/daily-tidbit/quiz" and "/daily-tidbit/quiz-complete" - this must
    // only intercept the plain GET /daily-tidbit?grade=... request.
    await page.route(/\/daily-tidbit(\?.*)?$/, (route) => route.abort('failed'));
    const worldPromise = worldDailyResponsePromise(page);
    await openWorldAndYou(page);
    await worldPromise;
    await expect(worldHeader(page)).toBeVisible({
      timeout: 15000,
    });
    await dismissAnnouncementIfPresent(page);

    await expect(
      tidbitLoadError(page),
      'DailyTidbitCard must show its own error state when its fetch fails',
    ).toBeVisible({ timeout: 10000 });

    // The rest of the page (a separate, independent fetch to /world/daily)
    // must still work - proves the two content pipelines fail independently
    // rather than one broken fetch taking down the whole screen.
    await expect(worldLoadError(page)).toHaveCount(0);
  });

  test('a failed quiz-generation request shows a quiz error and returns to a retryable idle state', async ({
    page,
  }) => {
    await openAndCapture(page);
    await tidbitTab(page, 'Current Affairs').click();

    await page.route('**/daily-tidbit/quiz', (route) => route.abort('failed'));
    await startQuizButton(page).click();

    await expect(
      quizErrorText(page),
      'a failed quiz request must show the quiz error message, not a stuck loading state',
    ).toBeVisible({ timeout: 10000 });
    // Must return to idle (button visible again), not stay stuck - the user
    // can retry.
    await expect(startQuizButton(page)).toBeVisible();
  });

  test('a quiz response with zero questions shows the quiz error instead of an empty/broken quiz box', async ({
    page,
  }) => {
    await openAndCapture(page);
    await tidbitTab(page, 'Current Affairs').click();

    await page.route('**/daily-tidbit/quiz', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ questions: [] }) }),
    );
    await startQuizButton(page).click();

    await expect(
      quizErrorText(page),
      'startQuiz() explicitly throws when json.questions is empty - the UI must show the quiz error, not an empty question box',
    ).toBeVisible({ timeout: 10000 });
    await expect(quizBox(page)).toHaveCount(0);
  });

  test('malformed quiz option data (letter-prefixed options, out-of-range correct index) is normalized instead of crashing the quiz', async ({
    page,
  }) => {
    await openAndCapture(page);
    await tidbitTab(page, 'Current Affairs').click();

    // A deliberately malformed but realistic shape of what an LLM could
    // return - option strings still letter-prefixed, and `correct` pointing
    // past the end of the array. Exercises DailyTidbitCard.tsx's own
    // normalizeQuizQuestions() defensive clamping (`Math.min(Math.max(0,
    // correct), ...)`), confirmed by reading the source.
    const malformed = {
      questions: [
        {
          question: 'What was the article about?',
          options: ['A) First choice', 'B) Second choice', 'C) Third choice', 'D) Fourth choice'],
          correct: 99,
        },
      ],
    };
    await page.route('**/daily-tidbit/quiz', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(malformed) }),
    );
    await startQuizButton(page).click();

    // Must render a usable quiz, not crash or show raw "A) " prefixes -
    // normalizeQuizQuestions() strips the letter prefix client-side.
    await expect(quizCounter(page, 1, 1)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('First choice', { exact: true })).toBeVisible();
    await expect(page.getByText('A) First choice', { exact: true })).toHaveCount(0);

    // Clamped correct index must still land on a real, clickable option
    // (index 3, the last one, per Math.min(Math.max(0,99), 3)) without
    // throwing - answering it must reach a done state, not hang.
    await quizOptionButton(page, 'Fourth choice').click();
    await expect(page.getByText(/Perfect score!|\d+\/\d+ correct/)).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('Student "The World & You" - Brain Teaser', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test('Reveal Answer shows the real answer text from the API and hides the reveal button', async ({
    page,
  }) => {
    const { world } = await openAndCapture(page);
    expect(
      world.funChallenge?.answer?.trim().length,
      'funChallenge.answer must not be empty for this test to be meaningful',
    ).toBeGreaterThan(0);

    await expect(page.getByText(world.funChallenge.question, { exact: true })).toBeVisible();
    await expect(
      page.getByText(world.funChallenge.answer, { exact: true }),
      'the answer must not be visible before Reveal Answer is pressed',
    ).toHaveCount(0);

    await revealAnswerButton(page).click();

    await expect(
      page.getByText(world.funChallenge.answer, { exact: true }),
      'the rendered answer must match the real API response exactly',
    ).toBeVisible();
    await expect(
      revealAnswerButton(page),
      'the Reveal Answer button must be replaced by the answer, not remain clickable again',
    ).toHaveCount(0);
  });
});
