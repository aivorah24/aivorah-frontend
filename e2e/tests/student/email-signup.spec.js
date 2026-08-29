// This file tests the STUDENT SIGN UP screen (creating a brand new account with email + password).
//
// We test 5 things (5 separate small tests):
// 1. Empty name -> shows "enter your full name" error
// 2. Invalid email format -> shows "valid email format" error
// 3. Weak password (less than 6 characters) -> shows password length error
// 4. Valid signup with age 16 -> reaches the "Check your inbox" screen
// 5. (Age < 14 / Age >= 14 are tested separately in age-validation.spec.js)

import { test, expect } from '@playwright/test';

// Helper: opens the app and clicks "Join Early Access" (this is the Sign Up button,
// it lives inside an iframe on the landing page, same as the Login button did).
async function openSignupModal(page) {
  await page.goto('/');
  const landingFrame = page.frameLocator('iframe');
  await landingFrame.getByRole('button', { name: 'Join Early Access' }).click();

  // The real Sign Up popup opens outside the iframe. We wait for its title to appear.
  // exact: true matters here - without it, this text also partial-matches another
  // line in the popup, and Playwright refuses to guess which one we meant.
  await expect(page.getByText('Create your account', { exact: true })).toBeVisible();
}

// Helper: picks a date of birth in the calendar picker.
// The picker only lets us choose a YEAR and a DAY (month stays on January by default),
// so we just calculate "what year makes this person the age we want" and pick
// January of that year - good enough to test age rules, no need for an exact birthday.
async function pickDateOfBirth(page, age) {
  const targetYear = new Date().getFullYear() - age;

  // Click the "Select your date of birth" box to open the calendar
  await page.getByText('Select your date of birth').click();

  // Click the month/year label (e.g. "January 2016") to switch to the year list
  await page.getByText(/January \d{4}/).click();

  // Click the year we calculated
  await page.getByText(String(targetYear), { exact: true }).click();

  // Click day 15 (any safe mid-month day works fine for our purpose)
  await page.getByText('15', { exact: true }).click();
}

test.describe('Student Email Sign Up', () => {
  // TEST 1: leaving the name empty should block signup with a message
  test('empty name shows validation error', async ({ page }) => {
    await openSignupModal(page);

    // Student role is already selected by default, so we skip picking it.
    await page.getByPlaceholder('you@example.com').fill('test.user@aivorah.demo');
    await pickDateOfBirth(page, 16);
    await page.getByPlaceholder('At least 6 characters').fill('validPass123');

    // Name field left empty on purpose
    await page.getByText('Create Free Account', { exact: true }).click();

    await expect(page.getByText('Please enter your full name.')).toBeVisible();
  });

  // TEST 2: a badly formatted email should be rejected
  test('invalid email format shows validation error', async ({ page }) => {
    await openSignupModal(page);

    await page.getByPlaceholder('Jane Smith').fill('Test Student');
    await page.getByPlaceholder('you@example.com').fill('not-a-real-email');
    await pickDateOfBirth(page, 16);
    await page.getByPlaceholder('At least 6 characters').fill('validPass123');

    await page.getByText('Create Free Account', { exact: true }).click();

    await expect(page.getByText('Please enter a valid email format.')).toBeVisible();
  });

  // TEST 3: a password shorter than 6 characters should be rejected
  test('weak password shows validation error', async ({ page }) => {
    await openSignupModal(page);

    await page.getByPlaceholder('Jane Smith').fill('Test Student');
    await page.getByPlaceholder('you@example.com').fill('test.user2@aivorah.demo');
    await pickDateOfBirth(page, 16);
    await page.getByPlaceholder('At least 6 characters').fill('123'); // too short

    await page.getByText('Create Free Account', { exact: true }).click();

    await expect(page.getByText('Password must be at least 6 characters.')).toBeVisible();
  });

  // TEST 4: filling everything correctly should succeed and show "Check your email"
  test('valid signup reaches check-your-email screen', async ({ page }) => {
    await openSignupModal(page);

    // Using Date.now() in the email keeps it unique every time we run this test,
    // so the app never says "this email is already used".
    const uniqueEmail = `test.student.${Date.now()}@aivorah.demo`;

    await page.getByPlaceholder('Jane Smith').fill('Test Student');
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
    await pickDateOfBirth(page, 16);
    await page.getByPlaceholder('At least 6 characters').fill('validPass123');

    await page.getByText('Create Free Account', { exact: true }).click();

    // We are NOT opening a real email here - just confirming the app moved to
    // the "we sent you a verification email" screen, which proves signup worked.
    // The app's actual heading here is "Check your inbox" (not "Check your email").
    await expect(page.getByText('Check your inbox')).toBeVisible({ timeout: 10000 });
  });
});
