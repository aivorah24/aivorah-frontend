// This file tests the TEACHER LOGIN screen (B2B demo account).
// Same login popup as student and parent - just a different account.
//
// We test 3 things (3 separate small tests, not one giant test):
// 1. Correct email + password -> teacher reaches the Dashboard
// 2. Wrong password -> error message shows
// 3. Empty email/password -> "fill in all fields" message shows

import { test, expect } from '@playwright/test';
import { openLoginModal } from '../helpers/loginModal.js';

// Read the real login credentials from our .env file (never hardcoded here).
const TEACHER_EMAIL = process.env.B2B_TEACHER_EMAIL;
const TEACHER_PASSWORD = process.env.B2B_TEACHER_PASSWORD;

test.describe('Teacher B2B Login', () => {
  // TEST 1: correct email + password should log the teacher in
  test('correct login goes to teacher dashboard', async ({ page }) => {
    await openLoginModal(page);

    // Type the email and password into the popup's input boxes
    await page.getByPlaceholder('you@example.com').fill(TEACHER_EMAIL);
    await page.getByPlaceholder('••••••••').fill(TEACHER_PASSWORD);

    // Click the "Sign In" button to submit the form.
    // Note: this app's buttons are custom-built (not real HTML <button> tags),
    // so we search by the visible text "Sign In" instead of by role="button".
    await page.getByText('Sign In', { exact: true }).click();

    // After a correct login, the Dashboard screen shows a greeting like
    // "Good morning, <Name>" or "Good afternoon, <Name>" as its title.
    // We just check that SOME greeting text appears - this proves login worked
    // without hardcoding the exact teacher name (which could change later).
    // Two elements can match this text at once (a placeholder version without
    // the name, then the real one with the name) - .first() just means
    // "whichever one shows up first is fine, we're only checking a greeting appeared".
    await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeVisible({
      timeout: 10000,
    });
  });

  // TEST 2: wrong password should show an error, NOT log the teacher in
  test('wrong password shows error message', async ({ page }) => {
    await openLoginModal(page);

    await page.getByPlaceholder('you@example.com').fill(TEACHER_EMAIL);
    await page.getByPlaceholder('••••••••').fill('ThisIsTheWrongPassword123');
    await page.getByText('Sign In', { exact: true }).click();

    // The app shows either "Incorrect password." or "Invalid email or password."
    // depending on which error the server sends back - we accept either.
    await expect(page.getByText(/Incorrect password\.|Invalid email or password\./)).toBeVisible();
  });

  // TEST 3: leaving email and password empty should show a validation message
  test('empty fields shows validation message', async ({ page }) => {
    await openLoginModal(page);

    // We don't type anything - just click "Sign In" directly.
    await page.getByText('Sign In', { exact: true }).click();

    await expect(page.getByText('Please fill in all fields.')).toBeVisible();
  });
});
