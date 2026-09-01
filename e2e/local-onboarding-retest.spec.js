// Ad-hoc local verification (NOT part of the shared e2e suite / global-setup) —
// runs against localhost:8081 (frontend) + local auth/profile/leaderboard
// services, which are connected to the Dev Supabase DB. Uses a brand-new
// email/password signup so it doesn't depend on the still-unseeded
// student-d10 e2e account.
//
// isLocalDev in AuthContext bypasses email verification entirely on
// localhost, so a fresh signup lands straight on the real onboarding form
// with onboardingComplete: false — exactly what's needed to reproduce and
// verify the fix.
import { test, expect } from '@playwright/test';

function agedDob(yearsAgo) {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${today.getFullYear() - yearsAgo}`;
}

test('onboarding Save & Exit fix — immediate re-login lands on onboarding, not Dashboard', async ({ page }) => {
  const email = `local-retest-${Date.now()}@example.com`;
  const password = 'RetestPass!2026';

  await page.goto('/');
  const frame = page.frameLocator('iframe');
  await frame.getByRole('button', { name: 'Login' }).click();
  await frame.getByText('Sign up free').click();

  await frame.getByText('IB PYP', { exact: true }).click(); // curriculum chip (student role is default)
  await frame.getByPlaceholder('Jane Smith').fill('Local Retest');
  await frame.getByPlaceholder('you@example.com').fill(email);
  await frame.getByText('DD / MM / YYYY').click();
  // Year -> month -> day pickers, same pattern as the onboarding suite
  const y = new Date().getFullYear() - 16;
  await frame.getByText(String(y), { exact: true }).click().catch(() => {});
  await frame.getByText('Jan', { exact: true }).click().catch(() => {});
  await frame.getByText('10', { exact: true }).first().click().catch(() => {});
  await frame.getByPlaceholder('At least 6 characters').fill(password);
  await frame.getByText('Create Free Account').click();

  // Should land on the real onboarding form (fresh account, onboardingComplete: false)
  await expect(page.getByRole('textbox', { name: 'Your name' })).toBeVisible({ timeout: 15000 });

  await page.getByRole('textbox', { name: 'Your name' }).fill('Retest Saved Name');
  const schoolInput = page.getByRole('textbox', { name: 'Type your school name (e.g.' });
  await schoolInput.click();
  await schoolInput.fill('Retest School');

  await page.getByLabel('Back to home page').click();
  await expect(page.getByText('Return to the home page?')).toBeVisible();
  await page.getByText('Save & go to home page').click();

  // Log back in immediately — no artificial delay, this is the actual race window.
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByText('Sign In', { exact: true }).click();

  await expect(page.getByRole('textbox', { name: 'Your name' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Good (morning|afternoon|evening),/).first()).toBeHidden();
  console.log('PASS: landed back on onboarding, not Dashboard. Name/school in form:',
    await page.getByRole('textbox', { name: 'Your name' }).inputValue());
});
