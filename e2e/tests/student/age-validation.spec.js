// This file tests the AGE RULE during student signup:
// - Students under 14 are NOT allowed to sign themselves up.
// - Students 14 or older ARE allowed to sign up.
//
// 2 tests total.

import { test, expect } from '@playwright/test';

async function openSignupModal(page) {
  await page.goto('/');
  const landingFrame = page.frameLocator('iframe');
  await landingFrame.getByRole('button', { name: 'Join Early Access' }).click();
  // exact: true matters here - without it, this text also partial-matches another
  // line in the popup, and Playwright refuses to guess which one we meant.
  await expect(page.getByText('Create your account', { exact: true })).toBeVisible();
}

// Same helper as email-signup.spec.js - picks a date of birth that makes the
// student roughly the age we want, using January of the calculated year.
async function pickDateOfBirth(page, age) {
  const targetYear = new Date().getFullYear() - age;
  await page.getByText('Select your date of birth').click();
  await page.getByText(/January \d{4}/).click();
  await page.getByText(String(targetYear), { exact: true }).click();
  await page.getByText('15', { exact: true }).click();
}

test.describe('Student Age Validation', () => {
  // TEST 1: age 13 (under 14) should be blocked
  test('student under 14 cannot sign up', async ({ page }) => {
    await openSignupModal(page);

    await page.getByPlaceholder('Jane Smith').fill('Young Student');
    await page.getByPlaceholder('you@example.com').fill(`test.under14.${Date.now()}@aivorah.demo`);
    await pickDateOfBirth(page, 13);
    await page.getByPlaceholder('At least 6 characters').fill('validPass123');

    await page.getByText('Create Free Account', { exact: true }).click();

    await expect(
      page.getByText(
        'Students under 14 cannot self-register. Please ask your parent or teacher to create your account.',
      ),
    ).toBeVisible();
  });

  // TEST 2: age 14 (the minimum allowed age) should succeed
  test('student aged 14 can sign up', async ({ page }) => {
    await openSignupModal(page);

    await page.getByPlaceholder('Jane Smith').fill('Fourteen YearOld');
    await page.getByPlaceholder('you@example.com').fill(`test.age14.${Date.now()}@aivorah.demo`);
    await pickDateOfBirth(page, 14);
    await page.getByPlaceholder('At least 6 characters').fill('validPass123');

    await page.getByText('Create Free Account', { exact: true }).click();

    // Success looks the same as a normal signup - the "Check your inbox" screen appears.
    await expect(page.getByText('Check your inbox')).toBeVisible({ timeout: 10000 });
  });
});
