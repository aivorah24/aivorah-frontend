// This file tests the STUDENT PROFILE screen (sidebar -> Profile).
//
// What the screen lets a student do:
// 1. Edit their details - Full Name, Curriculum, Grade, Location, School, Bio
// 2. Change their profile photo (the camera button on the avatar)
// 3. Pick an avatar style, a learning style, and favourite subjects
// 4. Jump to Notifications / Privacy / Help Center, and Sign Out
//
// Rules we follow in this file:
// - After saving, we RELOAD the page and check the value is still there.
//   Saving to the screen isn't enough - it has to reach the database.
// - Every test runs in PARALLEL and stands on its own: its own browser, its
//   own logged-in session, no leftovers from any other test.
// - Tests that only LOOK at things share a read-only account. Tests that SAVE
//   something use an account this spec owns - see the note further down.
// - The app renders TWO copies of the sidebar at once (mobile + desktop
//   layouts). They sit on top of each other, so clicks on the first copy get
//   swallowed. We always click the LAST visible copy - that's the real one.

import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { accountFor } from '../helpers/accounts.js';
import { newPageAs } from '../helpers/session.js';
import { snapshotProfile } from '../helpers/resetProfile.js';

// The test avatar image lives in tests/fixtures, one folder up from here.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_AVATAR_PATH = path.join(__dirname, '..', 'fixtures', 'test-avatar.jpg');

// student-a is shared and never written to. This spec owns THREE accounts that
// it does write to, split by WHAT they write - because every test runs at the
// same time, so two tests must never be saving the same thing at once:
//
// - student-c: the Edit Profile popup fields. Each of those tests changes a
//   DIFFERENT field, so one account is enough for all of them.
// - student-g: avatar style, learning style, subjects.
// - student-h: the profile photo. Separate from student-g because the avatar
//   test DELETES the photo - sharing would mean the two undo each other.
const READ_ONLY = 'student-a';
const EDITABLE = 'student-c';
const EDITABLE_EMAIL = accountFor(EDITABLE).email;
const PREFS = 'student-g';
const PREFS_EMAIL = accountFor(PREFS).email;
const PHOTO = 'student-h';

// Which grades each curriculum offers, taken from the app's own
// getGradesForCurriculum() in OnboardingScreen.tsx.
const ALL_GRADES = [
  'Nursery',
  'LKG',
  'UKG',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

const GRADES_BY_CURRICULUM = {
  'IB PYP': ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'],
  'IB MYP': ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  'IB DP': ['Grade 11', 'Grade 12'],
  CBSE: ALL_GRADES,
  ICSE: ALL_GRADES,
  // NOTE: the app gives Cambridge only Grade 1-10, but Sai's spec says 1-12.
  // We assert what the app does today here, and there's a separate failing
  // test further down for the missing Grade 11 / 12.
  Cambridge: ALL_GRADES.slice(3, 13),
};

// ── Helpers ─────────────────────────────────────────────────────────────────

// Opens a fresh browser already signed in as the given account, and lands on
// the Profile screen.
async function openProfile(browser, account) {
  const page = await newPageAs(browser, account);
  await page.goto('/');
  await gotoProfile(page);
  return page;
}

// Read-only tests share this account - they never save anything.
const openReadOnly = (browser) => openProfile(browser, READ_ONLY);
// Tests that save an edit-popup field use student-c.
const openForEditing = (browser) => openProfile(browser, EDITABLE);
// Tests that save an avatar / learning style / subject use student-g.
const openForPrefs = (browser) => openProfile(browser, PREFS);
// The photo test gets its own account again, because the avatar test DELETES
// the photo - if they shared, they'd undo each other mid-run.
const openForPhoto = (browser) => openProfile(browser, PHOTO);

// Clicks "Profile" in the sidebar and waits for the screen to load.
async function gotoProfile(page) {
  await page.getByText('Profile', { exact: true }).filter({ visible: true }).last().click();
  await expect(page.getByText('My Profile', { exact: true })).toBeVisible();
}

// Reloads the browser and comes back to Profile. This is how we prove a change
// was really saved to the server, and not just held in the screen's memory.
async function reloadToProfile(page) {
  await page.reload();
  await gotoProfile(page);
}

// The big card at the top with the photo, name and the Student/Grade/Plan tags.
// We find it by the two things only it contains: the "Edit" button and the
// plan badge.
function heroCard(page) {
  return page
    .locator('div')
    .filter({ has: page.getByText('Edit', { exact: true }) })
    .filter({ hasText: /Free Plan|Pro Plan/ })
    .last();
}

// The "Edit Profile" popup. We find the innermost box that has both the title
// and the Save button, so our clicks never leak out to the page behind it.
function editModal(page) {
  return page
    .locator('div')
    .filter({ has: page.getByText('Edit Profile', { exact: true }) })
    .filter({ has: page.getByText('Save Changes') })
    .last();
}

async function openEditModal(page) {
  await heroCard(page).getByText('Edit', { exact: true }).click();
  await expect(page.getByText('Edit Profile', { exact: true })).toBeVisible();
}

// The avatar with the little camera button, in the middle of the hero card.
// There's nothing to search for by name - when the student has no photo yet
// it's just a coloured circle with an icon, not even an image. But it always
// sits directly after the "Edit" button, so we find it from there.
function heroAvatar(page) {
  return heroCard(page)
    .getByText('Edit', { exact: true })
    .locator('xpath=ancestor::div[1]/following-sibling::div[1]');
}

// The "Choose Your Look" card. The avatar names (Scholar, Ninja...) also show
// up in the profile popup in the top bar, so we always pick from this card.
//
// We ask for the box that holds BOTH the subtitle and the avatar we want. The
// subtitle alone isn't enough: it lives in its own little heading box, and
// .last() used to land on that heading - which has no avatars inside it, so
// every click timed out.
function avatarStyleCard(page, avatarLabel) {
  return page
    .locator('div')
    .filter({ has: page.getByText('Pick an avatar style') })
    .filter({ has: page.getByText(avatarLabel, { exact: true }) })
    .last();
}

// Clicks one of the avatar styles in that card.
function avatarStyle(page, label) {
  return avatarStyleCard(page, label).getByText(label, { exact: true });
}

// Uploads the test photo and waits for the server to accept it.
//
// Clicking the avatar makes the app ask the browser for a file. We have to
// CATCH that request (waitForEvent('filechooser')) and hand the file over.
//
// Why we can't just fill in the file box instead: the app doesn't keep one.
// It builds a hidden box, asks for a file, and deletes the box the moment it
// gets an answer. If nobody is listening, Playwright answers "no file" for us
// straight away - so the box is already deleted by the time we look for it.
// That's what made this test time out before. Catching the request keeps the
// box alive, and works headless, so this test stays fast.
async function uploadPhoto(page) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    heroAvatar(page).click(),
  ]);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/user/upload-photo')),
    fileChooser.setFiles(TEST_AVATAR_PATH),
  ]);
  return response;
}

// Fills one of the plain text fields in the edit popup (Name / School / Bio).
async function fillField(page, placeholder, value) {
  await editModal(page).getByPlaceholder(placeholder).fill(value);
}

// Saves and waits for the popup to close - which only happens on success.
async function saveProfile(page) {
  await editModal(page).getByText('Save Changes').click();
  await expect(page.getByText('Edit Profile', { exact: true })).toBeHidden();
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe('Student Profile', () => {
  test.describe('Load & Sections', () => {
    test('profile shows the hero card and every section', async ({ browser }) => {
      const page = await openReadOnly(browser);

      // Hero: role, grade, curriculum and plan badges.
      await expect(heroCard(page).getByText('Student', { exact: true })).toBeVisible();
      await expect(heroCard(page).getByText(/^Grade |^Nursery$|^LKG$|^UKG$/)).toBeVisible();
      await expect(heroCard(page).getByText(/Free Plan|Pro Plan/)).toBeVisible();

      // The five cards below it.
      await expect(page.getByText('Choose Your Look')).toBeVisible();
      await expect(page.getByText('How I Learn Best')).toBeVisible();
      await expect(page.getByText('Subjects I Love')).toBeVisible();
      await expect(page.getByText('Learning Buddy')).toBeVisible();
      await expect(page.getByText('Account', { exact: true })).toBeVisible();
    });
  });

  test.describe('Edit Profile - saving', () => {
    // ONE test for the whole popup, on purpose.
    //
    // We used to have a separate test per field, each changing only its own
    // field. That looked tidy but was wrong, because the app doesn't save one
    // field at a time - pressing Save sends the WHOLE form (see
    // handleSaveProfile in ProfileScreen.tsx). So two of those tests running at
    // the same time each sent the values THEY had read when they opened the
    // popup, and whichever finished last quietly undid the other one.
    //
    // Saving the form as one thing is also what a real student does, so this is
    // the more honest test - and it can't fight itself.
    test('every field saves and survives a reload', async ({ browser }) => {
      const page = await openForEditing(browser);
      await openEditModal(page);
      const modal = editModal(page);

      await fillField(page, 'Your name', 'Profile Test Name');
      await fillField(page, 'e.g. DPS Bengaluru', 'Profile Test School');
      await fillField(page, 'A short tagline…', 'Learning something new every day');

      // Curriculum first, then Grade - the grade choices depend on which
      // curriculum is picked, so the other order would offer the wrong list.
      await modal.getByText('IB MYP', { exact: true }).click();
      await modal.getByText('Grade 7', { exact: true }).click();

      // Location is a dropdown, not a text box: click it open, type to filter,
      // then pick the city. The dropdown sits just below the "Location" label
      // row - we find it from the label rather than by its own text, because
      // that text changes depending on which city is already saved.
      await modal
        .getByText('Location', { exact: true })
        .locator('xpath=ancestor::div[1]/following-sibling::div[1]')
        .click();
      await modal.getByPlaceholder('Search city...').fill('Chennai');
      await modal.getByText('Chennai', { exact: true }).click();

      await saveProfile(page);

      // Check the database first. If this passes but the screen checks below
      // fail, the values were saved and the screen simply isn't showing them.
      // If this fails, the save itself never landed.
      await expect
        .poll(async () => {
          const { user } = await snapshotProfile(EDITABLE_EMAIL);
          return user;
        })
        .toMatchObject({
          name: 'Profile Test Name',
          school: 'Profile Test School',
          curriculum: 'IB MYP',
          grade: 'Grade 7',
          location: 'Chennai',
        });

      // Then the screen, before and after a reload. Surviving the reload is
      // what proves it reached the server and isn't just held in memory.
      for (const value of [
        'Profile Test Name',
        'Profile Test School',
        'Learning something new every day',
        'IB MYP',
        'Grade 7',
        'Chennai',
      ]) {
        await expect(heroCard(page).getByText(value)).toBeVisible();
      }

      await reloadToProfile(page);

      for (const value of [
        'Profile Test Name',
        'Profile Test School',
        'Learning something new every day',
        'IB MYP',
        'Grade 7',
        'Chennai',
      ]) {
        await expect(heroCard(page).getByText(value)).toBeVisible();
      }
    });
  });

  test.describe('Edit Profile - curriculum decides the grade list', () => {
    // These only open the popup and look at the options - nothing is saved,
    // so they can share the read-only account.
    for (const [curriculum, expectedGrades] of Object.entries(GRADES_BY_CURRICULUM)) {
      test(`${curriculum} shows exactly its own grades`, async ({ browser }) => {
        const page = await openReadOnly(browser);
        await openEditModal(page);
        const modal = editModal(page);
        await modal.getByText(curriculum, { exact: true }).click();

        for (const grade of expectedGrades) {
          await expect(modal.getByText(grade, { exact: true })).toBeVisible();
        }
        // And nothing from outside the list is offered.
        for (const grade of ALL_GRADES.filter((g) => !expectedGrades.includes(g))) {
          await expect(modal.getByText(grade, { exact: true })).toBeHidden();
        }
      });
    }

    // KNOWN GAP: Sai's spec says Cambridge covers Grade 1-12, but the app's
    // getGradesForCurriculum() stops at Grade 10. Written for the expected
    // behaviour on purpose, so it stays RED until the app is fixed (or the
    // spec is corrected).
    test('Cambridge offers Grade 11 and Grade 12 (known gap - app stops at 10)', async ({
      browser,
    }) => {
      const page = await openReadOnly(browser);
      await openEditModal(page);
      const modal = editModal(page);
      await modal.getByText('Cambridge', { exact: true }).click();

      await expect(modal.getByText('Grade 11', { exact: true })).toBeVisible();
      await expect(modal.getByText('Grade 12', { exact: true })).toBeVisible();
    });

    test('switching to a curriculum without the current grade clears the grade', async ({
      browser,
    }) => {
      const page = await openReadOnly(browser);
      await openEditModal(page);
      const modal = editModal(page);

      // Start on IB PYP / Grade 3, then move to IB DP which only has 11 & 12.
      await modal.getByText('IB PYP', { exact: true }).click();
      await modal.getByText('Grade 3', { exact: true }).click();
      await modal.getByText('IB DP', { exact: true }).click();

      // Grade 3 isn't offered any more, so nothing should stay selected -
      // otherwise Save would keep a grade that doesn't exist in IB DP.
      await expect(modal.getByText('Grade 3', { exact: true })).toBeHidden();
      await expect(modal.getByText('Grade 11', { exact: true })).toBeVisible();
    });
  });

  test.describe('Edit Profile - validation, loading and error states', () => {
    test('empty name shows an error and keeps the popup open', async ({ browser }) => {
      // The app blocks this before it reaches the server, so nothing is saved.
      const page = await openReadOnly(browser);
      await openEditModal(page);
      await fillField(page, 'Your name', '');
      await editModal(page).getByText('Save Changes').click();

      await expect(page.getByText('Please enter your name.')).toBeVisible();
      await expect(page.getByText('Edit Profile', { exact: true })).toBeVisible();
    });

    test('Save shows a loading spinner while the request is in flight', async ({ browser }) => {
      // Read-only account: we hold the save open, then throw it away, so
      // nothing is ever written and this test can't clash with any other.
      const page = await openReadOnly(browser);

      // Hold the save request open for a moment so the loading state is
      // actually visible instead of flashing past, then drop it.
      await page.route('**/user/profile', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.abort();
      });

      await openEditModal(page);
      // Save the name that's already there - we only care about the spinner,
      // so there's no need to change any data.
      await editModal(page).getByText('Save Changes').click();

      // While saving, the button text is replaced by a spinner.
      //
      // We look for the text on the PAGE, not inside editModal(). editModal is
      // defined as "the box containing Save Changes", so once that text is
      // gone the box can't be found either - and a check against something
      // that isn't there would pass no matter what the app did.
      await expect(page.getByText('Save Changes')).toBeHidden();

      // Once the request is over the button comes back - proving the spinner
      // was a passing phase, not the button simply never being there.
      await expect(page.getByText('Save Changes')).toBeVisible();
    });

    test('a failed save shows an error message', async ({ browser }) => {
      // The request never reaches the server, so no account is changed.
      const page = await openReadOnly(browser);
      await page.route('**/user/profile', (route) => route.abort());

      await openEditModal(page);
      await fillField(page, 'Your name', 'Error State Test');
      await editModal(page).getByText('Save Changes').click();

      await expect(page.getByText('Could not save. Please try again.')).toBeVisible();
    });

    test('Cancel closes the popup without saving', async ({ browser }) => {
      const page = await openReadOnly(browser);
      await openEditModal(page);
      await fillField(page, 'Your name', 'Should Not Be Saved');
      await editModal(page).getByText('Cancel').click();

      await expect(page.getByText('Edit Profile', { exact: true })).toBeHidden();
      await reloadToProfile(page);
      await expect(heroCard(page).getByText('Should Not Be Saved')).toBeHidden();
    });
  });

  test.describe('Profile photo', () => {
    test('uploading a photo replaces the avatar and survives a reload', async ({ browser }) => {
      const page = await openForPhoto(browser);

      const response = await uploadPhoto(page);
      expect(response.ok()).toBeTruthy();

      await expect(heroCard(page).locator('img')).toBeVisible();
      await reloadToProfile(page);
      await expect(heroCard(page).locator('img')).toBeVisible();
    });
  });

  test.describe('Avatar style, learning style and subjects', () => {
    test('picking an avatar style replaces the uploaded photo', async ({ browser }) => {
      const page = await openForPrefs(browser);

      // Start from a real photo, so there's something to replace. (Without
      // this the test would pass even if the app did nothing at all.)
      await uploadPhoto(page);
      await expect(heroCard(page).locator('img')).toBeVisible();

      // Picking a drawn avatar style clears the photo - the app can only show
      // one or the other, so the hero should stop showing an <img>.
      await avatarStyle(page, 'Scholar').click();
      await expect(heroCard(page).locator('img')).toHaveCount(0);
    });

    // handleSelectAvatar() in ProfileScreen.tsx looks like it only changes the
    // app's local copy, but updateUser() in AuthContext.tsx quietly saves the
    // preferences to the server for it - so the choice really does stick. We
    // check the database rather than the screen, because the screen would look
    // right either way.
    test('the chosen avatar style is still there after a reload', async ({ browser }) => {
      const page = await openForPrefs(browser);
      await avatarStyle(page, 'Scholar').click();
      await reloadToProfile(page);

      await expect
        .poll(async () => (await snapshotProfile(PREFS_EMAIL)).preferences?.avatarStyle)
        .toBe('scholar');
    });

    test('picking a learning style saves it', async ({ browser }) => {
      const page = await openForPrefs(browser);

      const [response] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/user/preferences')),
        page.getByText('Auditory', { exact: true }).click(),
      ]);
      expect(response.ok()).toBeTruthy();

      await reloadToProfile(page);
      await expect(page.getByText('Auditory', { exact: true })).toBeVisible();
    });

    test('a subject chip turns on, and turns off again when clicked twice', async ({ browser }) => {
      const page = await openForPrefs(browser);

      // The chip looks the same on screen whether it's on or off (only a tick
      // icon and the text colour change, and neither is something a test can
      // reliably read). So we check the value the app actually saved instead.
      await page.getByText('Coding', { exact: true }).click();
      await expect
        .poll(async () => (await snapshotProfile(PREFS_EMAIL)).preferences?.interests)
        .toContain('coding');

      await page.getByText('Coding', { exact: true }).click();
      await expect
        .poll(async () => (await snapshotProfile(PREFS_EMAIL)).preferences?.interests)
        .not.toContain('coding');
    });

    test('Learning Buddy is marked Coming Soon and is not clickable', async ({ browser }) => {
      const page = await openReadOnly(browser);

      await expect(page.getByText('Coming Soon')).toBeVisible();
      await expect(page.getByText('Naruto', { exact: true })).toBeVisible();

      // The chips are switched off in the app (pointerEvents="none"), so a
      // click can never land on them - Playwright waits and gives up. If this
      // click ever succeeds, the section became clickable by mistake.
      await expect(
        page.getByText('Naruto', { exact: true }).click({ timeout: 3000 }),
      ).rejects.toThrow();
    });
  });

  test.describe('Account rows and navigation', () => {
    test('Notifications opens Settings on the notifications section', async ({ browser }) => {
      const page = await openReadOnly(browser);
      await page.getByText('Notifications', { exact: true }).click();

      await expect(page.getByText('Manage your preferences and account details.')).toBeVisible();
      await expect(page.getByText('Push Notifications')).toBeVisible();
    });

    test('Privacy opens Settings on the security section', async ({ browser }) => {
      const page = await openReadOnly(browser);
      await page.getByText('Privacy', { exact: true }).click();

      await expect(page.getByText('Manage your preferences and account details.')).toBeVisible();
      await expect(page.getByText('Two-Factor Auth')).toBeVisible();
    });

    test('Help Center opens the Help Center screen', async ({ browser }) => {
      const page = await openReadOnly(browser);

      // "Help Center" also appears twice in the sidebar (the mobile and desktop
      // copies), and the buried one swallows the click. The row's subtitle is
      // on the page only once, and clicking it hits the same row.
      await page.getByText('FAQs and support').click();

      await expect(page.getByText(/We're here to support you,/)).toBeVisible();
    });

    test('the plan badge opens the Plans screen', async ({ browser }) => {
      const page = await openReadOnly(browser);
      await heroCard(page)
        .getByText(/Free Plan|Pro Plan/)
        .click();

      await expect(page.getByText('Plans', { exact: true })).toBeVisible();
    });

    test('Sign Out asks first - Cancel keeps you on the profile', async ({ browser }) => {
      const page = await openReadOnly(browser);
      await page.getByText('Sign Out', { exact: true }).first().click();
      await expect(
        page.getByText('Are you sure you want to sign out of your account?'),
      ).toBeVisible();

      await page.getByText('Cancel', { exact: true }).click();
      await expect(page.getByText('My Profile', { exact: true })).toBeVisible();
    });

    test('Sign Out logs the student out and returns to the landing page', async ({ browser }) => {
      // Signing out only affects this test's own browser, not the saved
      // session on disk - so other tests are unaffected.
      const page = await openReadOnly(browser);
      await page.getByText('Sign Out', { exact: true }).first().click();
      await expect(
        page.getByText('Are you sure you want to sign out of your account?'),
      ).toBeVisible();

      // The confirm button carries the same words as the row we just clicked,
      // so we take the last one - the one inside the popup.
      await page.getByText('Sign Out', { exact: true }).last().click();

      const landingFrame = page.frameLocator('iframe');
      await expect(landingFrame.getByRole('button', { name: 'Login' })).toBeVisible();

      // And the app is really logged out - the sidebar (and Profile) is gone.
      await expect(page.getByText('My Profile', { exact: true })).toBeHidden();
    });
  });
});
