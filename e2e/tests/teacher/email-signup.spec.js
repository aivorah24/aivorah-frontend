// This file tests the TEACHER SIGN UP screen (creating a brand new account
// with email + password).
//
// Signup uses ONE shared form for student/teacher/parent - only the role
// chip picked at the top changes what happens. We already cover the
// role-agnostic checks (empty name, invalid email, weak password) once on
// the student file, since that's the exact same code regardless of role -
// no need to repeat them here.
//
// What's actually different for teacher signup (checked against the real
// app code before writing this): no date-of-birth field (that's student-only),
// and the curriculum picker IS shown (teacher and student both get it,
// parent doesn't).
//
// We test: valid signup with the Teacher role picked reaches the
// "Check your inbox" screen (same shared code as student's version, but this
// proves it actually completes for a teacher account too - curriculum
// selected, no DOB required).

import { test, expect } from '@playwright/test';

// Helper: opens the app and clicks "Join Early Access" (this is the Sign Up button,
// it lives inside an iframe on the landing page).
async function openSignupModal(page) {
  await page.goto('/');
  const landingFrame = page.frameLocator('iframe');
  await landingFrame.getByRole('button', { name: 'Join Early Access' }).click();

  await expect(page.getByText('Create your account', { exact: true })).toBeVisible();
}

test.describe('Teacher Email Sign Up', () => {
  test('valid signup reaches check-your-inbox screen', async ({ page }) => {
    await openSignupModal(page);

    // Pick the Teacher role chip - student is selected by default.
    await page.getByText('Teacher', { exact: true }).click();

    // Curriculum picker should be visible for Teacher (default "CBSE" is fine
    // to leave as-is, same as the student signup test does).
    await expect(page.getByText('Curriculum', { exact: true })).toBeVisible();

    // Using Date.now() keeps the email unique every run, so the app never
    // says "this email is already used".
    const uniqueEmail = `test.teacher.${Date.now()}@aivorah.demo`;

    await page.getByPlaceholder('Jane Smith').fill('Test Teacher');
    await page.getByPlaceholder('you@example.com').fill(uniqueEmail);
    // No date-of-birth field for teacher - it should not even be on screen.
    await expect(page.getByText('Select your date of birth')).toBeHidden();
    await page.getByPlaceholder('At least 6 characters').fill('validPass123');

    await page.getByText('Create Free Account', { exact: true }).click();

    // Same "we sent you a verification email" screen student signup reaches -
    // proves signup worked for a Teacher account specifically.
    await expect(page.getByText('Check your inbox')).toBeVisible({ timeout: 10000 });
  });
});
