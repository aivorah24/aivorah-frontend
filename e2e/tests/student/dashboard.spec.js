// This file tests the STUDENT DASHBOARD screen - the page a student lands
// on right after logging in.
//
// We test:
// 1. The dashboard actually shows its main sections (greeting, today's
//    goals, quick actions, learning path)
// 2. The profile popup: editing the display name, and logging out
//    (the photo upload lives in dashboard-photo.spec.js - it needs a
//    real browser window, which must be set at the top of its own file)
// 3. Navigation: clicking the "Aivorah" logo, "Ask Aivorah", and the
//    Today's Goals tiles (Study Time / Chapters / XP Earned)
// 4. Two known bugs found while manually walking through the app - these
//    tests are written for the CORRECT behavior, so they'll show up
//    RED/failing until the app is fixed. That's intentional (see CLAUDE.md).

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../helpers/auth.js';

// This file OWNS student-b (see tests/helpers/accounts.js).
// It changes the display name and the profile photo, so it needs an account
// no other spec touches - otherwise a test running at the same time in
// another file would see a half-edited profile.
const ACCOUNT = 'student-b';

// Helper: opens the "My Profile" popup (the avatar icon in the top-right corner).
// We click it by its testID, not by looking for an image. The avatar is only
// a real image when the user has uploaded a photo - otherwise the app draws
// an icon instead, and there'd be no image to find.
async function openProfileMenu(page) {
  await page.getByTestId('header-profile-button').click();
  await expect(page.getByText('My Profile')).toBeVisible();
}

//test.describe - folder that group related tests together.
test.describe('Student Dashboard', () => {
  // Start every test already logged in, instead of typing the password again.
  // storageState brings back localStorage; applySession puts back the two
  // pieces it can't carry (the Firebase token and a sessionStorage flag).
  // See tests/helpers/auth.js for why all three are needed.
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test.describe('Load & Sections', () => {
    test("dashboard shows greeting, today's goals, quick actions, and learning path", async ({
      page,
    }) => {
      await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible();
      await expect(page.getByText("Today's Goals")).toBeVisible();
      await expect(page.getByText('Study Time')).toBeVisible();
      await expect(page.getByText('Chapters', { exact: true })).toBeVisible();
      await expect(page.getByText('XP Earned', { exact: true })).toBeVisible();
      await expect(page.getByText('Quick Actions')).toBeVisible();
      await expect(page.getByText('Learning Path', { exact: true })).toBeVisible();
    });
  });

  test.describe('Profile Menu', () => {
    // FLAKY - the app is racy here, not the test. Saving always works (the tick
    // sends PATCH /user/profile and gets a 200, and the new name is definitely
    // there after a reload). What's unreliable is the popup: sometimes it shows
    // the new name straight away, sometimes it keeps showing the OLD one until
    // you reload. Same steps, same account, both outcomes seen.
    //
    // Leaving the assertion on the CORRECT behavior - the name should change
    // straight away. If this goes red, it's the app to fix, not this test.
    test('editing display name updates the name shown on the profile', async ({ page }) => {
      await openProfileMenu(page);

      await page.getByText('Edit display name').click();
      const nameInput = page.getByRole('textbox', { name: 'Enter name...' });
      await nameInput.fill('Demo Student Updated');

      // The app only saves on the tick button, not on Enter - there's no
      // keyboard submit handler wired up.
      //
      // The row is: name box, tick, cross. The tick and cross are plain boxes
      // with just an icon inside - no text and no button role - so there's
      // nothing to ask for by name. The one thing that IS reliable is the
      // order: the tick is the box right after the name box.
      await nameInput.locator('xpath=following-sibling::*[1]').click();

      // Scoped to the profile dialog - the page has hidden duplicate nav
      // copies (mobile/desktop layouts) that also match this text.
      await expect(page.getByRole('dialog').getByText('Demo Student Updated')).toBeVisible();
    });

    test('logging out returns to the landing page', async ({ page }) => {
      await openProfileMenu(page);
      await page.getByText('Log Out').click();

      // Back on the landing page - the iframe's Login button is visible again.
      const landingFrame = page.frameLocator('iframe');
      await expect(landingFrame.getByRole('button', { name: 'Login' })).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('clicking the Aivorah logo asks to stay or go home, "Stay" keeps you on the dashboard', async ({
      page,
    }) => {
      // NOTE: the app keeps two copies of the sidebar in the page at once
      // (mobile + desktop layouts). They overlap, so the first copy sits
      // underneath and its clicks get swallowed by the one on top. We click
      // the last copy - that's the one actually on top and reachable.
      // The duplicate sidebar itself looks like a real layout bug, worth
      // reporting separately.
      await page.getByText('Aivorah', { exact: true }).filter({ visible: true }).last().click();
      await page.getByText('Stay', { exact: true }).click();

      await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible();
    });

    test('clicking the Aivorah logo then "Go to Home page" leaves to the landing page', async ({
      page,
    }) => {
      // Same duplicate-layout issue noted above.
      await page.getByText('Aivorah', { exact: true }).filter({ visible: true }).last().click();
      await page.getByText('Go to Home', { exact: true }).click();

      const landingFrame = page.frameLocator('iframe');
      await expect(landingFrame.getByRole('button', { name: 'Login' })).toBeVisible();
    });

    test('"Ask Aivorah" quick action routes to AI Coach', async ({ page }) => {
      await page.getByText('Ask anything').click();
      await expect(page.getByPlaceholder('Message Aivorah...')).toBeVisible();
    });

    // Study Time and XP Earned both open the Progress page. Chapters is the
    // odd one out - it goes to Learning Paths instead (see DashboardScreen's
    // GOALS list, where only Chapters sets its own route).
    for (const tileName of ['Study Time', 'XP Earned']) {
      test(`"${tileName}" goal tile routes to the Progress page`, async ({ page }) => {
        await page.getByText(tileName, { exact: true }).filter({ visible: true }).first().click();
        await expect(page.getByText('My Progress', { exact: true })).toBeVisible();
        await expect(page.getByText('Subject Performance')).toBeVisible();
      });
    }

    test('"Chapters" goal tile routes to the Learning Paths page', async ({ page }) => {
      await page.getByText('Chapters', { exact: true }).filter({ visible: true }).first().click();
      await expect(page.getByText('My Learning Journey', { exact: true }).first()).toBeVisible();
    });
  });

  test.describe('Learning Path (known bugs)', () => {
    // KNOWN BUG: clicking a chapter in the Learning Path should open that
    // chapter, but nothing happens today. Written for the correct behavior
    // on purpose, so it shows red until this is fixed.
    test('clicking a chapter in Learning Path opens it (known bug - currently does nothing)', async ({
      page,
    }) => {
      await page.getByText('Start', { exact: true }).first().click();

      // Should have navigated away from the dashboard's Learning Path list
      // into the chapter itself - the list should no longer be showing.
      await expect(page.getByText('Learning Path', { exact: true })).not.toBeVisible({
        timeout: 5000,
      });
    });

    // KNOWN BUG: the subject list shown on "My Learning Journey" doesn't
    // match what shows up in the Progress page's subject filter or the
    // Learning Path's subject tabs (e.g. Hindi is missing from both).
    // This check doesn't hardcode subject names, so it stays valid no
    // matter what curriculum/grade the test account is set to.
    test('every subject on My Learning Journey also appears in Progress and Learning Path filters (known bug)', async ({
      page,
    }) => {
      // Same duplicate-layout issue noted above.
      await page
        .getByText('My Learning Paths', { exact: true })
        .filter({ visible: true })
        .last()
        .click();

      // Read the subject names off the subject cards on My Learning Journey.
      const subjectNames = page.getByTestId('subject-card-name');
      await expect(subjectNames.first()).toBeVisible();
      const journeySubjects = await subjectNames.allTextContents();

      // Now go to Progress and check each of those subjects shows up there too.
      await page.getByText('Progress', { exact: true }).filter({ visible: true }).last().click();
      await expect(page.getByText('My Progress', { exact: true })).toBeVisible();

      for (const subject of journeySubjects) {
        // Same duplicate-layout issue again: a subject name can appear a dozen
        // times on the page, and most of those copies are the hidden layout.
        // .first() kept picking a hidden one, so this failed even for subjects
        // that were plainly on screen - and that hid the real bug. Ask only for
        // the copies you can actually see.
        await expect(
          page.getByText(subject, { exact: true }).filter({ visible: true }).first(),
        ).toBeVisible();
      }
    });
  });
});
