// Accessibility coverage for the STUDENT CHALLENGES screen - the main
// priority for this feature per the task brief.
//
// Confirmed by reading ChallengesScreen.tsx and by inspecting the real
// running app's DOM: tabs, challenge cards, the Start Challenge/Start Now
// action, the modal's close (X) icon, and every answer option are bare
// TouchableOpacitys with NO accessibilityRole/accessibilityLabel/testID at
// all - they render as unlabeled <div tabindex="0"> wrappers. The ONLY
// element that gets a real accessible role for free is the quiz Modal
// itself (RN's <Modal> -> role="dialog"), and even that has no accessible
// name (no aria-label/aria-labelledby pointing at the challenge title).
//
// Several tests below are written for the CORRECT/expected behavior and are
// known to fail until the app adds accessibilityLabel/accessibilityRole
// props to these controls - same "write for correct behavior" convention as
// tests/student/ai-coach/ai-coach-a11y.spec.js and this repo's other known-
// bug tests (see CLAUDE.md).
//
// Read-only from this file's perspective except where explicitly noted -
// most checks below just navigate/inspect. The two tests that open a real
// quiz and check accessible submit/loading/result state DO complete a
// challenge, so this file shares ownership of student-j with
// challenges.spec.js (see tests/helpers/accounts.js) - each test here picks
// its own offset via pickChallenge() so it never races the functional spec.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor } from '../../helpers/accounts.js';
import { listChallenges, getUserIdByEmail, assignChallengeAsStudent } from '../../helpers/api.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';
import {
  tab,
  startButtonForCard,
  quizModal,
  questionBlock,
  submitAnswersButton,
  timerDisplay,
  resultScore,
} from '../../helpers/challengesLocators.js';

const ACCOUNT = 'student-j';
const GRADE = 'Grade 4';
const CURRICULUM = 'IB PYP';

// Same 3 IB PYP/Grade 4 challenges with no pre-stored questions, excluded
// for the same reason as challenges.spec.js - see that file's header
// comment for how this was confirmed.
const AI_ONLY_IDS = new Set(['pyp_g4_advanced_5', 'pyp_g4_advanced_6', 'pyp_g4_advanced_7']);

// Same repeatable-pool strategy as challenges.spec.js, offset 10+ so this
// file's picks never collide with that file's offsets 0-3.
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

test.describe('Student Challenges - Accessibility', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await page.goto('/challenges');
    await expect(page.getByText('Challenges', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
    await dismissAnnouncementIfPresent(page);
  });

  test('Available/Assigned/Completed tabs are keyboard accessible with visible focus', async ({
    page,
  }) => {
    const availableTab = tab(page, 'Available');
    await availableTab.focus();
    await expect(availableTab).toBeFocused();

    // Tabbing forward should be able to reach the other tabs without a
    // pointer, in a logical left-to-right order.
    await page.keyboard.press('Tab');
    await expect(tab(page, 'Assigned')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(tab(page, 'Completed')).toBeFocused();
  });

  test("a challenge card's Start action is keyboard accessible and activates on Enter", async ({
    page,
  }) => {
    const startBtn = page.getByText(/^(Start Challenge|Start Now)$/).first();
    await startBtn.focus();
    await expect(startBtn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(quizModal(page)).toBeVisible({ timeout: 10000 });
  });

  test('the quiz modal has an accessible role and an accessible name (known bug - no aria-label)', async ({
    page,
  }) => {
    await page
      .getByText(/^(Start Challenge|Start Now)$/)
      .first()
      .click();
    const modal = quizModal(page);
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Correct/expected behavior: the dialog should expose the challenge
    // title as its accessible name (aria-label or aria-labelledby), not
    // just render it as unlabeled visual text inside.
    const accessibleName = await modal.evaluate(
      (el) => el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'),
    );
    expect(accessibleName, 'quiz dialog should have an accessible name').toBeTruthy();
  });

  test('the close (X) button has an accessible name (known bug - icon-only, unlabeled)', async ({
    page,
  }) => {
    await page
      .getByText(/^(Start Challenge|Start Now)$/)
      .first()
      .click();
    await expect(quizModal(page)).toBeVisible({ timeout: 10000 });

    await expect(page.getByRole('button', { name: /close/i })).toBeVisible();
  });

  test('modal focus moves into the dialog when it opens', async ({ page }) => {
    await page
      .getByText(/^(Start Challenge|Start Now)$/)
      .first()
      .click();
    const modal = quizModal(page);
    await expect(modal).toBeVisible({ timeout: 10000 });

    const focusInsideDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return (
        !!dialog &&
        dialog.contains(document.activeElement) &&
        document.activeElement !== document.body
      );
    });
    expect(focusInsideDialog, 'focus should move into the dialog on open').toBe(true);
  });

  test('questions and answer options are exposed with proper semantic roles (known bug - plain unlabeled divs)', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const target = await pickChallenge(request, studentId, 10);
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    if (target.status === 'assigned') await tab(page, 'Assigned').click();

    await startButtonForCard(page, target.title).click();
    await expect(quizModal(page)).toBeVisible({ timeout: 10000 });
    await expect(questionBlock(page, 1, target.questionCount)).toBeVisible({ timeout: 20000 });

    // Correct/expected: each question reads as a group with the question
    // text as its label, and each choice as a real radio control.
    await expect(page.getByRole('radiogroup').first()).toBeVisible();
    await expect(page.getByRole('radio').first()).toBeVisible();
  });

  test('selected/unselected answer state is exposed to assistive tech (known bug - no aria-checked)', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const target = await pickChallenge(request, studentId, 11);
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    if (target.status === 'assigned') await tab(page, 'Assigned').click();

    await startButtonForCard(page, target.title).click();
    await expect(quizModal(page)).toBeVisible({ timeout: 10000 });
    const block = questionBlock(page, 1, target.questionCount);
    await expect(block).toBeVisible({ timeout: 20000 });

    const textInput = block.locator('textarea, input');
    test.skip((await textInput.count()) > 0, 'first question is not multiple-choice for this pick');

    const firstOption = block.locator('div[dir="auto"]').nth(2);
    await firstOption.click();

    const ariaChecked = await firstOption.getAttribute('aria-checked');
    expect(ariaChecked, 'selected option should expose aria-checked="true"').toBe('true');
  });

  test('Submit Answers has an accessible name and reflects disabled/enabled state to assistive tech', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const target = await pickChallenge(request, studentId, 12);
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    if (target.status === 'assigned') await tab(page, 'Assigned').click();

    await startButtonForCard(page, target.title).click();
    await expect(quizModal(page)).toBeVisible({ timeout: 10000 });
    await expect(questionBlock(page, 1, target.questionCount)).toBeVisible({ timeout: 20000 });

    // Accessible name is present regardless of the disabled-state gap.
    await expect(page.getByText('Submit Answers', { exact: true })).toBeVisible();
    await expect(submitAnswersButton(page)).toHaveAttribute('aria-disabled', 'true');

    for (let qi = 1; qi <= target.questionCount; qi++) {
      await answerQuestion(page, qi, target.questionCount);
    }
    // Once enabled, the app removes aria-disabled rather than setting it
    // to "false" - assert it's not "true" rather than a specific value.
    await expect(submitAnswersButton(page)).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('the countdown timer has an accessible text representation, not just color', async ({
    page,
    request,
  }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const target = await pickChallenge(request, studentId, 13);
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    if (target.status === 'assigned') await tab(page, 'Assigned').click();

    await startButtonForCard(page, target.title).click();
    await expect(quizModal(page)).toBeVisible({ timeout: 10000 });

    // The mm:ss text itself is real, readable text content (not encoded only
    // via color/urgency styling) - this passes today.
    await expect(timerDisplay(page)).toBeVisible({ timeout: 20000 });
    const text = await timerDisplay(page).innerText();
    expect(text).toMatch(/^\d{2}:\d{2}$/);
  });

  test('the result screen announces completion to assistive tech (known bug - no live region)', async ({
    page,
    request,
  }) => {
    test.setTimeout(45000);
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const target = await pickChallenge(request, studentId, 14);
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    if (target.status === 'assigned') await tab(page, 'Assigned').click();

    await startButtonForCard(page, target.title).click();
    await expect(quizModal(page)).toBeVisible({ timeout: 10000 });
    await expect(questionBlock(page, 1, target.questionCount)).toBeVisible({ timeout: 20000 });

    for (let qi = 1; qi <= target.questionCount; qi++) {
      await answerQuestion(page, qi, target.questionCount);
    }
    await submitAnswersButton(page).click();

    const resultRegion = resultScore(page).locator(
      'xpath=ancestor::*[@aria-live or @role="status" or @role="alert"]',
    );
    await expect(resultRegion).toBeVisible({ timeout: 20000 });
  });

  test('automated accessibility scan of the Challenges list screen', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
    }));

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test('automated accessibility scan of the open quiz modal', async ({ page, request }) => {
    const studentId = await getUserIdByEmail(request, accountFor(ACCOUNT).email);
    const target = await pickChallenge(request, studentId, 15);
    await page.reload();
    await dismissAnnouncementIfPresent(page);
    if (target.status === 'assigned') await tab(page, 'Assigned').click();

    await startButtonForCard(page, target.title).click();
    await expect(quizModal(page)).toBeVisible({ timeout: 10000 });
    await expect(questionBlock(page, 1, target.questionCount)).toBeVisible({ timeout: 20000 });

    const results = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
    }));

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test('color contrast on the Challenges list screen meets WCAG AA', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .include('body')
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
