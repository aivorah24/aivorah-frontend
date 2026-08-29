// Parent -> Challenges (ParentChallengesScreen.tsx) - empty state.
//
// Split out from challenges.spec.js to match the Teacher Dashboard
// convention (dashboard-empty-state.spec.js as its own file, not bundled
// into the happy-path spec).
//
// parent-a (read-only, NCERT/Grade 3) - the `challenges` table has zero
// NCERT rows (confirmed same gap found on the teacher side: only IB PYP/
// CBSE/ICSE have published challenges), so this account ALWAYS sees the
// real empty state - not a fabricated one.

import { test, expect } from '@playwright/test';
import { applySession, statePath } from '../../helpers/auth.js';

test.describe('Parent Dashboard - Challenges - Empty State', () => {
  test.use({ storageState: statePath('parent-a') });

  test('shows the real empty state instead of a blank or broken screen', async ({ context, page }) => {
    await applySession(context, 'parent-a');
    await page.goto('/');

    // Two Sidebar.tsx instances exist in the DOM at once (a collapsed base
    // sidebar plus a hover-expanded overlay on top of it) - .first() hits
    // the collapsed one underneath, whose text is covered by the overlay
    // and never receives the click. The overlay's copy is last in the DOM.
    await page.getByText('Challenges', { exact: true }).last().click();

    await expect(page.getByText('Challenges', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText('School challenges, olympiad prep, and advanced practice'),
    ).toBeVisible();

    // student-a is Grade 3 - the message includes the child's actual grade.
    await expect(page.getByText('No challenges available for Grade 3 yet.')).toBeVisible({
      timeout: 15000,
    });
  });
});
