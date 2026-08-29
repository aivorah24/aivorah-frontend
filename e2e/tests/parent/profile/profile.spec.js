// Feature: Parent Profile (ParentProfileScreen.tsx) - profile info display,
// avatar photo change, Edit Profile modal (save + email-is-read-only), and
// the "Personal Information"/"Subscription" tile navigation.
//
// Confirmed via code read (ParentProfileScreen.tsx):
//   - Header title "Profile" (line 235), Profile Information card labels
//     Name/Email Address/Contact Number/City (line 298-301), Activity
//     Overview card (line 308) with ACTIVE DAYS/TOTAL LEARNING TIME/LINKED
//     stats (line 318/323/328).
//   - The camera icon (line 246-255) triggers pickPhoto() (66-82). On web
//     this creates a DETACHED <input type=file> (never appended to the DOM)
//     and calls .click() - Playwright must catch it via
//     page.waitForEvent('filechooser'), not a CSS selector. The chosen
//     photo becomes local React state only (setPhotoUri, line 73) - there
//     is NO fetch() call anywhere in this flow, so it's 100% client-side
//     and does not survive reload. Do not assert persistence here (the
//     real persisted-avatar upload lives on ParentSettingsScreen instead,
//     via a different flow - out of scope for this spec).
//   - "Edit Profile" (line 284-287) opens a modal (412-441) with fields
//     Full Name/Contact Number/City as real TextInputs, and Email Address
//     rendered as plain read-only Text with helper copy "You can update
//     your email address anytime from Settings" (line 425-429) - not an
//     input at all, so it structurally cannot be typed into.
//   - saveEdit() (199-213) calls PATCH /user/profile with
//     { email, name, location, phone, role: 'parent' }.
//   - "Personal Information" tile's action is openEdit (line 353) - it
//     reopens this SAME modal, it does NOT navigate anywhere. Only
//     "Notification Settings"/"Privacy & Security" navigate to
//     'ParentSettings' (354-355). "Subscription" navigates to
//     'ParentSubscription' (356), which renders SubscriptionScreen.tsx -
//     header "Aivorah Plans" (line 238), plan names Free/Pro/Max (36-93).
//
// Uses parent-i (mutable, dedicated - see OWNERSHIP in accounts.js) since
// this spec PATCHes its own name/phone/city. Linked read-only to student-a
// only for the Activity Overview "N kids" count.

import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';
import { accountFor, PASSWORD } from '../../helpers/accounts.js';
import { dismissAnnouncementIfPresent } from '../../helpers/dismissAnnouncement.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACCOUNT = 'parent-i';
const TEST_AVATAR = path.join(__dirname, '../../fixtures/test-avatar.jpg');

test.describe('Parent Profile', () => {
  test.use({ storageState: statePath(ACCOUNT) });

  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
    await dismissAnnouncementIfPresent(page);

    // Sidebar "Profile" link, under MENU (distinct from the page's own
    // Header title, which also renders the text "Profile" once we land -
    // .last() targets the sidebar entry that's actually clickable/on top,
    // same reasoning as this suite's other sidebar-nav helpers.
    await page.getByText('Profile', { exact: true }).last().click();
    await expect(
      page.getByText('Profile Information', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('displays the Profile Information and Activity Overview sections', async ({ page }) => {
    // RN Web renders a duplicate mobile/desktop copy of most layout text
    // (same known issue documented across this suite's other specs) -
    // scope to the first visible copy throughout.
    await expect(
      page.getByText('Name', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('Email Address', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('Contact Number', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('City', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();

    await expect(
      page.getByText('Activity Overview', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('ACTIVE DAYS', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('TOTAL LEARNING TIME', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('LINKED', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test('selecting a photo via the camera icon updates the avatar shown on screen', async ({
    page,
  }) => {
    // Before: the avatar shows a single-letter fallback (firstName[0]),
    // never an <img> yet. The avatar TouchableOpacity and the "Welcome
    // back,"/name text block are SIBLINGS under the same heroLeft View
    // (ParentProfileScreen.tsx line 245-256, not nested) - go up one level
    // from the text to its container, then to that container's preceding
    // sibling, which is the actual clickable avatar.
    const avatarButton = page
      .getByText('Welcome back,', { exact: true })
      .filter({ visible: true })
      .first()
      .locator('xpath=../preceding-sibling::*[1]');
    await expect(avatarButton.locator('img')).toHaveCount(0);

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      // The camera badge sits inside the same TouchableOpacity as the
      // avatar itself (line 246-255) - clicking the avatar area triggers
      // pickPhoto() either way.
      avatarButton.click(),
    ]);
    await fileChooser.setFiles(TEST_AVATAR);

    // After: photoUri becomes a real blob: URL (URL.createObjectURL,
    // line 73) rendered via <Image>, which is a real <img src="blob:...">
    // on web - a genuine, checkable UI change, not an implementation detail.
    await expect(avatarButton.locator('img[src^="blob:"]')).toBeVisible({ timeout: 15000 });
  });

  test('editing an editable field via the Edit Profile modal saves and persists on the Profile page', async ({
    page,
  }) => {
    const newCity = `E2E City ${Date.now()}`;

    await page.getByText('Edit Profile', { exact: true }).filter({ visible: true }).first().click();
    // The Modal is portal-rendered LAST in the DOM (confirmed via captured
    // accessibility snapshot - the <dialog> block is the final top-level
    // node), and the Profile page's own fields behind it stay technically
    // "visible" to Playwright (only visually covered, not display:none) -
    // .last() reaches the modal's copy; .first() would wrongly grab the
    // page's own field underneath and hang trying to fill a non-input.
    await expect(page.getByText('Edit Profile', { exact: true }).last()).toBeVisible({
      timeout: 15000,
    });

    // Modal contains all 4 labeled fields + Save Changes.
    await expect(page.getByText('Full Name', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Email Address', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Contact Number', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('City', { exact: true }).last()).toBeVisible();
    await expect(page.getByText('Save Changes', { exact: true }).last()).toBeVisible();

    // Email is rendered as plain read-only Text (line 426-428), not a
    // TextInput at all - proven by the real helper copy next to it, not an
    // attempted (and meaningless) "type into it" interaction.
    await expect(
      page.getByText('You can update your email address anytime from Settings', { exact: true }),
    ).toBeVisible();

    // City is a real sibling TextInput right after its label (line
    // 433-435) - fill it with a safe, uniquely-timestamped value.
    const cityInput = page
      .getByText('City', { exact: true })
      .last()
      .locator('xpath=following-sibling::*[1]');
    await cityInput.fill(newCity);

    await page.getByText('Save Changes', { exact: true }).last().click();

    // Modal closes.
    await expect(page.getByText('Save Changes', { exact: true })).toHaveCount(0, {
      timeout: 15000,
    });

    // Profile Information's City row shows the saved value, and the rest
    // of the section is still intact (not blanked/broken by the save).
    await expect(
      page.getByText(newCity, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('Name', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('Contact Number', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test('"Personal Information" reopens the Edit Profile modal (its real behavior, not a navigation)', async ({
    page,
  }) => {
    await page
      .getByText('Personal Information', { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    // See the previous test's comment - the modal is portal-rendered last
    // in the DOM, so .last() reaches it (not .first()).
    await expect(page.getByText('Edit Profile', { exact: true }).last()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Full Name', { exact: true }).last()).toBeVisible();
  });

  test('"Subscription" opens the Plans page, and back returns to the Profile page', async ({
    page,
  }) => {
    await page.getByText('Subscription', { exact: true }).filter({ visible: true }).first().click();

    await expect(
      page.getByText('Aivorah Plans', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText('Free', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('Pro', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText('Max', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();

    await page.goBack();
    await expect(
      page.getByText('Profile Information', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('"Notification Settings" navigates to the Settings screen', async ({ page }) => {
    // ParentProfileScreen.tsx line 354: both this tile and "Privacy &
    // Security" navigate to the SAME 'ParentSettings' route.
    await page
      .getByText('Notification Settings', { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      page.getByText('Manage your preferences and account', { exact: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText('Profile & Account', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test('"Privacy & Security" navigates to the Settings screen', async ({ page }) => {
    await page
      .getByText('Privacy & Security', { exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await expect(
      page.getByText('Manage your preferences and account', { exact: true }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText('Profile & Account', { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
  });

  test('Change Password actually updates the real password, verified by logging in through the real form', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90000);

    const email = accountFor(ACCOUNT).email;
    const tempPassword = `E2eTemp!${Date.now()}`;

    async function changePasswordViaUI(currentPassword, newPassword) {
      await page
        .getByText('Change Password', { exact: true })
        .filter({ visible: true })
        .first()
        .click();
      // Same portal-render-order reasoning as the Edit Profile modal above -
      // .last() reaches the modal's own copy.
      await expect(page.getByText('Change Password', { exact: true }).last()).toBeVisible({
        timeout: 15000,
      });

      await page
        .getByText('Current Password', { exact: true })
        .last()
        .locator('xpath=following-sibling::*[1]')
        .fill(currentPassword);
      await page
        .getByText('New Password', { exact: true })
        .last()
        .locator('xpath=following-sibling::*[1]')
        .fill(newPassword);
      await page
        .getByText('Confirm New Password', { exact: true })
        .last()
        .locator('xpath=following-sibling::*[1]')
        .fill(newPassword);
      await page.getByText('Update Password', { exact: true }).last().click();

      // handleChangePassword() (line 97-122) re-authenticates against
      // Firebase with the CURRENT password, then calls updatePassword() -
      // a real credential change, not a mock. Success shows "Password
      // Updated!" and auto-closes the modal after 1.5s (line 114).
      await expect(page.getByText('Password Updated!', { exact: true })).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('Password Updated!', { exact: true })).toHaveCount(0, {
        timeout: 15000,
      });
    }

    // CRITICAL: this test changes parent-i's REAL Firebase password. Every
    // other spec in this suite logs into every account with the SAME
    // shared password (E2E_PASSWORD) - if this test doesn't revert it,
    // parent-i is locked out for every future run. The revert runs in
    // `finally` so it still executes even if the change/verify steps above
    // throw partway through.
    try {
      await changePasswordViaUI(PASSWORD, tempPassword);

      // Prove the NEW password actually works by logging in through the
      // REAL login form - a fresh, un-authenticated browser context (this
      // test's own `page` still carries the old session, so a genuine
      // logged-out login has to happen somewhere else). Same login flow
      // tests/helpers/auth.js's harvestSession uses for every account.
      const freshContext = await browser.newContext();
      const freshPage = await freshContext.newPage();
      try {
        await freshPage.goto('/');
        await freshPage.frameLocator('iframe').getByRole('button', { name: 'Login' }).click();
        await freshPage.getByPlaceholder('you@example.com').fill(email);
        await freshPage.getByPlaceholder('••••••••').fill(tempPassword);
        await freshPage.getByText('Sign In', { exact: true }).click();
        await expect(freshPage.getByText('Aivorah', { exact: true }).first()).toBeVisible({
          timeout: 30000,
        });
      } finally {
        await freshContext.close();
      }
    } finally {
      // Revert back to the shared password so every other spec's login
      // keeps working, regardless of what happened above.
      await page.reload();
      await expect(page.getByText('My Children', { exact: true })).toBeVisible({ timeout: 15000 });
      await dismissAnnouncementIfPresent(page);
      await page.getByText('Profile', { exact: true }).last().click();
      await expect(
        page.getByText('Profile Information', { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible({ timeout: 15000 });
      await changePasswordViaUI(tempPassword, PASSWORD);
    }
  });
});
