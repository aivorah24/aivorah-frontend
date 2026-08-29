// This file tests the MY LEARNING PATHS screen - the page that lists the
// student's subjects ("My Learning Journey").
//
// It is Layer 1 of the learning flow:
//   Learning Paths -> Subject Syllabus -> Chapter -> Lesson -> Practice -> Quiz
// Only the first screen is covered here. The next screens get their own files.
//
// We test:
// 1. The screen loads and shows its parts (title, hero card, subject cards)
// 2. Each subject card shows its name, progress and how big the subject is
// 3. Tapping a subject opens that subject's full syllabus, and Back returns
// 4. The three "something else is happening" states: still loading, no
//    subjects at all, and the server being unreachable
//
// Nothing here changes any data, so this file shares the read-only account
// with other read-only tests.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../helpers/auth.js';

// student-a is the shared READ-ONLY account (see tests/helpers/accounts.js).
// Safe to share because nothing in this file saves anything.
const ACCOUNT = 'student-a';

// student-a is a CBSE / Grade 3 account. A few assertions below name that
// grade on purpose - if the account is ever reseeded to a different grade,
// those lines are the ones to update.
const EXPECTED_SUBTITLE = 'CBSE - Grade 3';

// The screen asks the server for the subject list. We fake that answer in the
// last few tests to force the loading / empty / error states, which are
// otherwise impossible to land on reliably.
const SUBJECTS_API = '**/curriculum/subjects*';

// Helper: go straight to the screen by its address.
//
// The sidebar has two overlapping copies (mobile + desktop layouts), so
// clicking the menu item is fiddly. This screen has a real URL, so we just
// open it - faster and nothing to fight with.
async function openLearningPaths(page) {
  await page.goto('/learning-paths');
  await expect(page.getByText('My Learning Journey').first()).toBeVisible({ timeout: 15000 });
}

// Helper: same as above, but also waits until the subject cards have actually
// arrived.
//
// Why this exists: the title is drawn immediately, but the subjects come from
// the server a moment later. Counting cards right after the title appears can
// therefore count ZERO - and count() reads once and doesn't wait, so the test
// fails at random depending on how quick the server was that run.
//
// Every test that counts or reads cards must use this one. The empty-state
// test is the exception - it WANTS zero cards, so it uses the plain version.
async function openLearningPathsWithSubjects(page) {
  await openLearningPaths(page);
  await expect(page.getByTestId('subject-card-name').first()).toBeVisible({ timeout: 15000 });
}

// Helper: the whole card box for one subject.
// The testID sits on the subject NAME, and the name's parent is the card, so
// stepping up one level ('..') gives us everything in that card - the percent,
// the chapter count and the completed count.
function subjectCard(page, index) {
  return page.getByTestId('subject-card-name').nth(index).locator('xpath=..');
}

test.describe('Student Learning Paths', () => {
  // Start already logged in. See tests/helpers/auth.js for why the session
  // needs applySession on top of storageState.
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context }) => {
    await applySession(context, ACCOUNT);
  });

  test.describe('Load & Sections', () => {
    test('screen shows its title and the curriculum and grade it is showing', async ({ page }) => {
      await openLearningPaths(page);

      await expect(page.getByText('My Learning Journey').first()).toBeVisible();
      await expect(page.getByText(EXPECTED_SUBTITLE).first()).toBeVisible();
    });

    test('hero card shows the streak line, the subject tally and the overall percent', async ({
      page,
    }) => {
      await openLearningPathsWithSubjects(page);

      // "<First name>, keep the streak alive" - we don't hardcode the name.
      await expect(page.getByText(/keep the streak alive/).first()).toBeVisible();

      // "0/3 subjects in progress" - the second number must match how many
      // subject cards are actually on screen, so the tally can't drift.
      const cardCount = await page.getByTestId('subject-card-name').count();
      await expect(page.getByText(/\d+\/\d+ subjects in progress/).first()).toBeVisible();
      const tally = await page
        .getByText(/\d+\/\d+ subjects in progress/)
        .first()
        .textContent();
      expect(tally).toContain(`/${cardCount} subjects in progress`);

      // The big ring on the right: a percentage, labelled "overall".
      await expect(page.getByText('overall', { exact: true })).toBeVisible();
    });

    test('subjects section is shown with at least one subject', async ({ page }) => {
      await openLearningPaths(page);

      await expect(page.getByText('Subjects', { exact: true })).toBeVisible();
      await expect(page.getByText('Choose what to study next')).toBeVisible();

      // toBeVisible waits for the cards to arrive, so this one is safe to
      // count straight after - unlike a bare .count(), which reads once.
      const cards = page.getByTestId('subject-card-name');
      await expect(cards.first()).toBeVisible({ timeout: 15000 });
      expect(await cards.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Subject Cards', () => {
    test('every subject card shows a name, a progress percent and a completed count', async ({
      page,
    }) => {
      await openLearningPathsWithSubjects(page);

      const names = page.getByTestId('subject-card-name');
      const count = await names.count();

      for (let i = 0; i < count; i++) {
        const card = subjectCard(page, i);
        const text = await card.innerText();

        // A name that isn't blank.
        expect((await names.nth(i).textContent())?.trim()).toBeTruthy();
        // A percentage, e.g. "0%".
        expect(text).toMatch(/\d+%/);
        // How much is done, e.g. "0 completed".
        expect(text).toMatch(/\d+ completed/);
      }
    });

    test('every subject card says how big the subject is', async ({ page }) => {
      await openLearningPathsWithSubjects(page);

      const count = await page.getByTestId('subject-card-name').count();

      for (let i = 0; i < count; i++) {
        const text = await subjectCard(page, i).innerText();

        // The app picks whichever unit it actually knows for that subject -
        // chapters for CBSE, units for IB PYP, or a plain topic count as a
        // last resort. So we accept any of the three rather than assuming one.
        expect(text).toMatch(/\d+ (chapters?|units?|topics?)/);
      }
    });
  });

  test.describe('Navigation', () => {
    test("tapping a subject opens that subject's full syllabus", async ({ page }) => {
      await openLearningPaths(page);

      const firstSubject = page.getByTestId('subject-card-name').first();
      const subjectName = (await firstSubject.textContent())?.trim();

      await firstSubject.click();

      // We should now be on the syllabus page for that same subject.
      await expect(page).toHaveURL(/\/subject-syllabus\?/);

      // Ask only for the copy we can actually SEE. The subject card we just
      // left is still in the page, just hidden, and plain .first() kept
      // picking that one - so the check passed on the old screen instead of
      // the new one.
      await expect(
        page.getByText(subjectName, { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/Full syllabus/).first()).toBeVisible({ timeout: 15000 });
    });

    test('going back from a subject returns to the subject list', async ({ page }) => {
      await openLearningPaths(page);

      await page.getByTestId('subject-card-name').first().click();
      await expect(page).toHaveURL(/\/subject-syllabus\?/);

      await page.goBack();

      await expect(page).toHaveURL(/\/learning-paths/);
      await expect(page.getByTestId('subject-card-name').first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Loading, Empty and Error states', () => {
    // These three states depend on what the server replies, so we answer for
    // it. page.route only affects THIS test's page - other tests running at
    // the same time are untouched.

    test('shows a loading message while the subjects are still coming', async ({ page }) => {
      // Hold the answer back so the loading state stays on screen long enough
      // to check. Without this the list arrives too fast to ever see it.
      await page.route(SUBJECTS_API, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        await route.continue();
      });

      await page.goto('/learning-paths');

      await expect(page.getByText(/Loading .* subjects/)).toBeVisible({ timeout: 15000 });
    });

    test('shows a friendly message when the student has no subjects', async ({ page }) => {
      // Reply with an empty list, as if nothing has been set up for them yet.
      await page.route(SUBJECTS_API, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ subjects: [] }),
        }),
      );

      await openLearningPaths(page);

      await expect(page.getByText('No subjects available for this profile yet.')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByTestId('subject-card-name')).toHaveCount(0);
    });

    test('shows an error message when the subjects cannot be loaded', async ({ page }) => {
      // Make the request fail outright, like the server being down.
      await page.route(SUBJECTS_API, (route) => route.abort());

      await page.goto('/learning-paths');

      await expect(
        page.getByText(
          'Could not load curriculum right now. Check if the server is running and try again.',
        ),
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
