// This file tests the PARENT SIGN UP screen (creating a brand new account
// with email + password).
//
// Signup uses ONE shared form for student/teacher/parent - only the role
// chip picked at the top changes what happens. We already cover the
// role-agnostic checks (empty name, invalid email, weak password) once on
// the student file, since that's the exact same code regardless of role -
// no need to repeat them here.
//
// What's actually different for parent signup (checked against the real app
// code before writing this): no date-of-birth field (student-only), AND no
// curriculum picker either (that's shown for student + teacher, not parent).
//
// We test: valid signup with the Parent role picked reaches the
// "Check your inbox" screen, and confirms the curriculum picker genuinely
// isn't shown for this role (that's the one thing that makes parent signup
// different from teacher signup, besides the role value itself).

import { test, expect } from '@playwright/test';

// Helper: opens the app and clicks "Join Early Access" (this is the Sign Up button,
// it lives inside an iframe on the landing page).
async function openSignupModal(page) {
  await page.goto('/');
  const landingFrame = page.frameLocator('iframe');
  await landingFrame.getByRole('button', { name: 'Join Early Access' }).click();

  await expect(page.getByText('Create your account', { exact: true })).toBeVisible();
}

test.describe('Parent Email Sign Up', () => {
  test('valid signup reaches check-your-inbox screen', async ({ page }) => {
    await openSignupModal(page);

    // Pick the Parent role chip - student is selected by default.
    await page.getByText('Parent', { exact: true }).click();

    // Curriculum picker should NOT appear for Parent - only student/teacher get it.
    await expect(page.getByText('Curriculum', { exact: true })).toBeHidden();
    // No date-of-birth field either - that's student-only.
    await expect(page.getByText('Select your date of birth')).toBeHidden();

    // Using Date.now() keeps the email unique every run, so the app never
    // says "this email is already used".
    const uniqueEmail = `test.parent.${Date.now()}@aivorah.demo`;

    await page.getByPlaceholder('Jane Smith').fill('Test Parent');
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
    await page.getByPlaceholder('At least 6 characters').fill('validPass123');

    await page.getByText('Create Free Account', { exact: true }).click();

    // Same "we sent you a verification email" screen student signup reaches -
    // proves signup worked for a Parent account specifically.
    await expect(page.getByText('Check your inbox')).toBeVisible({ timeout: 10000 });
  });
});
