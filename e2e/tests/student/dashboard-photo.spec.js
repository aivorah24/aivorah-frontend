// This file tests ONE thing: uploading a new profile photo from the
// student dashboard.
//
// It lives in its own file because it needs a real browser window
// (headless: false), and that setting is only allowed at the top of a
// file - not inside a group. Keeping it separate lets every other
// dashboard test stay headless and fast.
//
// Why a real window is needed: tapping the camera makes Expo's image
// picker create a hidden <input type="file"> and "click" it with a fake
// mouse event. Headless Chromium ignores that fake click and throws the
// input away within milliseconds, so there's nothing left to put a file
// into. With a real window the input stays put and the upload works -
// same as a real user.

import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../helpers/auth.js';

// here dirname point - Current folder (tests/student/) path.
// The test avatar image is in the fixtures folder, so we need to go up one level to find it.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_AVATAR_PATH = path.join(__dirname, '..', 'fixtures', 'test-avatar.jpg');

// Same account as dashboard.spec.js - see tests/helpers/accounts.js.
// This test changes the profile photo, so it needs an account no other
// spec touches.
const ACCOUNT = 'student-b';

// Real browser window for this whole file (see the note at the top).
test.use({ headless: false, storageState: statePath(ACCOUNT) });

test.describe('Student Dashboard - Profile Photo', () => {
  // Start already logged in, instead of typing the password again.
  // storageState brings back localStorage; applySession puts back the two
  // pieces it can't carry (the Firebase token and a sessionStorage flag).
  // See tests/helpers/auth.js for why all three are needed.
  test.beforeEach(async ({ context, page }) => {
    await applySession(context, ACCOUNT);
    await page.goto('/');
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test('uploading a new profile photo changes the avatar and it survives a refresh', async ({
    page,
  }) => {
    // Open the "My Profile" popup (the avatar icon in the top-right corner).
    // Clicked by testID - before any photo is uploaded the avatar is just an
    // icon, not an image, so there'd be no image to look for here.
    await page.getByTestId('header-profile-button').click();
    await expect(page.getByText('My Profile')).toBeVisible();

    // Tap the small camera badge on the avatar - this creates the file input.
    await page.getByTestId('profile-avatar-upload').click();

    // Choosing the file starts the upload straight away (there's no Save
    // button - the app uploads as soon as a photo is picked).
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/user/upload-photo')),
      page.getByTestId('file-input').setInputFiles(TEST_AVATAR_PATH),
    ]);
    expect(response.ok()).toBeTruthy();

    // The server replies with the URL of the newly stored photo.
    const { photoUrl } = await response.json();
    expect(photoUrl).toBeTruthy();

    // That exact photo should now be the avatar on screen.
    await expect(page.locator(`img[src="${photoUrl}"]`).first()).toBeVisible();

    // Reload the page - the photo must still be there, proving it was
    // really saved and not just held in memory.
    await page.reload();
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(`img[src="${photoUrl}"]`).first()).toBeVisible({ timeout: 15000 });
  });
});
