// Shared helper for every persona's login test (student/teacher/parent/school-admin).
// The login popup is the exact same code for all 4 roles - only the email/password
// typed into it differs - so this one function is reused instead of copy-pasted
// into every persona's test file.

import { expect } from '@playwright/test';

// Does the repeated steps to get the login popup open and ready:
// 1. Open the app
// 2. Click "Login" (this button lives inside an iframe on the landing page)
// 3. Wait for the real Login popup (modal) to appear
export async function openLoginModal(page) {
  // Go to the homepage (baseURL is already set to http://localhost:3006 in config)
  await page.goto('/');

  // The landing page shows an <iframe> with its own "Login" button inside it.
  // Playwright needs a special command (frameLocator) to "reach inside" an iframe.
  const landingFrame = page.frameLocator('iframe');
  await landingFrame.getByRole('button', { name: 'Login' }).click();

  // Clicking that button opens the REAL login popup, which lives OUTSIDE the iframe,
  // directly on the main page. We wait for its "Email address" field to appear.
  await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
}
